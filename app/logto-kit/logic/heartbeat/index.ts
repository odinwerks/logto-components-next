/**
 * Heartbeat Store Factory
 *
 * Automatically selects and initializes the appropriate store
 * based on HEARTBEAT_MODE environment variable.
 */

import { HeartbeatStore } from './store';
import { MemoryHeartbeatStore } from './memory-store';

let storeInstance: HeartbeatStore | null = null;

/**
 * Get or create the heartbeat store instance
 * Uses singleton pattern to ensure single store across app
 */
export function getHeartbeatStore(): HeartbeatStore {
  if (storeInstance) {
    return storeInstance;
  }

  const mode = process.env.HEARTBEAT_MODE ?? 'memory';

  if (mode === 'redis') {
    // Dynamic import to avoid loading ioredis in memory mode
    const { RedisHeartbeatStore } = require('./redis-store');
    storeInstance = new RedisHeartbeatStore();
    console.log('[Heartbeat] Initialized Redis store');
  } else {
    storeInstance = new MemoryHeartbeatStore();
    console.log('[Heartbeat] Initialized memory store');

    // Start cleanup interval for memory mode
    const intervalMs = parseInt(process.env.HEARTBEAT_CLEANUP_INTERVAL_MS ?? '60000');
    const maxAgeMs = parseInt(process.env.HEARTBEAT_MAX_AGE_MS ?? '60000');

    setInterval(async () => {
      const cleared = await storeInstance!.cleanup(maxAgeMs);
      if (cleared > 0) {
        console.log(`[Heartbeat] Cleaned up ${cleared} expired entries`);
      }
    }, intervalMs);

    console.log(`[Heartbeat] Cleanup interval: ${intervalMs}ms, max age: ${maxAgeMs}ms`);
  }

  return storeInstance;
}

/**
 * Reset the store instance (useful for testing)
 */
export function resetHeartbeatStore(): void {
  storeInstance = null;
}

// Re-export types
export type { HeartbeatStore, HeartbeatEntry } from './store';
export { MemoryHeartbeatStore } from './memory-store';
