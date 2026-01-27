// lib/email-cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export class EmailCache {
  private static getProcessedKey(userId: string): string {
    return `processed:${userId}`;
  }

  /**
   * Mark emails as processed in cache
   * @param userId User ID
   * @param emailIds Array of email IDs to mark as processed
   */
  static async markProcessed(userId: string, emailIds: string[]): Promise<void> {
    const key = this.getProcessedKey(userId);
    const promises = emailIds.map(emailId => 
      redis.sadd(key, emailId)
    );
    await Promise.all(promises);
  }

  /**
   * Check if an email has been processed
   * @param userId User ID
   * @param emailId Email ID to check
   * @returns Boolean indicating if email has been processed
   */
  static async isProcessed(userId: string, emailId: string): Promise<boolean> {
    const key = this.getProcessedKey(userId);
    const result = await redis.sismember(key, emailId);
    return result === 1;
  }

  /**
   * Get all processed email IDs for a user
   * @param userId User ID
   * @returns Array of processed email IDs
   */
  static async getProcessedEmails(userId: string): Promise<string[]> {
    const key = this.getProcessedKey(userId);
    const members = await redis.smembers(key);
    return members;
  }

  /**
   * Clear processed emails cache for a user
   * @param userId User ID
   */
  static async clearCache(userId: string): Promise<void> {
    const key = this.getProcessedKey(userId);
    await redis.del(key);
  }
}
