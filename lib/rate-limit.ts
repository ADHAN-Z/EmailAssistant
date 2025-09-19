// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Create Redis instance
const redis = Redis.fromEnv()

// Rate limiters for different endpoints
export const emailSyncLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 requests per minute
  analytics: true,
  prefix: "email_sync",
})

export const interviewPrepLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
  analytics: true,
  prefix: "interview_prep",
})

export const generalApiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
  analytics: true,
  prefix: "api",
})

// Helper function to get client IP
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return "unknown"
}

// Rate limit middleware
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
) {
  const { success, limit, reset, remaining } = await limiter.limit(identifier)
  
  if (!success) {
    return {
      success: false,
      error: "Rate limit exceeded",
      limit,
      reset,
      remaining: 0
    }
  }
  
  return {
    success: true,
    limit,
    reset,
    remaining
  }
}

