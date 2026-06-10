/**
 * Shared helpers for the actions layer.
 *
 * Extracted from copy-pasted patterns across account.ts, mfa.ts, password.ts,
 * verification.ts, webauthn.ts, sessions.ts, and profile.ts.
 */

import { VERIFICATION_CLOCK_SKEW_TOLERANCE_MS } from '../constants';
import { audit, type AuditEntry } from '../audit';

// ============================================================================
// Pattern 1: Staleness check
// ============================================================================

/**
 * Throws if the verification record has expired.
 *
 * @param timestamp - The verification record's expiresAt timestamp (ms),
 *   server-derived from Logto's response.
 * @throws {Error} 'VERIFICATION_EXPIRED' if Date.now() > timestamp + tolerance.
 */
export function assertVerificationNotExpired(timestamp: number): void {
  if (Date.now() > timestamp + VERIFICATION_CLOCK_SKEW_TOLERANCE_MS) {
    throw new Error('VERIFICATION_EXPIRED');
  }
}

// ============================================================================
// Pattern 2: Audit boilerplate (best-effort)
// ============================================================================

/**
 * Best-effort audit log. Never throws — audit failures are swallowed.
 *
 * @param actor - User ID of the actor.
 * @param action - Dot-separated action identifier (e.g. 'password.change').
 * @param resource - Optional resource being acted on.
 * @param metadata - Optional structured metadata.
 */
export function auditSafe(
  actor: string,
  action: string,
  resource?: string,
  metadata?: Record<string, unknown>,
): void {
  void audit({ actor, action, resource, metadata } satisfies AuditEntry)
    .catch(() => { /* audit is best-effort; never surface to caller */ });
}

// ============================================================================
// Pattern 3: In-memory per-key lock manager
// ============================================================================

/**
 * Creates a lightweight in-memory lock manager keyed by string.
 *
 * Useful for serializing concurrent server actions that touch the same
 * resource (e.g. per-user custom-data updates, backup-codes generation).
 * Cross-process races are NOT prevented — only in-process races.
 *
 * @param maxEntries - Maximum lock entries before FIFO eviction (default 1000).
 */
const DEFAULT_LOCK_TIMEOUT_MS = 30_000;

export function createLockManager(maxEntries = 1000) {
  const locks = new Map<string, Promise<void>>();

  /**
   * Acquires a lock for the given key. Returns a release function.
   *
   * If the key is already locked, this waits for the existing lock to
   * release before returning. When the map exceeds `maxEntries`, the
   * oldest entry is evicted (FIFO).
   *
   * @param key - The lock key.
   * @param timeoutMs - Maximum time to wait for the lock (default 30s).
   * @throws If the lock cannot be acquired within the timeout.
   */
  async function acquire(key: string, timeoutMs = DEFAULT_LOCK_TIMEOUT_MS): Promise<() => void> {
    // Evict oldest if at capacity
    while (locks.size >= maxEntries) {
      const oldest = locks.keys().next().value;
      if (oldest === undefined) break;
      locks.delete(oldest);
    }

    // Wait for existing lock on this key with timeout
    while (true) {
      const existing = locks.get(key);
      if (!existing) break;

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Lock acquisition timed out for key '${key}' after ${timeoutMs}ms`)), timeoutMs);
      });

      await Promise.race([existing.catch(() => {}), timeoutPromise]);
    }

    let release!: () => void;
    const promise = new Promise<void>(resolve => {
      release = resolve;
    });
    locks.set(key, promise);

    return () => {
      locks.delete(key);
      release();
    };
  }

  return { acquire, locks };
}
