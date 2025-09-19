// lib/validations.ts
import { z } from 'zod'

export const taskUpdateSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'done']),
  priority: z.number().min(1).max(10).optional(),
  title: z.string().min(1).max(200).optional(),
  details: z.string().max(1000).optional(),
})

export const interviewPrepSchema = z.object({
  taskId: z.string().cuid(),
  interviewType: z.enum(['technical', 'behavioral', 'mixed']).optional(),
})

export const emailSyncSchema = z.object({
  maxEmails: z.number().min(1).max(50).optional(),
  onlyUnread: z.boolean().optional(),
})

export const userProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
})

// Environment variables validation
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  REDIS_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
})

export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>
export type InterviewPrepInput = z.infer<typeof interviewPrepSchema>
export type EmailSyncInput = z.infer<typeof emailSyncSchema>
export type UserProfileInput = z.infer<typeof userProfileSchema>

