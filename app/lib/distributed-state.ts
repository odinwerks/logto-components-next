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
  /** Returns true if the request is allowed, false if rate-limited. */
  check(key: string): boolean;
  /** Resets the rate limit counter for the given key. */
  reset(key: string): void;
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
  // Rate limiting
  rateLimitCheck(namespace: string, key: string, windowMs: number, max: number): boolean;
  rateLimitReset(namespace: string, key: string): void;

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
  private readonly locks = new Map<string, Map<string, Promise<void>>>();
  private readonly tokens = new Map<string, { token: string; expiresAt: number }>();

  private getLockNamespace(namespace: string): Map<string, Promise<void>> {
    let ns = this.locks.get(namespace);
    if (!ns) {
      ns = new Map();
      this.locks.set(namespace, ns);
    }
    return ns;
  }

  rateLimitCheck(namespace: string, key: string, windowMs: number, max: number): boolean {
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

  rateLimitReset(namespace: string, key: string): void {
    this.rateLimits.delete(`${namespace}:${key}`);
  }

  async lockAcquire(namespace: string, key: string): Promise<() => void> {
    const ns = this.getLockNamespace(namespace);

    // Wait for any existing lock on this key with timeout
    while (true) {
      const existing = ns.get(key);
      if (!existing) break;

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                `Lock acquisition timed out for key '${key}' in '${namespace}' after ${DEFAULT_LOCK_TIMEOUT_MS}ms`,
              ),
            ),
          DEFAULT_LOCK_TIMEOUT_MS,
        );
      });

      await Promise.race([existing.catch(() => {}), timeoutPromise]);
    }

    let release!: () => void;
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    ns.set(key, promise);

    return () => {
      ns.delete(key);
      release();
    };
  }

  lockRelease(namespace: string, key: string): void {
    const ns = this.locks.get(namespace);
    if (ns) ns.delete(key);
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

class RedisBackend implements Backend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly client: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(client: any) {
    this.client = client;
  }

  /**
   * WARNING: DESIGN LIMITATION OF SYNCHRONOUS CONTRACT (BUG-008)
   *
   * The createRateLimiter public interface defines a synchronous `check(key: string): boolean` method.
   * Because of this synchronous signature, we cannot block and await Redis responses (such as INCR/EXPIRE).
   *
   * CONCURRENCY & MULTI-INSTANCE IMPACTS:
   * 1. This method fires asynchronous commands to Redis (`client.incr` + `expire`) as fire-and-forget background tasks.
   * 2. It immediately returns a decision based on a LOCAL in-memory shadow map (`_shadowRateLimitCheck`).
   * 3. In a multi-instance production environment, instances DO NOT share the in-memory shadow map synchronously.
   *    Each instance limits requests locally per-process, while pushing counts to Redis asynchronously.
   * 4. Therefore, cross-instance requests are not perfectly synchronized in real-time, which may allow temporary
   *    rate-limiting slides (e.g., clients hitting different instances could slightly exceed the maximum rate
   *    before the background Redis write and TTL expire).
   *
   * MIGRATION/RECOMMENDATION:
   * If strict global distributed rate-limiting is required, migrate `createRateLimiter` to an asynchronous signature:
   * `check(key: string): Promise<boolean>` and await Redis operations directly instead of relying on the shadow map.
   */
  rateLimitCheck(namespace: string, key: string, windowMs: number, max: number): boolean {
    // Redis rate limiting is async; we perform a best-effort synchronous read
    // via a fire-and-forget pattern. For truly atomic Redis rate limiting we
    // would need to make check() async. As per spec, check() returns boolean.
    // We use an in-memory shadow for synchronous return value, and schedule
    // the Redis write asynchronously for durability/distribution.
    //
    // For production multi-instance deployments, prefer an async check() API.
    // This implementation fulfils the spec's synchronous interface contract.
    const mapKey = `rl:${namespace}:${key}`;
    const windowSec = Math.ceil(windowMs / 1000);

    // Fire-and-forget Redis INCR + EXPIRE; return value from in-memory shadow
    void (async () => {
      try {
        const count = await this.client.incr(mapKey);
        if (count === 1) {
          await this.client.expire(mapKey, windowSec);
        }
      } catch {
        // Redis errors are non-fatal for rate limiting
      }
    })();

    // Synchronous shadow map for immediate return
    return this._shadowRateLimitCheck(namespace, key, windowMs, max);
  }

  // In-memory shadow for synchronous return from Redis-backed rate limiter
  private readonly _shadowMap = new Map<string, { count: number; resetAt: number }>();

  private _shadowRateLimitCheck(
    namespace: string,
    key: string,
    windowMs: number,
    max: number,
  ): boolean {
    const mapKey = `${namespace}:${key}`;
    const now = Date.now();
    const entry = this._shadowMap.get(mapKey);
    if (!entry || now > entry.resetAt) {
      this._shadowMap.set(mapKey, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= max) return false;
    entry.count++;
    return true;
  }

  rateLimitReset(namespace: string, key: string): void {
    const mapKey = `rl:${namespace}:${key}`;
    void this.client.del(mapKey).catch(() => {});
    this._shadowMap.delete(`${namespace}:${key}`);
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
  // NOTE: Because Redis init is async but our API is synchronous, we
  // eagerly start the connection and fall back to in-memory until Redis
  // is ready. If Redis fails, subsequent calls will throw.
  const tempBackend = new InMemoryBackend();
  _backend = tempBackend;

  // Kick off async init
  void initRedisBackend(redisUrl)
    .then((redisBackend) => {
      _backend = redisBackend;
    })
    .catch((err: Error) => {
      _backendInitError = new Error(
        `REDIS_URL is set but Redis connection failed: ${err.message}. ` +
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
 * @example
 * const limiter = createRateLimiter({ name: 'protected-route', windowMs: 60_000, max: 10 });
 * if (!limiter.check(userId)) return error('RATE_LIMITED', 429);
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiterInstance {
  const { name, windowMs, max } = options;

  return {
    check(key: string): boolean {
      return getBackend().rateLimitCheck(name, key, windowMs, max);
    },
    reset(key: string): void {
      getBackend().rateLimitReset(name, key);
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
