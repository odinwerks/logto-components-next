/**
 * Centralized distributed-state module.
 *
 * Provides rate limiting, distributed locking, and token caching with
 * explicit Redis readiness validation and in-memory operation when Redis is
 * not configured.
 *
 * Backend selection:
 *   - REDIS_URL undefined  → in-memory backend (silent, no Redis required)
 *   - REDIS_URL defined    → Redis backend; initDistributedState() FAILS FAST
 *                             if startup connect/PING fails. Runtime retries
 *                             remain bounded so recovery does not require a
 *                             process restart.
 *
 * Exports:
 *   initDistributedState()      — startup/readiness validation hook
 *   createRateLimiter(options)  — rate limiter factory
 *   createLockManager(name, options) — per-key lock manager factory
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

interface LockManagerOptions {
  /**
   * Redis lease duration and in-memory stale-wait timeout in milliseconds.
   * Defaults to 30 seconds to preserve existing lock-manager behavior.
   */
  leaseDurationMs?: number;
}

interface TokenCacheInstance {
  get(key: string): Promise<string | null>;
  set(key: string, token: string, expiresAt: number): void;
  clear(key: string): void;
}

/**
 * Session store for Logto OIDC session data (idToken, refreshToken,
 * accessTokenMap). Values are opaque JSON strings keyed by session ID.
 *
 * Used by the Logto sessionWrapper (app/logto-kit/logic/session-wrapper.ts)
 * so session data lives in external storage and the browser cookie holds only
 * a stable session ID. This is the fix for the RSC cookie-write limitation:
 * React Server Components cannot write cookies, but they CAN write to Redis,
 * so refreshed tokens persist instead of being discarded.
 */
interface SessionStoreInstance {
  /** Returns the serialized session JSON for a session ID, or null. */
  get(sessionId: string): Promise<string | null>;
  /** Stores serialized session JSON with a TTL (seconds). */
  set(sessionId: string, data: string, ttlSeconds: number): Promise<void>;
  /** Deletes the session. */
  clear(sessionId: string): Promise<void>;
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
  lockAcquire(namespace: string, key: string, leaseDurationMs?: number): Promise<() => Promise<void>>;
  lockRelease(namespace: string, key: string): void;

  // Token cache
  tokenGet(key: string): Promise<string | null>;
  tokenSet(key: string, token: string, expiresAt: number): void;
  tokenClear(key: string): void;

  // Session store (Logto OIDC session data)
  sessionGet(sessionId: string): Promise<string | null>;
  sessionSet(sessionId: string, data: string, ttlSeconds: number): Promise<void>;
  sessionDelete(sessionId: string): Promise<void>;
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
  private readonly locks = new Map<string, Map<string, {
    promise: Promise<void>;
    resolve: () => void;
    leaseDurationMs: number;
  }>>();
  private readonly tokens = new Map<string, { token: string; expiresAt: number }>();

  /** Maximum lock entries per namespace before rejecting new acquisitions (HIGH-3). */
  private readonly MAX_LOCK_ENTRIES_PER_NAMESPACE = 1000;

  private getLockNamespace(namespace: string): Map<string, {
    promise: Promise<void>;
    resolve: () => void;
    leaseDurationMs: number;
  }> {
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

  async lockAcquire(
    namespace: string,
    key: string,
    leaseDurationMs = DEFAULT_LOCK_TIMEOUT_MS,
  ): Promise<() => Promise<void>> {
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
                  `Lock acquisition timed out for key '${key}' in '${namespace}' after ${existing.leaseDurationMs}ms`,
              ),
            ),
          existing.leaseDurationMs,
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
    ns.set(key, { promise, resolve: release, leaseDurationMs });

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

  // ── Session store ────────────────────────────────────────────────────────
  private readonly sessions = new Map<string, { value: string; expiresAt: number }>();
  /** Maximum session entries before oldest-first eviction. */
  private readonly MAX_SESSION_ENTRIES = 10_000;

  async sessionGet(sessionId: string): Promise<string | null> {
    const entry = this.sessions.get(sessionId);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }
    return entry.value;
  }

  async sessionSet(sessionId: string, data: string, ttlSeconds: number): Promise<void> {
    // Evict oldest entry only when inserting a NEW key at capacity — refreshes
    // of existing sessions must never evict themselves.
    if (!this.sessions.has(sessionId) && this.sessions.size >= this.MAX_SESSION_ENTRIES) {
      const oldestKey = this.sessions.keys().next().value;
      if (oldestKey !== undefined) {
        this.sessions.delete(oldestKey);
      }
    }
    // LRU touch: delete+set re-inserts at the end so capacity eviction drops
    // the least-recently-written session, not an actively refreshed one.
    this.sessions.delete(sessionId);
    this.sessions.set(sessionId, { value: data, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async sessionDelete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}

/**
 * Bounded, retained per-limiter fallback used whenever configured Redis is
 * initializing or unavailable. One instance is created by each limiter and
 * survives every connection retry, so an outage can never reset its counters.
 */
class RetainedRateLimitFallback {
  private readonly entries = new Map<string, { count: number; resetAt: number }>();
  private static readonly MAX_ENTRIES = 10_000;

  check(namespace: string, key: string, windowMs: number, max: number): boolean {
    const mapKey = `${namespace}|${key}`;
    const now = Date.now();
    const entry = this.entries.get(mapKey);

    if (!entry || now > entry.resetAt) {
      if (!entry && this.entries.size >= RetainedRateLimitFallback.MAX_ENTRIES) {
        const oldestKey = this.entries.keys().next().value;
        if (oldestKey !== undefined) {
          this.entries.delete(oldestKey);
        }
      }
      this.entries.set(mapKey, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (entry.count >= max) return false;
    entry.count++;
    return true;
  }

  reset(namespace: string, key: string): void {
    this.entries.delete(`${namespace}|${key}`);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(client: any) {
    this.client = client;
  }

  async rateLimitCheck(namespace: string, key: string, windowMs: number, max: number): Promise<boolean> {
    const mapKey = `rl:${namespace}|${key}`;
    const windowSec = Math.ceil(windowMs / 1000);

    const result = await this.client.eval(
      RATE_LIMIT_LUA_SCRIPT,
      1,
      mapKey,
      String(max),
      String(windowSec),
    );
    return result === 1;
  }

  async rateLimitReset(namespace: string, key: string): Promise<void> {
    const mapKey = `rl:${namespace}|${key}`;
    void this.client.del(mapKey).catch(() => {});
  }

  async lockAcquire(
    namespace: string,
    key: string,
    leaseDurationMs = DEFAULT_LOCK_TIMEOUT_MS,
  ): Promise<() => Promise<void>> {
    const lockKey = `lock:${namespace}:${key}`;
    const lockValue = crypto.randomUUID();
    const ttlMs = leaseDurationMs;

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

  // ── Session store ────────────────────────────────────────────────────────
  // Keys are namespaced under `sess:` to avoid collision with rate limits,
  // locks, and token cache entries sharing the same Redis database.

  async sessionGet(sessionId: string): Promise<string | null> {
    const value: unknown = await this.client.get(`sess:${sessionId}`);
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  async sessionSet(sessionId: string, data: string, ttlSeconds: number): Promise<void> {
    await this.client.set(`sess:${sessionId}`, data, 'EX', ttlSeconds);
  }

  async sessionDelete(sessionId: string): Promise<void> {
    await this.client.del(`sess:${sessionId}`);
  }
}

// ============================================================================
// Backend initialization (startup-validated singleton)
// ============================================================================

let _backend: Backend | null = null;
let _backendInitError: Error | null = null;
let _redisHealth: 'unknown' | 'healthy' | 'degraded' = 'unknown';

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
 *   any initialization call has triggered Redis init.
 * - A `Promise<void>` only while getBackend() has a Redis init attempt in
 *   flight. The promise NEVER rejects — the `.catch` handler in
 *   startRedisInitialization()
 *   swallows the rejection and records the failure in `_backendInitError`.
 *
 * createLockManager().acquire() awaits this latch before issuing a lock. Redis
 * initialization never exposes the rate limiter's local fallback through the
 * Backend interface, so lock ownership cannot split across local and Redis
 * backends during a cold-init handoff.
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

function reportRedisDegraded(error: Error): void {
  if (_redisHealth === 'degraded') return;
  _redisHealth = 'degraded';
  console.error(
    `[DistributedState] Redis readiness failed; configured distributed state is degraded. ${error.message}`,
  );
}

function reportRedisHealthy(): void {
  if (_redisHealth === 'degraded') {
    console.info('[DistributedState] Redis recovered; distributed state is healthy.');
  }
  _redisHealth = 'healthy';
}

/** Starts one Redis connect+PING attempt and records its settled state. */
function startRedisInitialization(redisUrl: string): void {
  if (_pendingBackendInit) return;

  _lastInitAttemptAt = Date.now();
  const initPromise = initRedisBackend(redisUrl)
    .then((redisBackend) => {
      _backend = redisBackend;
      _backendInitError = null;
      reportRedisHealthy();
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
      _backend = null;
      reportRedisDegraded(_backendInitError);
    });

  _pendingBackendInit = initPromise;
  void initPromise.then(() => {
    if (_pendingBackendInit === initPromise) {
      _pendingBackendInit = null;
    }
  });
}

/**
 * Returns the active backend, starting initialization on first call.
 * - No REDIS_URL → in-memory (silent)
 * - REDIS_URL set → Redis (fail fast on connection error, with bounded retry)
 *
 * During Redis initialization this throws. Rate limiter instances catch the
 * error and use their own retained bounded fallback; locks remain fail-closed.
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
  // whether a bounded retry is due. Between attempts, locks stay fail-closed
  // and each limiter uses its retained local quota.
  if (_backendInitError) {
    if (Date.now() - _lastInitAttemptAt < RETRY_INTERVAL_MS) {
      // Retry not due yet — fail-closed for locks; rate limiter falls back.
      throw _backendInitError;
    }
  }

  startRedisInitialization(redisUrl);
  throw _backendInitError ?? new Error('REDIS_URL is set and Redis initialization is still in progress.');
}

/**
 * Returns a settled backend before granting a lock (CAN-STATE-005).
 *
 * Triggers getBackend() first so `_pendingBackendInit` is populated when a Redis URL
 * is configured. It loops rather than awaiting a one-time promise: an init
 * attempt can fail after its retry interval has elapsed, and the next
 * getBackend() call then starts a new attempt. A caller that was awaiting the
 * old attempt must also await that retry. The latch never rejects; failed
 * attempts are recorded in `_backendInitError`, so locks fail closed between
 * attempts. For the pure in-memory backend (no REDIS_URL), the latch is null
 * and this returns it.
 *
 * CAN-STATE-006: If getBackend() throws _backendInitError (init failed, retry
 * not yet due), this function propagates the throw — locks stay fail-closed.
 * Once RETRY_INTERVAL_MS elapses, getBackend() starts reinitialization; this
 * function then awaits the new active-init latch and, on success, the
 * subsequent getBackend() returns the healthy Redis backend.
 */
async function getSettledBackendForLock(): Promise<Backend> {
  while (true) {
    try {
      return getBackend();
    } catch (error) {
      const pendingInit = _pendingBackendInit;
      if (!pendingInit) {
        throw error;
      }
      await pendingInit;
    }
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Validates the configured distributed-state backend before the server becomes
 * ready. Next.js calls this from root instrumentation.ts during Node startup.
 * When REDIS_URL is configured, connect and PING failures reject with an
 * actionable error; without REDIS_URL, the in-memory backend is initialized.
 */
export async function initDistributedState(): Promise<void> {
  let initialError: unknown;
  try {
    getBackend();
    return;
  } catch (error) {
    initialError = error;
  }

  const pendingInit = _pendingBackendInit;
  if (pendingInit) {
    await pendingInit;
    if (_backend) return;
    throw _backendInitError ?? initialError;
  }

  throw initialError;
}

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
  const fallback = new RetainedRateLimitFallback();
  let degraded = false;

  return {
    async check(key: string): Promise<boolean> {
      try {
        const allowed = await getBackend().rateLimitCheck(name, key, windowMs, max);
        if (degraded) {
          console.info(`[RateLimiter] Redis recovered for '${name}'; distributed limiting resumed.`);
          degraded = false;
        }
        return allowed;
      } catch (err) {
        // Availability trade-off: enforce a bounded per-instance quota rather
        // than failing requests. This fallback is retained for the lifetime of
        // this limiter, including across every initialization retry.
        if (!degraded) {
          const message = err instanceof Error ? err.message : String(err);
          const isAuthError = message.includes('WRONGPASS') || message.includes('NOAUTH');
          const log = isAuthError ? console.error : console.warn;
          log(
            `[RateLimiter] Redis unavailable for '${name}' — falling back to retained ` +
              `per-instance in-memory limit. Original error: ${message}`,
          );
          degraded = true;
        }
        return fallback.check(name, key, windowMs, max);
      }
    },
    async reset(key: string): Promise<void> {
      fallback.reset(name, key);
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
 *
 * Pass `{ leaseDurationMs }` only when a critical section has a known longer
 * upper bound. Omitting it preserves the existing 30-second behavior.
 */
export function createLockManager(
  name: string,
  options: LockManagerOptions = {},
): LockManagerInstance {
  const leaseDurationMs = options.leaseDurationMs ?? DEFAULT_LOCK_TIMEOUT_MS;
  if (!Number.isSafeInteger(leaseDurationMs) || leaseDurationMs <= 0) {
    throw new RangeError('Lock leaseDurationMs must be a positive safe integer');
  }

  return {
    async acquire(key: string): Promise<() => Promise<void>> {
      // CAN-STATE-005: gate lock grants on backend settlement.
      //
      // getSettledBackendForLock() triggers getBackend() and awaits every
      // active Redis init latch. No local fallback is exposed to locks during
      // an init window, so the lock is issued by exactly one backend:
      //   - Redis on successful init  → locked via Redis SET NX
      //   - init failure                → getBackend() throws _backendInitError
      //                                     (fail-closed: no lock granted)
      //   - no REDIS_URL                → Pure in-memory backend (no latch set)
      //
      // This prevents a local lock from co-existing with a same-key Redis lock
      // acquired post-settlement, which would split ownership across backends
      // and bypass mutual exclusion for profile/MFA critical sections. The
      // ownership-safe async release function returned by lockAcquire() is
      // passed through unchanged — release semantics are preserved.
      const backend = await getSettledBackendForLock();
      return backend.lockAcquire(name, key, leaseDurationMs);
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
      // (CAN-STATE-006 bounded retry replaces _backendInitError on success).
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

// ============================================================================
// Session Store (Logto OIDC sessions)
// ============================================================================

/**
 * Returns the active backend, awaiting any in-flight Redis initialization so
 * session reads on the request hot path do not observe an empty store during
 * the boot window. Returns null when the backend is permanently unavailable
 * (e.g. REDIS_URL set but Redis is down between bounded retries).
 */
async function getSettledBackendForSession(): Promise<Backend | null> {
  for (;;) {
    try {
      return getBackend();
    } catch {
      const pendingInit = _pendingBackendInit;
      if (!pendingInit) {
        return null;
      }
      // The latch never rejects; a failed attempt records _backendInitError
      // and the next loop iteration either returns the recovered backend or
      // exits null when no retry is in flight.
      await pendingInit;
    }
  }
}

/**
 * Singleton session store for Logto OIDC session data.
 *
 * Fail-open semantics: a backend outage surfaces as an empty session (user
 * re-authenticates once) rather than a crashed page. Writes that fail are
 * logged and dropped — the next request re-reads the last persisted state.
 */
export const sessionStore: SessionStoreInstance = {
  async get(sessionId: string): Promise<string | null> {
    const backend = await getSettledBackendForSession();
    if (!backend) return null;
    try {
      return await backend.sessionGet(sessionId);
    } catch (err) {
      console.warn(
        `[SessionStore] Read failed for session: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  },
  async set(sessionId: string, data: string, ttlSeconds: number): Promise<void> {
    const backend = await getSettledBackendForSession();
    if (!backend) return;
    try {
      await backend.sessionSet(sessionId, data, ttlSeconds);
    } catch (err) {
      console.warn(
        `[SessionStore] Write failed for session: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  },
  async clear(sessionId: string): Promise<void> {
    const backend = await getSettledBackendForSession();
    if (!backend) return;
    try {
      await backend.sessionDelete(sessionId);
    } catch (err) {
      console.warn(
        `[SessionStore] Delete failed for session: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  },
};
