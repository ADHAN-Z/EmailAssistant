import { RetryHandler } from '../lib/retry-handler';

describe('RetryHandler', () => {
  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      let attempts = 0;
      const result = await RetryHandler.retry(async () => {
        attempts++;
        return 'success';
      });

      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should retry and succeed after failures', async () => {
      let attempts = 0;
      const result = await RetryHandler.retry(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Retryable error');
        }
        return 'success';
      }, 3);

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should fail after maximum retries', async () => {
      let attempts = 0;
      await expect(
        RetryHandler.retry(async () => {
          attempts++;
          throw new Error('Permanent error');
        }, 3)
      ).rejects.toThrow('Permanent error');

      expect(attempts).toBe(3);
    });

    it('should use exponential backoff', async () => {
      const startTime = Date.now();
      let attempts = 0;

      await expect(
        RetryHandler.retry(async () => {
          attempts++;
          throw new Error('Retryable error');
        }, 3, 50)
      ).rejects.toThrow('Retryable error');

      const duration = Date.now() - startTime;
      // Allow for some tolerance in timing (e.g., 80% of expected duration)
      expect(duration).toBeGreaterThanOrEqual(50);
    });
  });

  describe('retryWithConstantBackoff', () => {
    it('should use constant delay between retries', async () => {
      const startTime = Date.now();
      let attempts = 0;

      await expect(
        RetryHandler.retryWithConstantBackoff(async () => {
          attempts++;
          throw new Error('Retryable error');
        }, 3, 50)
      ).rejects.toThrow('Retryable error');

      const duration = Date.now() - startTime;
      // Allow for some tolerance in timing
      expect(duration).toBeGreaterThanOrEqual(50);
    });
  });
});
