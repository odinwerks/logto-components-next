/**
 * Memory Heartbeat Store
 *
 * In-memory implementation for development mode.
 * Uses a simple Map with periodic cleanup.
 */

import { HeartbeatStore } from './store';

export class MemoryHeartbeatStore implements HeartbeatStore {
  private store = new Map<string, number>();

  private getKey(userId: string, orgId: string | null): string {
    return `${userId}:${orgId ?? '__null__'}`;
  }

  async set(userId: string, orgId: string | null, timestamp: number): Promise<void> {
    this.store.set(this.getKey(userId, orgId), timestamp);
  }

  async get(userId: string, orgId: string | null): Promise<number | null> {
    return this.store.get(this.getKey(userId, orgId)) ?? null;
  }

  async getAllForUser(userId: string): Promise<Array<{ orgId: string | null; timestamp: number }>> {
    const results: Array<{ orgId: string | null; timestamp: number }> = [];
    const prefix = `${userId}:`;

    for (const [key, timestamp] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        const orgIdPart = key.slice(prefix.length);
        const orgId = orgIdPart === '__null__' ? null : orgIdPart;
        results.push({ orgId, timestamp });
      }
    }

    return results;
  }

  async clear(userId: string, orgId?: string | null): Promise<void> {
    if (orgId === undefined) {
      // Clear all for user
      const prefix = `${userId}:`;
      for (const key of this.store.keys()) {
        if (key.startsWith(prefix)) {
          this.store.delete(key);
        }
      }
    } else {
      this.store.delete(this.getKey(userId, orgId));
    }
  }

  async cleanup(maxAgeMs: number): Promise<number> {
    const cutoff = Date.now() - maxAgeMs;
    let cleared = 0;

    for (const [key, timestamp] of this.store.entries()) {
      if (timestamp < cutoff) {
        this.store.delete(key);
        cleared++;
      }
    }

    return cleared;
  }
}
