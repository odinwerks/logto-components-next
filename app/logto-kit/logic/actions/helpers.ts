/**
 * Shared helpers for the actions layer.
 *
 * Extracted from copy-pasted patterns across account.ts, mfa.ts, password.ts,
 * verification.ts, webauthn.ts, sessions.ts, and profile.ts.
 */

import { VERIFICATION_CLOCK_SKEW_TOLERANCE_MS, LOGTO_VERIFICATION_MAX_FUTURE_MS } from '../constants';
import { audit, type AuditEntry } from '../audit';
import { ValidationError } from '../validation';

// ============================================================================
// Pattern 1: Staleness check
// ============================================================================

/**
 * Throws if the verification record has expired.
 *
 * SECURITY CONTRACT (BUG-001 fix): this function MUST only be called with a
 * server-sealed `expiresAt` — never with a client-supplied value. The value
 * originates from Logto's `expiresAt` and is delivered to destructive actions
 * via the HMAC-signed, httpOnly cookie in `./verification-cookie`
 * (`requireVerifiedIdentity`). A client cannot tamper with it. Previously this
 * was called with a `verificationTimestamp` round-tripped through the client,
 * which was bypassable (a client could pass `Date.now()`); that round-trip has
 * been removed.
 *
 * @param expiresAt - The verification record's expiresAt timestamp (ms),
 *   server-sealed from Logto's response via the verification cookie.
 * @throws {ValidationError} 'VERIFICATION_EXPIRED' if the value is non-finite,
 *   implausibly far-future, or `Date.now() > expiresAt + tolerance`.
 */
export function assertVerificationNotExpired(expiresAt: number): void {
  const now = Date.now();
  // Reject non-finite or implausibly far-future expiresAt values. This is a
  // sanity bound on the server-sealed value (Logto's TTL is 10 minutes; a
  // legitimate expiresAt is at most ~10 min from now). The 30-minute cap
  // tolerates clock skew between this app and Logto. It is NOT a bypass
  // prevention control — the bypass protection comes from the cookie being
  // httpOnly + HMAC-signed, not from this cap.
  if (!Number.isFinite(expiresAt) || expiresAt > now + LOGTO_VERIFICATION_MAX_FUTURE_MS) {
    throw new ValidationError('VERIFICATION_EXPIRED', 'verificationTimestamp');
  }
  // Staleness check: reject if the sealed expiry has already passed (plus a
  // small clock-skew tolerance so a slightly-ahead app clock does not reject a
  // still-valid Logto record).
  if (now > expiresAt + VERIFICATION_CLOCK_SKEW_TOLERANCE_MS) {
    throw new ValidationError('VERIFICATION_EXPIRED', 'verificationTimestamp');
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
    // Wait for existing lock on this key with timeout
    while (true) {
      const existing = locks.get(key);
      if (!existing) break;

      let timerId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timerId = setTimeout(() => reject(new Error(`Lock acquisition timed out for key '${key}' after ${timeoutMs}ms`)), timeoutMs);
      });

      try {
        await Promise.race([existing.catch(() => {}), timeoutPromise]);
      } catch (timeoutErr) {
        // If this was a timeout, the lock may be abandoned. Check if the same
        // promise is still there and forcibly evict it so subsequent callers
        // are not permanently blocked by a hung lock holder.
        const stillThere = locks.get(key);
        if (stillThere === existing) {
          locks.delete(key); // Forcibly evict stale/abandoned lock
        }
        throw timeoutErr;  // Re-throw to caller
      } finally {
        if (timerId) clearTimeout(timerId);
      }
    }

    // BUG-067: Capacity check placed immediately before locks.set — no await
    // between check and insert, so the check+insert is atomic in the
    // single-threaded JS runtime. The previous placement before the
    // while-loop was TOCTOU: a caller could pass the check, then await an
    // existing lock (yielding the event loop), and another caller could fill
    // the map in the meantime so that locks.set would exceed the limit.
    if (locks.size >= maxEntries && !locks.has(key)) {
      throw new Error(`Lock manager at capacity (${maxEntries}). Try again later.`);
    }

    let release!: () => void;
    const promise = new Promise<void>(resolve => {
      release = resolve;
    });
    locks.set(key, promise);

    return () => {
      // BUG-L05: Only delete the entry if it still belongs to us. A prior
      // holder whose acquire timed out may have had its entry forcibly evicted
      // (see the timeout path above) and a subsequent waiter may now own the
      // key; deleting unconditionally would drop that waiter's lock. This
      // mirrors the production guard in distributed-state.ts (which compares
      // `entry.promise === promise` on stored objects); here the map stores
      // bare Promise<void> values, so we compare the reference directly.
      const entry = locks.get(key);
      if (entry === promise) {
        locks.delete(key);
      }
      release();
    };
  }

  return { acquire, locks };
}
