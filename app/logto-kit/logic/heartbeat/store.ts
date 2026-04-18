/**
 * Heartbeat Store Interface
 *
 * Abstract interface for heartbeat storage implementations.
 * Supports both in-memory (dev) and Redis (prod) modes.
 */

export interface HeartbeatEntry {
  userId: string;
  orgId: string | null;
  timestamp: number;
}

export interface HeartbeatStore {
  /**
   * Record a heartbeat for a user+org combination
   */
  set(userId: string, orgId: string | null, timestamp: number): Promise<void>;

  /**
   * Get last heartbeat timestamp for user+org
   * Returns null if no heartbeat exists
   */
  get(userId: string, orgId: string | null): Promise<number | null>;

  /**
   * Get all active heartbeats for a user (across all orgs)
   */
  getAllForUser(userId: string): Promise<Array<{ orgId: string | null; timestamp: number }>>;

  /**
   * Clear heartbeat for specific org or all orgs for user
   * If orgId is undefined, clears all heartbeats for the user
   */
  clear(userId: string, orgId?: string | null): Promise<void>;

  /**
   * Cleanup expired entries
   * Returns number of entries cleared
   * For Redis mode, this is typically a no-op (TTL handles expiration)
   */
  cleanup(maxAgeMs: number): Promise<number>;
}
