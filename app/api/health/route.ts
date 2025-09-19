// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cache } from '@/lib/cache'

export async function GET() {
  const startTime = Date.now()
  
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    
    // Check cache connection (optional)
    try {
      await cache.get('health_check')
    } catch (cacheError) {
      console.warn('Cache health check failed:', cacheError)
    }
    
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        database: 'healthy',
        cache: 'healthy',
      },
      version: process.env.npm_package_version || '1.0.0',
    })
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
        services: {
          database: 'unhealthy',
        },
      },
      { status: 503 }
    )
  }
}

