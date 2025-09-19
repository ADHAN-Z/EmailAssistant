import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()

export class CacheService {
  private static instance: CacheService
  private redis: Redis

  private constructor() {
    this.redis = redis
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key)
      
      if (!cached) return null
      
      // Upstash Redis can return parsed objects directly or strings
      // If it's already an object, return it. If it's a string, parse it.
      if (typeof cached === 'string') {
        // Check for corrupted string data
        if (cached.startsWith('[object ') || cached === 'undefined' || cached === 'null') {
          console.warn(`Corrupted cache entry found for key: ${key}, clearing...`)
          await this.redis.del(key)
          return null
        }
        
        try {
          return JSON.parse(cached) as T
        } catch (parseError) {
          console.warn(`Invalid JSON in cache for key: ${key}, clearing...`)
          await this.redis.del(key)
          return null
        }
      }
      
      // If Upstash returned an object directly, return it
      return cached as T
      
    } catch (error) {
      console.error("Cache get error:", error)
      console.error(`Problematic cache key: ${key}`)
      
      // Clear the corrupted cache entry
      try {
        await this.redis.del(key)
        console.log(`Cleared corrupted cache entry for key: ${key}`)
      } catch (deleteError) {
        console.error("Failed to clear corrupted cache:", deleteError)
      }
      
      return null
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
    try {
      // Upstash Redis handles JSON serialization automatically for objects
      // But let's be explicit to ensure consistency
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value)
      
      await this.redis.set(key, serializedValue, { ex: ttlSeconds })
    } catch (error) {
      console.error("Cache set error:", error)
      console.error(`Failed to cache key: ${key}`)
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key)
    } catch (error) {
      console.error("Cache delete error:", error)
    }
  }

  /**
   * Pattern invalidation is not supported by Upstash Redis.
   * Workaround: use key namespaces like `tasks:user:{id}`
   * and invalidate by deleting known keys instead of wildcards.
   */
  async invalidatePattern(pattern: string): Promise<void> {
    console.warn(
      `invalidatePattern("${pattern}") not supported in Upstash Redis. 
       Consider using key namespaces instead.`
    )
  }

  /**
   * Clear specific user cache entries
   * Since Upstash doesn't support pattern deletion, we manually delete known keys
   */
  async clearUserCache(userId: string): Promise<void> {
    try {
      const keysToDelete = [
        cacheKeys.userTasks(userId),
        cacheKeys.userInterviews(userId),
        cacheKeys.userStats(userId),
      ]
      
      await Promise.all(keysToDelete.map(key => this.redis.del(key)))
      console.log(`Cleared cache entries for user: ${userId}`)
    } catch (error) {
      console.error("Clear user cache error:", error)
    }
  }

  /**
   * Emergency cache flush - use sparingly
   * Note: This may not work in all Upstash plans
   */
  async flushAll(): Promise<void> {
    try {
      await this.redis.flushall()
      console.log("All cache entries cleared")
    } catch (error) {
      console.error("Cache flush error:", error)
      console.warn("Manual cache clearing may be required via Upstash console")
    }
  }
}

export const cache = CacheService.getInstance()

// Cache key generators
export const cacheKeys = {
  userTasks: (userId: string) => `tasks:user:${userId}`,
  userInterviews: (userId: string) => `interviews:user:${userId}`,
  taskById: (taskId: string) => `task:${taskId}`,
  interviewById: (interviewId: string) => `interview:${interviewId}`,
  userStats: (userId: string) => `stats:user:${userId}`,
}

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  SHORT: 60,       // 1 minute
  MEDIUM: 300,     // 5 minutes
  LONG: 1800,      // 30 minutes
  VERY_LONG: 3600, // 1 hour
}