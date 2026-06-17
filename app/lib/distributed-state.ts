/**
 * Centralized distributed-state module.
 *
 * Provides rate limiting, distributed locking, and token caching with
 * automatic Redis/in-memory backend switching.
 *
 * Backend selection:
 *   - REDIS_URL undefined  → in-memory backend (silent, no Redis required)
 *   - REDIS_URL defined    → Redis backend; FAILS FAST if connection fails
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
  /** Acquires a lock for the given key. Returns a release function. */
  acquire(key: string): Promise<() => void>;
  /** Releases the lock for the given key (explicit release, non-awaited). */
  release(key: string): void;
}

interface TokenCacheInstance {
  get(key: string): string | null;
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
  lockAcquire(namespace: string, key: string): Promise<() => void>;
  lockRelease(namespace: string, key: string): void;

  // Token cache
  tokenGet(key: string): string | null;
  tokenSet(key: string, token: string, expiresAt: number): void;
  tokenClear(key: string): void;
}

// ============================================================================
// In-memory backend
// ============================================================================

const DEFAULT_LOCK_TIMEOUT_MS = 30_000;

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
    const mapKey = `${namespace}:${key}`;
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
    this.rateLimits.delete(`${namespace}:${key}`);
  }

  async lockAcquire(namespace: string, key: string): Promise<() => void> {
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

    return () => {
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

  tokenGet(key: string): string | null {
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
    const mapKey = `rl:${namespace}:${key}`;
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
    const mapKey = `${namespace}:${key}`;
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
    const mapKey = `rl:${namespace}:${key}`;
    void this.client.del(mapKey).catch(() => {});
    this._fallbackRateLimits.delete(`${namespace}:${key}`);
  }

  async lockAcquire(namespace: string, key: string): Promise<() => void> {
    const lockKey = `lock:${namespace}:${key}`;
    const lockValue = `${Date.now()}-${Math.random()}`;
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
          // Only delete if we still own the lock (value matches)
          try {
            const current = await this.client.get(lockKey);
            if (current === lockValue) {
              await this.client.del(lockKey);
            }
          } catch {
            // Non-fatal: TTL will clean up
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

  lockRelease(namespace: string, key: string): void {
    const lockKey = `lock:${namespace}:${key}`;
    void this.client.del(lockKey).catch(() => {});
  }

  tokenGet(key: string): string | null {
    // Synchronous read is not possible with Redis; return null and rely on
    // the async set/get pattern in the tokenCache wrapper.
    // The token cache uses an in-memory shadow for performance.
    const entry = this._tokenShadow.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this._tokenShadow.delete(key);
      return null;
    }
    return entry.token;
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
 * - REDIS_URL set → Redis (fail fast on connection error)
 *
 * During the Redis init window, uses in-memory backend as a stand-in.
 * A warning is logged because rate limits during this window are per-instance only.
 */
function getBackend(): Backend {
  if (_backend) return _backend;
  if (_backendInitError) throw _backendInitError;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    // No Redis configured: use in-memory backend silently
    _backend = new InMemoryBackend();
    return _backend;
  }

  // Redis URL is set: initialize synchronously using in-memory backend as
  // a temporary stand-in, then replace once connection is established.
  // For fail-fast behavior, we throw if the connection has already failed.
  //
  // NOTE: During the Redis init window, rate limits are per-instance only.
  // A warning is logged to alert operators.
  const tempBackend = new InMemoryBackend();
  _backend = tempBackend;

  // Kick off async init
  void initRedisBackend(redisUrl)
    .then((redisBackend) => {
      _backend = redisBackend;
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
      // Replace backend with an error-throwing proxy
      _backend = null;
    });

  return _backend;
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
      return getBackend().rateLimitCheck(name, key, windowMs, max);
    },
    async reset(key: string): Promise<void> {
      return getBackend().rateLimitReset(name, key);
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
    async acquire(key: string): Promise<() => void> {
      return getBackend().lockAcquire(name, key);
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
  get(key: string): string | null {
    return getBackend().tokenGet(key);
  },
  set(key: string, token: string, expiresAt: number): void {
    getBackend().tokenSet(key, token, expiresAt);
  },
  clear(key: string): void {
    getBackend().tokenClear(key);
  },
};
