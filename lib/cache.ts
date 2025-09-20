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
      
      if (typeof cached === 'string') {
        if (cached.startsWith('[object ') || cached === 'undefined' || cached === 'null') {
          console.warn(`Corrupted cache entry for key: ${key}, clearing...`)
          await this.redis.del(key)
          return null
        }
        
        try {
          return JSON.parse(cached) as T
        } catch {
          console.warn(`Invalid JSON in cache for key: ${key}, clearing...`)
          await this.redis.del(key)
          return null
        }
      }
      
      return cached as T
      
    } catch (error) {
      console.error("Cache get error:", error)
      try {
        await this.redis.del(key)
      } catch (deleteError) {
        console.error("Failed to clear corrupted cache:", deleteError)
      }
      return null
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value)
      await this.redis.set(key, serializedValue, { ex: ttlSeconds })
    } catch (error) {
      console.error("Cache set error:", error)
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key)
    } catch (error) {
      console.error("Cache delete error:", error)
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    console.warn(
      `invalidatePattern("${pattern}") not supported in Upstash Redis. Use key namespaces instead.`
    )
  }

  async clearUserCache(userId: string): Promise<void> {
    try {
      const keysToDelete = [
        cacheKeys.userTasks(userId),
        cacheKeys.userInterviews(userId),
        cacheKeys.userStats(userId),
      ]
      await Promise.all(keysToDelete.map(key => this.redis.del(key)))
    } catch (error) {
      console.error("Clear user cache error:", error)
    }
  }

  async flushAll(): Promise<void> {
    try {
      await this.redis.flushall()
    } catch (error) {
      console.error("Cache flush error:", error)
      console.warn("Manual cache clearing may be required via Upstash console")
    }
  }
}

export const cache = CacheService.getInstance()

export const cacheKeys = {
  userTasks: (userId: string) => `tasks:user:${userId}`,
  userInterviews: (userId: string) => `interviews:user:${userId}`,
  taskById: (taskId: string) => `task:${taskId}`,
  interviewById: (interviewId: string) => `interview:${interviewId}`,
  userStats: (userId: string) => `stats:user:${userId}`,
}

export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 1800,
  VERY_LONG: 3600,
}
