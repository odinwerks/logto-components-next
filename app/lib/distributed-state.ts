/**
 * Centralized distributed-state module.
 *
 * Provides rate limiting, distributed locking, and token caching with
 * automatic Redis/in-memory backend switching.
 *
 * Backend selection:
 *   - REDIS_URL undefined  → in-memory backend (silent, no Redis required)
 *   - REDIS_URL defined    → Redis backend; FAILS FAST if connection fails,
 *                             with bounded retry (CAN-STATE-006) so recovery
 *                             does not require a process restart
 *
 * Exports:
 *   createRateLimiter(options)  — rate limiter factory
 *   createLockManager(name)     — per-key lock manager factory
 *   tokenCache                  — singleton M2M token cache
 */

// ============================================================================
// Types
// ============================================================================

interface RateLimiterInstance {
  /**
   * Returns true if the request is allowed, false if rate-limited.
   * Async because Redis check must be awaited for atomic distributed behavior.
   */
  check(key: string): Promise<boolean>;
  /** Resets the rate limit counter for the given key. */
  reset(key: string): Promise<void>;
}

interface LockManagerInstance {
  /** Acquires a lock for the given key. Returns an async release function. */
  acquire(key: string): Promise<() => Promise<void>>;
  /** Releases the lock for the given key (explicit release, non-awaited). */
  release(key: string): void;
}

interface TokenCacheInstance {
  get(key: string): Promise<string | null>;
  set(key: string, token: string, expiresAt: number): void;
  clear(key: string): void;
}

interface RateLimiterOptions {
  /** Namespace key, e.g. "protected-route", "avatar-upload". */
  name: string;
  /** Time window in milliseconds. */
  windowMs: number;
  /** Maximum requests per window. */
  max: number;
}

// ============================================================================
// Backend interface
// ============================================================================

interface Backend {
  // Rate limiting — async to support Redis atomic Lua script
  rateLimitCheck(namespace: string, key: string, windowMs: number, max: number): Promise<boolean>;
  rateLimitReset(namespace: string, key: string): Promise<void>;

  // Locking
  lockAcquire(namespace: string, key: string): Promise<() => Promise<void>>;
  lockRelease(namespace: string, key: string): void;

  // Token cache
  tokenGet(key: string): Promise<string | null>;
  tokenSet(key: string, token: string, expiresAt: number): void;
  tokenClear(key: string): void;
}

// ============================================================================
// In-memory backend
// ============================================================================

const DEFAULT_LOCK_TIMEOUT_MS = 30_000;

/**
 * Maximum time an awaited ownership-safe Redis release may consume.
 *
 * Custom-data actions reserve five seconds after their 25-second critical
 * section budget; one second is deliberately well within that cleanup margin.
 */
export const REDIS_LOCK_RELEASE_TIMEOUT_MS = 1_000;

class InMemoryBackend implements Backend {
  private readonly rateLimits = new Map<string, { count: number; resetAt: number }>();
  private readonly locks = new Map<string, Map<string, { promise: Promise<void>; resolve: () => void }>>();
  private readonly tokens = new Map<string, { token: string; expiresAt: number }>();

  /** Maximum lock entries per namespace before rejecting new acquisitions (HIGH-3). */
  private readonly MAX_LOCK_ENTRIES_PER_NAMESPACE = 1000;

  private getLockNamespace(namespace: string): Map<string, { promise: Promise<void>; resolve: () => void }> {
    let ns = this.locks.get(namespace);
    if (!ns) {
      ns = new Map();
      this.locks.set(namespace, ns);
    }
    return ns;
  }

  async rateLimitCheck(namespace: string, key: string, windowMs: number, max: number): Promise<boolean> {
    // Use pipe delimiter to avoid colon-collision (BUG-054): namespace and key
    // components validated via SAFE_ID_REGEX never contain '|', so pipe prevents
    // ambiguity like ns="user:abc" + key="action:def" colliding with
    // ns="user:ab" + key="c:action:def".
    const mapKey = `${namespace}|${key}`;
    const now = Date.now();
    const entry = this.rateLimits.get(mapKey);
    if (!entry || now > entry.resetAt) {
      this.rateLimits.set(mapKey, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= max) return false;
    entry.count++;
    return true;
  }

  async rateLimitReset(namespace: string, key: string): Promise<void> {
    this.rateLimits.delete(`${namespace}|${key}`);
  }

  async lockAcquire(namespace: string, key: string): Promise<() => Promise<void>> {
    const ns = this.getLockNamespace(namespace);

    // Capacity check (HIGH-3): if namespace is at max and key is not already locked, reject
    if (ns.size >= this.MAX_LOCK_ENTRIES_PER_NAMESPACE && !ns.has(key)) {
      throw new Error(
        `Lock manager at capacity (${this.MAX_LOCK_ENTRIES_PER_NAMESPACE}) for namespace '${namespace}'. Try again later.`
      );
    }

    // Wait for any existing lock on this key with timeout
    while (true) {
      const existing = ns.get(key);
      if (!existing) break;

      let timerId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timerId = setTimeout(
          () =>
            reject(
              new Error(
                `Lock acquisition timed out for key '${key}' in '${namespace}' after ${DEFAULT_LOCK_TIMEOUT_MS}ms`,
              ),
            ),
          DEFAULT_LOCK_TIMEOUT_MS,
        );
      });

      try {
        await Promise.race([existing.promise.catch(() => {}), timeoutPromise]);
      } catch (timeoutErr) {
        // If this was a timeout, the lock may be abandoned. Forcibly evict
        // the stale entry so subsequent callers are not permanently blocked.
        const stillThere = ns.get(key);
        if (stillThere === existing) {
          ns.delete(key); // Forcibly evict stale/abandoned lock
        }
        throw timeoutErr;  // Re-throw to caller
      } finally {
        if (timerId) clearTimeout(timerId);
      }
    }

    let release!: () => void;
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    ns.set(key, { promise, resolve: release });

    return async () => {
      const entry = ns.get(key);
      if (entry && entry.promise === promise) {
        ns.delete(key);
        release();
      }
    };
  }

  lockRelease(namespace: string, key: string): void {
    const ns = this.locks.get(namespace);
    if (ns) {
      const entry = ns.get(key);
      if (entry) {
        entry.resolve();
        ns.delete(key);
      }
    }
  }

  async tokenGet(key: string): Promise<string | null> {
    const entry = this.tokens.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.tokens.delete(key);
      return null;
    }
    return entry.token;
  }

  tokenSet(key: string, token: string, expiresAt: number): void {
    this.tokens.set(key, { token, expiresAt });
  }

  tokenClear(key: string): void {
    this.tokens.delete(key);
  }
}

// ============================================================================
// Redis backend
// ============================================================================

/**
 * Atomic Lua script for Redis rate limiting.
 *
 * Increments the counter for the given key. Sets the expiry on first increment.
 * Returns 1 if the request is allowed (count <= max), 0 if rate-limited.
 *
 * Atomicity: INCR and EXPIRE run in the same Lua execution context — no race
 * between the two Redis calls. The expiry is only set on the first increment
 * (count === 1) so it doesn't reset the window on subsequent requests.
 */
const RATE_LIMIT_LUA_SCRIPT = `
local key = KEYS[1]
local max = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = redis.call('INCR', key)
if current == 1 then
  redis.call('EXPIRE', key, window)
end
if current <= max then
  return 1
else
  return 0
end
`;

class RedisBackend implements Backend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly client: any;

  /**
   * Per-instance fallback in-memory rate limiter for degraded mode.
   *
   * When Redis throws during rateLimitCheck, we log a warning and fall back
   * to this local in-memory map. This is DEGRADED MODE — not fail-closed.
   * The fallback is bounded to prevent unbounded memory growth.
   *
   * NOTE: In a multi-instance deployment, degraded mode only enforces per-instance
   * limits (not global distributed limits). This is intentional and documented.
   * The alternative (fail-closed) would deny all requests when Redis is down,
   * which is worse for availability in most deployments.
   */
  private readonly _fallbackRateLimits = new Map<string, { count: number; resetAt: number }>();
  private static readonly FALLBACK_MAP_MAX_ENTRIES = 10_000;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(client: any) {
    this.client = client;
  }

  async rateLimitCheck(namespace: string, key: string, windowMs: number, max: number): Promise<boolean> {
    const mapKey = `rl:${namespace}|${key}`;
    const windowSec = Math.ceil(windowMs / 1000);

    try {
      const result = await this.client.eval(
        RATE_LIMIT_LUA_SCRIPT,
        1,
        mapKey,
        String(max),
        String(windowSec),
      );
      return result === 1;
    } catch (err) {
      // Redis error during rate limit check: DEGRADED MODE.
      // Fall back to per-instance in-memory rate limiter rather than fail-closed.
      // This preserves availability when Redis is temporarily unavailable,
      // at the cost of distributed enforcement (each instance enforces independently).
      const errMsg = (err as Error).message ?? '';
      const isAuthError = errMsg.includes('WRONGPASS') || errMsg.includes('NOAUTH');
      if (isAuthError) {
        // Auth failures are logged at ERROR level — operators must fix the password.
        // The fallback is still used so the app stays up, but the misconfiguration
        // is surfaced loudly. In high-assurance deployments, re-throw here instead.
        console.error(
          `[RateLimit] Redis authentication failed for key "${mapKey}" — ` +
          `check REDIS_PASSWORD. Falling back to per-instance in-memory limit. ` +
          `Original error: ${errMsg}`,
        );
      } else {
        console.warn(
          `[RateLimit] Redis unavailable for key "${mapKey}" — falling back to per-instance in-memory limit. ` +
          `Original error: ${errMsg}`,
        );
      }
      return this._fallbackRateLimitCheck(namespace, key, windowMs, max);
    }
  }

  /**
   * Per-instance in-memory rate limit check for degraded mode.
   * Bounded to FALLBACK_MAP_MAX_ENTRIES to prevent memory exhaustion.
   */
  private _fallbackRateLimitCheck(
    namespace: string,
    key: string,
    windowMs: number,
    max: number,
  ): boolean {
    const mapKey = `${namespace}|${key}`;
    const now = Date.now();
    const entry = this._fallbackRateLimits.get(mapKey);

    if (!entry || now > entry.resetAt) {
      // Evict oldest entry if at capacity before adding new one
      if (!entry && this._fallbackRateLimits.size >= RedisBackend.FALLBACK_MAP_MAX_ENTRIES) {
        const firstKey = this._fallbackRateLimits.keys().next().value;
        if (firstKey !== undefined) {
          this._fallbackRateLimits.delete(firstKey);
        }
      }
      this._fallbackRateLimits.set(mapKey, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= max) return false;
    entry.count++;
    return true;
  }

  async rateLimitReset(namespace: string, key: string): Promise<void> {
    const mapKey = `rl:${namespace}|${key}`;
    void this.client.del(mapKey).catch(() => {});
    this._fallbackRateLimits.delete(`${namespace}|${key}`);
  }

  async lockAcquire(namespace: string, key: string): Promise<() => Promise<void>> {
    const lockKey = `lock:${namespace}:${key}`;
    const lockValue = crypto.randomUUID();
    const ttlMs = DEFAULT_LOCK_TIMEOUT_MS;

    // Retry loop: SET NX with TTL
    const deadline = Date.now() + ttlMs;
    while (Date.now() < deadline) {
      const result: string | null = await this.client.set(
        lockKey,
        lockValue,
        'PX',
        ttlMs,
        'NX',
      );
      if (result === 'OK') {
        return async () => {
          // Atomic ownership-check-then-delete via Lua script.
          // Prevents non-owner release: only deletes if the stored value matches.
          try {
            const luaScript = `
              if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
              else
                return 0
              end
            `;
            // An unavailable Redis client may leave eval pending forever.
            // Awaiting release is required for ordering, but it must fit inside
            // the caller's cleanup margin. The timed-out Lua request remains
            // ownership-checked if it later reaches Redis; never use DEL.
            let timer: ReturnType<typeof setTimeout> | undefined;
            const releasePromise = Promise.resolve().then(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              () => (this.client as any).eval(luaScript, 1, lockKey, lockValue),
            );
            const timeoutPromise = new Promise<never>((_, reject) => {
              timer = setTimeout(
                () => reject(new Error('Redis lock release timed out')),
                REDIS_LOCK_RELEASE_TIMEOUT_MS,
              );
            });
            try {
              await Promise.race([releasePromise, timeoutPromise]);
            } finally {
              if (timer) clearTimeout(timer);
            }
          } catch (releaseErr) {
            // Never fall back to an unconditional DEL here. If this owner's
            // lease expired before the Lua script ran, another owner may have
            // acquired the key. DEL would then release that other owner's
            // lock and violate mutual exclusion. The Redis TTL is the safe
            // recovery mechanism when the ownership check cannot run.
            console.error('[Lock] Redis Lua release failed; key will expire via TTL', {
              lockKey,
              error: (releaseErr as Error).message,
            });
          }
        };
      }
      // Wait 50ms before retrying
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    }

    throw new Error(
      `Redis lock acquisition timed out for key '${key}' in '${namespace}' after ${ttlMs}ms`,
    );
  }

  lockRelease(_namespace: string, _key: string): void {
    // Deprecated: use the release function returned by lockAcquire instead.
    // Direct DEL without ownership check risks releasing another owner's lock.
    // This is a no-op to preserve the Backend interface contract.
  }

  async tokenGet(key: string): Promise<string | null> {
    // Fast path: check in-memory shadow
    const entry = this._tokenShadow.get(key);
    if (entry) {
      if (Date.now() >= entry.expiresAt) {
        this._tokenShadow.delete(key);
        // Fall through to Redis read (don't return null yet)
      } else {
        return entry.token;
      }
    }

    // Shadow miss — try Redis (BUG-026: previously only read shadow, making
    // the distributed cache non-functional across instances)
    const redisKey = `token:${key}`;
    try {
      const value: string | null = await this.client.get(redisKey);
      if (typeof value === 'string' && value.length > 0) {
        // Repopulate shadow with a conservative TTL for fast subsequent reads.
        // The actual TTL in Redis is authoritative; this shadow TTL merely
        // limits how long a stale shadow entry persists before re-checking Redis.
        this._tokenShadow.set(key, { token: value, expiresAt: Date.now() + 60_000 });
        return value;
      }
    } catch (err) {
      console.warn(
        `[TokenCache] Redis read failed for key "${key}": ` +
        `${(err as Error).message}`,
      );
    }

    return null;
  }

  private readonly _tokenShadow = new Map<string, { token: string; expiresAt: number }>();

  tokenSet(key: string, token: string, expiresAt: number): void {
    this._tokenShadow.set(key, { token, expiresAt });
    const ttlMs = Math.max(expiresAt - Date.now(), 0);
    if (ttlMs > 0) {
      const redisKey = `token:${key}`;
      void this.client
        .set(redisKey, token, 'PX', ttlMs)
        .catch(() => {});
    }
  }

  tokenClear(key: string): void {
    this._tokenShadow.delete(key);
    void this.client.del(`token:${key}`).catch(() => {});
  }
}

// ============================================================================
// Backend initialization (lazy singleton)
// ============================================================================

let _backend: Backend | null = null;
let _backendInitError: Error | null = null;

/**
 * Timestamp (Date.now()) of the most recent Redis init attempt (CAN-STATE-006).
 *
 * Used to bound retry frequency: after a failure, getBackend() throws
 * _backendInitError until RETRY_INTERVAL_MS elapses, then attempts
 * reinitialization. This prevents both permanent latching (the original bug)
 * and retry storms (hammering Redis on every call).
 */
let _lastInitAttemptAt = 0;

/**
 * Minimum milliseconds between Redis reconnection attempts (CAN-STATE-006).
 *
 * After a Redis init failure, getBackend() throws _backendInitError
 * (fail-closed for locks) until this interval elapses, then attempts
 * reinitialization. Configurable via REDIS_RETRY_INTERVAL_MS for testing;
 * defaults to 5 seconds.
 */
const DEFAULT_RETRY_INTERVAL_MS = 5_000;

function parseRetryIntervalMs(value: string | undefined): number {
  const intervalMs = Number(value);
  return Number.isFinite(intervalMs) && intervalMs > 0
    ? intervalMs
    : DEFAULT_RETRY_INTERVAL_MS;
}

const RETRY_INTERVAL_MS = parseRetryIntervalMs(process.env.REDIS_RETRY_INTERVAL_MS);

/**
 * Active-init latch for backend readiness (CAN-STATE-005).
 *
 * - `null` when no Redis URL is configured (pure in-memory backend) or before
 *   any getBackend() call has triggered Redis init.
 * - A `Promise<void>` only while getBackend() has a Redis init attempt in
 *   flight. The promise NEVER rejects — the `.catch` handler in getBackend()
 *   swallows the rejection and records the failure in `_backendInitError`.
 *
 * createLockManager().acquire() awaits this latch before issuing a lock so
 * that exactly one authoritative backend (in-memory OR Redis) grants locks
 * for a given key — never both during the cold-init handoff. Without this
 * gate, a lock acquired from the temporary in-memory stand-in and a same-key
 * lock later acquired from the Redis backend could both be held, splitting
 * lock ownership across backends and bypassing mutual exclusion for the
 * profile/MFA critical sections.
 */
let _pendingBackendInit: Promise<void> | null = null;

async function initRedisBackend(redisUrl: string): Promise<Backend> {
  // Dynamic import to avoid requiring ioredis when not using Redis
  const { default: Redis } = await import('ioredis');
  const client = new Redis(redisUrl, {
    enableOfflineQueue: false,
    connectTimeout: 5000,
    lazyConnect: true,
  });

  await client.connect();

  // Verify connection with PING
  const pong = await client.ping();
  if (pong !== 'PONG') {
    throw new Error(`Redis PING failed: got '${pong}' instead of 'PONG'`);
  }

  return new RedisBackend(client);
}

/**
 * Returns the active backend, initializing it on first call.
 * - No REDIS_URL → in-memory (silent)
 * - REDIS_URL set → Redis (fail fast on connection error, with bounded retry)
 *
 * During the Redis init window, uses in-memory backend as a stand-in.
 * A warning is logged because rate limits during this window are per-instance only.
 *
 * CAN-STATE-006: After a Redis init failure, throws _backendInitError
 * (fail-closed for locks) until RETRY_INTERVAL_MS elapses, then attempts
 * reinitialization. This prevents permanent latching — Redis recovery restores
 * lock-protected actions without a process restart.
 */
function getBackend(): Backend {
  if (_backend) return _backend;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    // No Redis configured: use in-memory backend silently
    _backend = new InMemoryBackend();
    return _backend;
  }

  // REDIS_URL is set. If a previous init failed (CAN-STATE-006), decide
  // whether to retry or throw (fail-closed). The retry is bounded by
  // RETRY_INTERVAL_MS to prevent retry storms — between attempts, getBackend()
  // throws _backendInitError so locks stay fail-closed and the rate limiter
  // catches and allows-through. Once the interval elapses, the error is
  // cleared and reinitialization is attempted. On success, Redis resumes;
  // on failure, the error is re-set and the next retry is scheduled.
  if (_backendInitError) {
    if (Date.now() - _lastInitAttemptAt < RETRY_INTERVAL_MS) {
      // Retry not due yet — fail-closed for locks; rate limiter catches.
      throw _backendInitError;
    }
    // Retry is due: clear the error and fall through to reinitialize.
    _backendInitError = null;
  }

  // Redis URL is set: initialize synchronously using in-memory backend as
  // a temporary stand-in, then replace once connection is established.
  //
  // NOTE: During the Redis init window, rate limits are per-instance only.
  // A warning is logged to alert operators.
  //
  // CAN-STATE-005: The active init promise is captured in `_pendingBackendInit` so lock
  // acquisitions can await backend settlement before granting locks (see
  // getSettledBackendForLock). The temporary in-memory stand-in is intentionally NOT
  // used for locks — without the latch, a lock acquired from it and a same-key
  // Redis lock acquired post-settlement could both be held, splitting lock
  // ownership across backends. The captured promise never rejects; the
  // `.catch` handler swallows the rejection and records the failure in
  // `_backendInitError`, so lock gating fails closed via getBackend() throwing.
  //
  // CAN-STATE-006: _lastInitAttemptAt is set so the bounded retry knows when
  // the next reconnection attempt is due.
  const tempBackend = new InMemoryBackend();
  _backend = tempBackend;
  _lastInitAttemptAt = Date.now();

  // Kick off async init and capture the settlement latch. The handler chain
  // resolves (never rejects) on both success and failure.
  const initPromise = initRedisBackend(redisUrl)
    .then((redisBackend) => {
      _backend = redisBackend;
      // Success: _backendInitError stays null (already cleared above if this
      // was a retry). Redis is healthy — locks and rate limiting resume.
    })
    .catch((err: Error) => {
      const isAuthError = err.message.includes('WRONGPASS') || err.message.includes('NOAUTH');
      const authHint = isAuthError
        ? ' This is a Redis authentication failure — check that REDIS_PASSWORD is set correctly.'
        : '';
      _backendInitError = new Error(
        `REDIS_URL is set but Redis connection failed: ${err.message}.${authHint} ` +
          'Fix the Redis connection or unset REDIS_URL to use in-memory backend.',
      );
      // Clear backend so the next getBackend() call either throws (retry not
      // due) or reinitializes (retry due).
      _backend = null;
    });

  _pendingBackendInit = initPromise;
  // Clear only if this is still the active attempt. This identity check keeps
  // a prior attempt's settlement from clearing a later retry's latch.
  void initPromise.then(() => {
    if (_pendingBackendInit === initPromise) {
      _pendingBackendInit = null;
    }
  });

  return _backend;
}

/**
 * Returns a settled backend before granting a lock (CAN-STATE-005).
 *
 * Triggers getBackend() first so `_pendingBackendInit` is populated when a Redis URL
 * is configured. It loops rather than awaiting a one-time promise: an init
 * attempt can fail after its retry interval has elapsed, and the next
 * getBackend() call then starts a new attempt. A caller that was awaiting the
 * old attempt must also await that retry rather than receiving its temporary
 * in-memory stand-in. The latch never rejects; failed attempts are recorded in
 * `_backendInitError`, so locks fail closed between attempts. For the pure
 * in-memory backend (no REDIS_URL), the latch is null and this returns it.
 *
 * CAN-STATE-006: If getBackend() throws _backendInitError (init failed, retry
 * not yet due), this function propagates the throw — locks stay fail-closed.
 * Once RETRY_INTERVAL_MS elapses, getBackend() clears the error and
 * reinitializes; this function then awaits the new active-init latch and, on
 * success, the subsequent getBackend() returns the healthy Redis backend.
 */
async function getSettledBackendForLock(): Promise<Backend> {
  while (true) {
    // getBackend() either returns a settled backend, starts an init attempt and
    // returns its temporary rate-limit backend, or throws while retry is not
    // due. The latter is deliberately fail-closed for locks.
    const backend = getBackend();
    const pendingInit = _pendingBackendInit;
    if (!pendingInit) {
      return backend;
    }

    await pendingInit;
    // Re-check after every settlement. A failed attempt may have caused this
    // call to start a retry, whose temporary backend must never grant a lock.
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Rate limiter factory. Returns a rate limiter for a named resource.
 *
 * Uses count+reset semantics (fixed window).
 *
 * The `check` method is async to support atomic Redis Lua script execution.
 * When Redis is unavailable, falls back to per-instance in-memory limiting
 * (degraded mode) with a warning log — does NOT fail-closed.
 *
 * @example
 * const limiter = createRateLimiter({ name: 'protected-route', windowMs: 60_000, max: 10 });
 * if (!(await limiter.check(userId))) return error('RATE_LIMITED', 429);
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiterInstance {
  const { name, windowMs, max } = options;

  return {
    async check(key: string): Promise<boolean> {
      try {
        return await getBackend().rateLimitCheck(name, key, windowMs, max);
      } catch (err) {
        // Redis backend init failed — degrade gracefully to allow-through.
        // Operators should fix Redis; users must not receive 500s due to infra issues.
        console.warn(
          `[RateLimiter] Backend unavailable for '${name}', degrading to allow-through: ${err instanceof Error ? err.message : String(err)}`,
        );
        return true; // allow the request
      }
    },
    async reset(key: string): Promise<void> {
      try {
        return await getBackend().rateLimitReset(name, key);
      } catch {
        // Degraded mode: ignore reset failures silently
      }
    },
  };
}

/**
 * Lock manager factory. Returns a per-key lock manager for a named resource.
 *
 * Equivalent to the `createLockManager` in `helpers.ts` but namespaced and
 * backend-aware.
 *
 * @example
 * const manager = createLockManager('custom-data');
 * const release = await manager.acquire(userId);
 * try { ... } finally { release(); }
 */
export function createLockManager(name: string): LockManagerInstance {
  return {
    async acquire(key: string): Promise<() => Promise<void>> {
      // CAN-STATE-005: gate lock grants on backend settlement.
      //
      // getSettledBackendForLock() triggers getBackend() (which, on first call with a
      // Redis URL configured, sets `_backend` to a temporary in-memory stand-in
      // and starts the async Redis init) and awaits every active init latch.
      // It intentionally discards every stand-in returned during an init
      // window, returning only an authoritative backend so the lock is issued
      // by exactly one backend:
      //   - Redis on successful init  → locked via Redis SET NX
      //   - init failure                → getBackend() throws _backendInitError
      //                                     (fail-closed: no lock granted)
      //   - no REDIS_URL                → Pure in-memory backend (no latch set)
      //
      // This prevents a lock acquired from the temporary in-memory stand-in
      // from co-existing with a same-key Redis lock acquired post-settlement,
      // which would split ownership across backends and bypass mutual exclusion
      // for the profile/MFA critical sections. The ownership-safe async release
      // function returned by the backend's lockAcquire() is passed through
      // unchanged — release semantics are preserved.
      const backend = await getSettledBackendForLock();
      return backend.lockAcquire(name, key);
    },
    release(key: string): void {
      getBackend().lockRelease(name, key);
    },
  };
}

/**
 * Singleton token cache for M2M tokens (and other short-lived tokens).
 *
 * Uses the active backend (Redis or in-memory) for storage.
 * The cache is keyed by an arbitrary string (e.g. 'm2m-token').
 */
export const tokenCache: TokenCacheInstance = {
  async get(key: string): Promise<string | null> {
    try {
      return await getBackend().tokenGet(key);
    } catch {
      // Backend unavailable — treat as cache miss (fail-open). The caller
      // fetches a fresh token; caching resumes when Redis recovers
      // (CAN-STATE-006 bounded retry clears _backendInitError).
      return null;
    }
  },
  set(key: string, token: string, expiresAt: number): void {
    try {
      getBackend().tokenSet(key, token, expiresAt);
    } catch {
      // Backend unavailable — silently skip caching (fail-open).
    }
  },
  clear(key: string): void {
    try {
      getBackend().tokenClear(key);
    } catch {
      // Backend unavailable — silently skip clear (fail-open).
    }
  },
};
