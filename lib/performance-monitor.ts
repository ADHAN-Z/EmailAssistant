// lib/performance-monitor.ts
import { logger } from '@/lib/logger';

export interface PerformanceMetadata {
  [key: string]: string | number | boolean | object;
}

export class PerformanceMonitor {
  /**
   * Measure the performance of a function with metadata
   * @param name Name of the operation to measure
   * @param fn Function to execute and measure
   * @param metadata Additional metadata for logging
   * @returns Promise with the result of the function
   */
  static async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: PerformanceMetadata
  ): Promise<T> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;

    logger.info(`Performance metric: ${name}`, {
      duration_ms: duration,
      ...metadata,
    });

    return result;
  }

  /**
   * Measure multiple functions in parallel
   * @param operations Array of operations to measure
   * @returns Promise with an array of results
   */
  static async measureParallel<T>(
    operations: Array<{
      name: string;
      fn: () => Promise<T>;
      metadata?: PerformanceMetadata;
    }>
  ): Promise<Array<{ name: string; result: T; duration_ms: number }>> {
    const results = await Promise.all(
      operations.map(async (operation) => {
        const start = Date.now();
        const result = await operation.fn();
        const duration = Date.now() - start;

        logger.info(`Performance metric: ${operation.name}`, {
          duration_ms: duration,
          ...operation.metadata,
        });

        return {
          name: operation.name,
          result,
          duration_ms: duration,
        };
      })
    );

    return results;
  }
}
