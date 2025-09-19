// lib/env.ts
import { envSchema } from './validations'

// Validate environment variables at startup
try {
  envSchema.parse(process.env)
} catch (error) {
  console.error('❌ Invalid environment variables:', error)
  process.exit(1)
}

// Export validated environment variables
export const env = envSchema.parse(process.env)

// Helper to check if we're in production
export const isProduction = env.NODE_ENV === 'production'
export const isDevelopment = env.NODE_ENV === 'development'
export const isTest = env.NODE_ENV === 'test'

