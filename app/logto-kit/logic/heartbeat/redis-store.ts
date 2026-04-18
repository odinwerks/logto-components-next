/**
 * Redis Heartbeat Store
 *
 * Redis implementation for production mode.
 * Uses ioredis with TTL for automatic expiration.
 */

import Redis from 'ioredis';
import { HeartbeatStore } from './store';

export class RedisHeartbeatStore implements HeartbeatStore {
  private redis: Redis;
  private prefix: string;
  private ttlSeconds: number;

  constructor() {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = parseInt(process.env.REDIS_PORT ?? '6379');
    const password = process.env.REDIS_PASSWORD;
    const db = parseInt(process.env.REDIS_DB ?? '0');

    this.redis = new Redis({
      host,
      port,
      password: password || undefined,
      db,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });

    this.prefix = process.env.REDIS_HEARTBEAT_PREFIX ?? 'hb:';
    this.ttlSeconds = parseInt(process.env.REDIS_HEARTBEAT_TTL ?? '60');
  }

  private getKey(userId: string, orgId: string | null): string {
    return `${this.prefix}${userId}:${orgId ?? '__null__'}`;
  }

  async set(userId: string, orgId: string | null, timestamp: number): Promise<void> {
    const key = this.getKey(userId, orgId);
    await this.redis.setex(key, this.ttlSeconds, timestamp.toString());
  }

  async get(userId: string, orgId: string | null): Promise<number | null> {
    const key = this.getKey(userId, orgId);
    const value = await this.redis.get(key);
    return value ? parseInt(value, 10) : null;
  }

  async getAllForUser(userId: string): Promise<Array<{ orgId: string | null; timestamp: number }>> {
    const pattern = `${this.prefix}${userId}:*`;
    const keys: string[] = [];
    let cursor = '0';

    do {
      const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');

    if (keys.length === 0) {
      return [];
    }

    const values = await this.redis.mget(...keys);
    const results: Array<{ orgId: string | null; timestamp: number }> = [];

    for (let i = 0; i < keys.length; i++) {
      const value = values[i];
      if (value) {
        const key = keys[i];
        const orgIdPart = key.split(':').pop();
        const orgId = orgIdPart === '__null__' ? null : orgIdPart;
        results.push({ orgId, timestamp: parseInt(value, 10) });
      }
    }

    return results;
  }

  async clear(userId: string, orgId?: string | null): Promise<void> {
    if (orgId === undefined) {
      // Clear all for user
      const pattern = `${this.prefix}${userId}:*`;
      const keys: string[] = [];
      let cursor = '0';

      do {
        const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== '0');

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } else {
      await this.redis.del(this.getKey(userId, orgId));
    }
  }

  async cleanup(_maxAgeMs: number): Promise<number> {
    // Redis TTL handles expiration automatically
    // This is a no-op for Redis mode
    return 0;
  }

  /**
   * Close Redis connection (for graceful shutdown)
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
