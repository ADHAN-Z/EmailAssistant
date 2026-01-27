// lib/retry-handler.ts
export class RetryHandler {
  /**
   * Retry a function with exponential backoff
   * @param fn Function to retry
   * @param maxRetries Maximum number of retry attempts (default: 3)
   * @param delay Initial delay in milliseconds (default: 1000)
   * @returns Promise with the result of the function
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error = new Error('Function failed after maximum retries');

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          const waitTime = delay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError;
  }

  /**
   * Retry with constant backoff
   */
  static async retryWithConstantBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error = new Error('Function failed after maximum retries');

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}
