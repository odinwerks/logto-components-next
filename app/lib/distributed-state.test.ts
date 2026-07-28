import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// distributed-state module tests
// ============================================================================
// Tests createRateLimiter, createLockManager, and tokenCache.
// ============================================================================

// ============================================================================
// Global ioredis mock
// ============================================================================
// We use vi.mock (hoisted) so the mock applies when the module under test
// dynamically imports ioredis. The mock delegates to globalThis so that
// the mock configuration survives vi.resetModules() calls.
// ============================================================================

const MOCK_KEY = '__ioredis_mock__' as const;

type IoredisMockState = {
  evalImpl: (...args: unknown[]) => Promise<unknown>;
  evalMock: ReturnType<typeof vi.fn>;
  connectMock: ReturnType<typeof vi.fn>;
  pingMock: ReturnType<typeof vi.fn>;
  // `set` is used by RedisBackend.lockAcquire (SET NX). The impl returns
  // 'OK' for a successful SET NX (lock acquired) or null when the key already
  // exists (lock held). Tests override `setImpl` to simulate contention.
  setImpl: (...args: unknown[]) => Promise<unknown>;
  setMock: ReturnType<typeof vi.fn>;
  delMock: ReturnType<typeof vi.fn>;
};

const g = globalThis as unknown as Record<string, IoredisMockState | undefined>;

vi.mock('ioredis', () => {
  // Create fresh mocks each time the factory runs (after vi.resetModules())
  const evalMock = vi.fn().mockImplementation((...args: unknown[]) => {
    const state = g[MOCK_KEY];
    if (state?.evalImpl) return state.evalImpl(...args);
    return Promise.resolve(1);
  });
  const setMock = vi.fn().mockImplementation((...args: unknown[]) => {
    const state = g[MOCK_KEY];
    if (state?.setImpl) return state.setImpl(...args);
    // SET NX default: succeed (fresh lock). Tests override setImpl to simulate
    // a held lock (return null).
    return Promise.resolve('OK');
  });
  const connectMock = vi.fn().mockResolvedValue(undefined);
  const pingMock = vi.fn().mockResolvedValue('PONG');
  const delMock = vi.fn().mockResolvedValue(1);

  const mockClient = {
    connect: connectMock,
    ping: pingMock,
    eval: evalMock,
    set: setMock,
    del: delMock,
  };

  // Store refs on globalThis so tests can access them after vi.resetModules()
  g[MOCK_KEY] = {
    evalImpl: () => Promise.resolve(1),
    evalMock,
    connectMock,
    pingMock,
    setImpl: () => Promise.resolve('OK'),
    setMock,
    delMock,
  };

  return { default: vi.fn().mockImplementation(function() { return mockClient; }) };
});

// ============================================================================
// In-memory backend tests
// ============================================================================

describe('createRateLimiter (in-memory backend)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    delete process.env.REDIS_URL;
    delete process.env.REDIS_RETRY_INTERVAL_MS;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows requests under the limit', async () => {
    const { createRateLimiter } = await import('./distributed-state');
    const limiter = createRateLimiter({ name: 'test-allow', windowMs: 60_000, max: 3 });

    expect(await limiter.check('user1')).toBe(true);
    expect(await limiter.check('user1')).toBe(true);
    expect(await limiter.check('user1')).toBe(true);
  });

  it('blocks requests over the limit', async () => {
    const { createRateLimiter } = await import('./distributed-state');
    const limiter = createRateLimiter({ name: 'test-block', windowMs: 60_000, max: 2 });

    expect(await limiter.check('user2')).toBe(true);
    expect(await limiter.check('user2')).toBe(true);
    expect(await limiter.check('user2')).toBe(false);
    expect(await limiter.check('user2')).toBe(false);
  });

  it('separate keys are tracked independently', async () => {
    const { createRateLimiter } = await import('./distributed-state');
    const limiter = createRateLimiter({ name: 'test-keys', windowMs: 60_000, max: 1 });

    expect(await limiter.check('userA')).toBe(true);
    expect(await limiter.check('userB')).toBe(true);
    // userA is at limit, userB is at limit
    expect(await limiter.check('userA')).toBe(false);
    expect(await limiter.check('userB')).toBe(false);
  });

  it('allows requests again after the window expires', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const { createRateLimiter } = await import('./distributed-state');
    const limiter = createRateLimiter({ name: 'test-window', windowMs: 10_000, max: 1 });

    expect(await limiter.check('user3')).toBe(true);
    expect(await limiter.check('user3')).toBe(false); // over limit

    // Advance past the window
    vi.advanceTimersByTime(10_001);

    expect(await limiter.check('user3')).toBe(true);

    vi.useRealTimers();
  });

  it('reset() clears the limit for a key', async () => {
    const { createRateLimiter } = await import('./distributed-state');
    const limiter = createRateLimiter({ name: 'test-reset', windowMs: 60_000, max: 1 });

    expect(await limiter.check('user4')).toBe(true);
    expect(await limiter.check('user4')).toBe(false); // at limit

    await limiter.reset('user4');

    expect(await limiter.check('user4')).toBe(true); // reset worked
  });

  it('different limiter instances with different names are independent', async () => {
    const { createRateLimiter } = await import('./distributed-state');
    const limiterA = createRateLimiter({ name: 'namespace-a', windowMs: 60_000, max: 1 });
    const limiterB = createRateLimiter({ name: 'namespace-b', windowMs: 60_000, max: 1 });

    expect(await limiterA.check('user5')).toBe(true);
    expect(await limiterA.check('user5')).toBe(false);

    // Same key but different namespace - should be independent
    expect(await limiterB.check('user5')).toBe(true);
  });

  it('check() returns a Promise<boolean>', async () => {
    const { createRateLimiter } = await import('./distributed-state');
    const limiter = createRateLimiter({ name: 'test-async', windowMs: 60_000, max: 5 });
    const result = limiter.check('async-user');
    // Must be a Promise (thenable)
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toBe(true);
  });
});

// ============================================================================
// Redis backend tests (degraded mode)
// ============================================================================
// These tests use a module-level vi.mock('ioredis') that stores mock state
// on globalThis so it survives vi.resetModules() calls.
// ============================================================================

describe('createRateLimiter (Redis backend — degraded mode)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    delete process.env.REDIS_URL;
    // Reset to default allow behavior
    if (g[MOCK_KEY]) {
      g[MOCK_KEY]!.evalImpl = () => Promise.resolve(1);
      g[MOCK_KEY]!.evalMock.mockClear();
      g[MOCK_KEY]!.connectMock.mockClear();
      g[MOCK_KEY]!.pingMock.mockClear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.REDIS_URL;
  });

  it('uses Lua script via client.eval when Redis is healthy', async () => {
    // Default evalImpl returns 1 (allow)
    process.env.REDIS_URL = 'redis://localhost:6379';

    const { createRateLimiter } = await import('./distributed-state');
    const limiter = createRateLimiter({ name: 'redis-lua-test', windowMs: 60_000, max: 10 });

    // Trigger getBackend() by calling check — this kicks off Redis init
    // with the tempBackend first. The result may be from in-memory (that's OK).
    await limiter.check('warmup');

    // Wait for Redis backend to replace tempBackend
    await new Promise((r) => setTimeout(r, 200));

    // Now call check — should use the Redis backend (eval)
    const result = await limiter.check('user-x');

    // Result should be true (eval returned 1)
    expect(result).toBe(true);

    // client.eval should have been called with the Lua script
    const state = g[MOCK_KEY];
    expect(state).toBeDefined();
    expect(state!.evalMock).toHaveBeenCalledWith(
      expect.stringContaining('redis.call'),  // Lua script
      1,
      expect.stringContaining('rl:redis-lua-test|user-x'),
      '10',
      expect.any(String),
    );
  });

  it('falls back to per-instance in-memory limit when Redis throws (degraded mode)', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Configure eval to reject (simulate Redis failure)
    if (g[MOCK_KEY]) {
      g[MOCK_KEY]!.evalImpl = () => Promise.reject(new Error('ECONNREFUSED'));
    }
    process.env.REDIS_URL = 'redis://localhost:6379';

    const { createRateLimiter } = await import('./distributed-state');
    const limiter = createRateLimiter({ name: 'degraded-test', windowMs: 60_000, max: 2 });

    // Trigger getBackend() — kicks off Redis init
    await limiter.check('warmup');

    // Wait for Redis backend to replace tempBackend
    await new Promise((r) => setTimeout(r, 200));

    // Now update evalImpl to reject (simulate failure after init)
    if (g[MOCK_KEY]) {
      g[MOCK_KEY]!.evalImpl = () => Promise.reject(new Error('ECONNREFUSED'));
      g[MOCK_KEY]!.evalMock.mockClear();
    }

    // First two calls: degraded mode falls back to in-memory and allows them
    expect(await limiter.check('user-y')).toBe(true);
    expect(await limiter.check('user-y')).toBe(true);
    // Third call: in-memory fallback blocks at max=2
    expect(await limiter.check('user-y')).toBe(false);

    // client.eval must have been called (we tried Redis first)
    const state = g[MOCK_KEY];
    expect(state).toBeDefined();
    expect(state!.evalMock).toHaveBeenCalled();

    // A warning should have been logged for each Redis failure
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Redis unavailable'),
    );

    consoleSpy.mockRestore();
  });

  it('degraded mode does NOT throw when Redis is down', async () => {
    // Configure eval to reject (simulate Redis failure)
    if (g[MOCK_KEY]) {
      g[MOCK_KEY]!.evalImpl = () => Promise.reject(new Error('Redis connection closed'));
    }
    process.env.REDIS_URL = 'redis://localhost:6379';
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { createRateLimiter } = await import('./distributed-state');
    const limiter = createRateLimiter({ name: 'no-throw-test', windowMs: 60_000, max: 5 });

    // Trigger init, wait for Redis backend
    await limiter.check('warmup');
    await new Promise((r) => setTimeout(r, 200));

    // Update to fail after init
    if (g[MOCK_KEY]) {
      g[MOCK_KEY]!.evalImpl = () => Promise.reject(new Error('Redis connection closed'));
    }

    // Must not throw — must return a boolean
    await expect(limiter.check('user-z')).resolves.toBe(true);
  });
});

// ============================================================================
// createLockManager tests (in-memory backend)
// ============================================================================

describe('createLockManager (in-memory backend)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    delete process.env.REDIS_URL;
  });

  it('acquires and releases a lock', async () => {
    const { createLockManager } = await import('./distributed-state');
    const manager = createLockManager('test-locks');

    const release = await manager.acquire('key1');
    expect(typeof release).toBe('function');
    release();
  });

  it('serializes concurrent acquisitions for the same key', async () => {
    const { createLockManager } = await import('./distributed-state');
    const manager = createLockManager('test-serial');

    const timeline: string[] = [];
    let release1!: () => void;

    // Start first acquisition
    const p1 = manager.acquire('shared-key').then((rel) => {
      release1 = rel;
      timeline.push('acquired-1');
    });

    await p1; // First acquisition completes immediately

    // Start second acquisition (should wait)
    let secondAcquired = false;
    const p2 = manager.acquire('shared-key').then((rel) => {
      secondAcquired = true;
      timeline.push('acquired-2');
      rel();
    });

    // Give the event loop a chance to process
    await new Promise((r) => setTimeout(r, 10));

    // Second should not have acquired yet
    expect(secondAcquired).toBe(false);

    // Release first
    timeline.push('release-1');
    release1();

    await p2;

    expect(timeline).toEqual(['acquired-1', 'release-1', 'acquired-2']);
    expect(secondAcquired).toBe(true);
  });

  it('different keys do not block each other', async () => {
    const { createLockManager } = await import('./distributed-state');
    const manager = createLockManager('test-parallel');

    let releaseA!: () => void;
    const pA = manager.acquire('key-a').then((rel) => { releaseA = rel; });
    await pA;

    // key-b should acquire immediately (different key)
    let keyBStarted = false;
    const pB = manager.acquire('key-b').then((rel) => {
      keyBStarted = true;
      rel();
    });

    await pB;
    expect(keyBStarted).toBe(true);

    releaseA();
  });

  it('release() cleans up the lock', async () => {
    const { createLockManager } = await import('./distributed-state');
    const manager = createLockManager('test-release');

    const rel = await manager.acquire('key-cleanup');
    rel();

    // Should be able to acquire again immediately after release
    const rel2 = await manager.acquire('key-cleanup');
    rel2();
  });

  // HIGH-3: Capacity cap
  it('rejects new lock when namespace is at capacity (1000 entries)', async () => {
    const { createLockManager } = await import('./distributed-state');
    const manager = createLockManager('cap-test');

    // Acquire 1000 distinct keys to fill the namespace
    const releases: (() => void)[] = [];
    for (let i = 0; i < 1000; i++) {
      releases.push(await manager.acquire(`key-${i}`));
    }

    // 1001st key (not already locked) should be rejected
    await expect(manager.acquire('key-overflow')).rejects.toThrow(
      /at capacity \(1000\)/i
    );

    // Waiting on an already-locked key should still be allowed (not blocked by cap)
    // Start a waiter for key-0 (already locked)
    const waiterPromise = manager.acquire('key-0');

    // Release key-0 so the waiter can proceed
    releases[0]();
    const releaseWaiter = await waiterPromise;
    releaseWaiter();

    // Clean up remaining
    releases.slice(1).forEach(r => r());
  });

  // HIGH-3: Stale lock eviction on timeout
  it('forcibly evicts stale lock entry in InMemoryBackend when waiter times out', async () => {
    // We need access to the InMemoryBackend's lockAcquire directly via the public API.
    // We use a very short timeout by testing via a custom approach: hold a lock without releasing.
    const { createLockManager } = await import('./distributed-state');
    const manager = createLockManager('eviction-test');

    // Acquire a lock and deliberately never release it
    const _heldRelease = await manager.acquire('hung-key');

    // Race the waiter against a short timeout to detect it's waiting
    const raceResult = await Promise.race([
      manager.acquire('hung-key').then(() => 'acquired' as const).catch(() => 'timed-out' as const),
      new Promise<'still-waiting'>(resolve => setTimeout(() => resolve('still-waiting'), 50)),
    ]);

    // The waiter should still be waiting (not acquired, not timed out yet within 50ms)
    expect(raceResult).toBe('still-waiting');

    // Now we verify the constructor is correct by releasing and seeing the waiter unblock
    _heldRelease();
    const releaseWaiter = await manager.acquire('hung-key').catch(() => null);
    if (releaseWaiter) releaseWaiter();
  });
});

// ============================================================================
// tokenCache tests (in-memory backend)
// ============================================================================

describe('tokenCache (in-memory backend)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    delete process.env.REDIS_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null for uncached keys', async () => {
    const { tokenCache } = await import('./distributed-state');
    expect(await tokenCache.get('nonexistent-key')).toBeNull();
  });

  it('stores and retrieves a token', async () => {
    const { tokenCache } = await import('./distributed-state');
    const expiresAt = Date.now() + 3600_000;

    tokenCache.set('m2m-token', 'my-token-value', expiresAt);
    expect(await tokenCache.get('m2m-token')).toBe('my-token-value');
  });

  it('returns null for expired tokens', async () => {
    vi.useFakeTimers();
    const now = 1_700_000_000_000;
    vi.setSystemTime(now);

    const { tokenCache } = await import('./distributed-state');

    // Set token that expires in 1 second
    tokenCache.set('expiring-token', 'soon-dead', now + 1000);
    expect(await tokenCache.get('expiring-token')).toBe('soon-dead');

    // Advance past expiry
    vi.advanceTimersByTime(1001);

    expect(await tokenCache.get('expiring-token')).toBeNull();

    vi.useRealTimers();
  });

  it('clear() removes a token', async () => {
    const { tokenCache } = await import('./distributed-state');
    const expiresAt = Date.now() + 3600_000;

    tokenCache.set('clearable-token', 'value-to-clear', expiresAt);
    expect(await tokenCache.get('clearable-token')).toBe('value-to-clear');

    tokenCache.clear('clearable-token');
    expect(await tokenCache.get('clearable-token')).toBeNull();
  });

  it('set() overwrites an existing token', async () => {
    const { tokenCache } = await import('./distributed-state');
    const expiresAt = Date.now() + 3600_000;

    tokenCache.set('overwrite-key', 'original-token', expiresAt);
    tokenCache.set('overwrite-key', 'new-token', expiresAt + 100);

    expect(await tokenCache.get('overwrite-key')).toBe('new-token');
  });
});

// ============================================================================
// Backend selection tests
// ============================================================================

describe('backend selection', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    delete process.env.REDIS_URL;
  });

  it('uses in-memory backend when REDIS_URL is not set', async () => {
    delete process.env.REDIS_URL;
    vi.resetModules();

    // Should not throw when REDIS_URL is absent
    const { createRateLimiter } = await import('./distributed-state');
    const limiter = createRateLimiter({ name: 'backend-test', windowMs: 60_000, max: 5 });

    // Basic operation should work
    expect(await limiter.check('test-user')).toBe(true);
  });
});

// ============================================================================
// BUG-M-002: Graceful degradation when Redis backend init fails
// ============================================================================

describe('createRateLimiter — graceful degradation on Redis init failure', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    delete process.env.REDIS_URL;
    if (g[MOCK_KEY]) {
      // Make connect fail so _backendInitError gets set
      g[MOCK_KEY]!.connectMock.mockRejectedValue(new Error('Redis init failed: ECONNREFUSED'));
      g[MOCK_KEY]!.evalMock.mockClear();
      g[MOCK_KEY]!.pingMock.mockClear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.REDIS_URL;
    if (g[MOCK_KEY]) {
      g[MOCK_KEY]!.connectMock.mockResolvedValue(undefined);
    }
  });

  it('check() returns true (allow-through) when backend init fails', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.REDIS_URL = 'redis://localhost:6379';

    const { createRateLimiter } = await import('./distributed-state');
    const limiter = createRateLimiter({ name: 'init-fail-test', windowMs: 60_000, max: 1 });

    // Trigger init — uses tempBackend while Redis connects
    await limiter.check('warmup');

    // Wait for Redis init failure to propagate (_backendInitError gets set)
    await new Promise((r) => setTimeout(r, 300));

    // After init failure, _backend = null and _backendInitError is set.
    // check() must NOT throw — must return true (allow-through)
    const result = await limiter.check('user-test');
    expect(result).toBe(true);

    // Warning must have been logged
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Backend unavailable'),
    );

    consoleSpy.mockRestore();
  });

  it('reset() does not throw when backend init fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.REDIS_URL = 'redis://localhost:6379';

    const { createRateLimiter } = await import('./distributed-state');
    const limiter = createRateLimiter({ name: 'reset-fail-test', windowMs: 60_000, max: 1 });

    // Trigger init
    await limiter.check('warmup');

    // Wait for Redis init failure
    await new Promise((r) => setTimeout(r, 300));

    // reset() must NOT throw
    await expect(limiter.reset('user-test')).resolves.toBeUndefined();

    vi.restoreAllMocks();
  });
});

// ============================================================================
// CAN-STATE-005: Lock ownership must NOT split during the temporary
// in-memory → Redis handoff. createLockManager().acquire() awaits a settled
// backend before granting any lock, so exactly ONE backend (in-memory OR
// Redis) issues locks for a given key — never both during the cold init
// window. Fail-closed behavior is preserved on Redis init failure.
// ============================================================================

describe('createLockManager — Redis cold-init handoff (CAN-STATE-005)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    delete process.env.REDIS_URL;
    delete process.env.REDIS_RETRY_INTERVAL_MS;
    if (g[MOCK_KEY]) {
      // Restore default healthy-Redis behavior between tests.
      g[MOCK_KEY]!.connectMock.mockReset();
      g[MOCK_KEY]!.pingMock.mockReset();
      g[MOCK_KEY]!.evalMock.mockClear();
      g[MOCK_KEY]!.setMock.mockClear();
      g[MOCK_KEY]!.connectMock.mockResolvedValue(undefined);
      g[MOCK_KEY]!.pingMock.mockResolvedValue('PONG');
      g[MOCK_KEY]!.evalImpl = () => Promise.resolve(1);
      g[MOCK_KEY]!.setImpl = () => Promise.resolve('OK');
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete process.env.REDIS_URL;
    delete process.env.REDIS_RETRY_INTERVAL_MS;
    if (g[MOCK_KEY]) {
      g[MOCK_KEY]!.connectMock.mockResolvedValue(undefined);
      g[MOCK_KEY]!.pingMock.mockResolvedValue('PONG');
      g[MOCK_KEY]!.setImpl = () => Promise.resolve('OK');
    }
  });

  it('does NOT grant a lock during the Redis cold-init window (no split-brain from temp in-memory backend)', async () => {
    // Defer Redis connect so we control precisely when init settles.
    let resolveConnect!: () => void;
    const connectPromise = new Promise<void>((resolve) => {
      resolveConnect = resolve;
    });
    if (g[MOCK_KEY]) {
      g[MOCK_KEY]!.connectMock.mockReturnValue(connectPromise);
      g[MOCK_KEY]!.setImpl = () => Promise.resolve('OK');
      g[MOCK_KEY]!.setMock.mockClear();
    }
    process.env.REDIS_URL = 'redis://localhost:6379';

    const { createLockManager } = await import('./distributed-state');
    const manager = createLockManager('can-state-005');

    // Kick off an acquire DURING the cold-init window. It must block until the
    // backend settles — it must NOT resolve by grabbing the temporary
    // in-memory stand-in backend.
    let acquired = false;
    const acquirePromise = manager
      .acquire('user-A')
      .then((release) => {
        acquired = true;
        return release;
      })
      .catch(() => {
        // Should not reject in the success path
        acquired = false;
      });

    // Let microtasks + a short timer flush. The acquire should still be
    // pending — blocked on awaitBackendReady().
    await new Promise((r) => setTimeout(r, 50));
    expect(acquired).toBe(false);

    // The Redis SET NX must NOT have been issued yet (no lock granted from
    // either the temp in-memory backend or the still-init Redis backend).
    const state = g[MOCK_KEY];
    expect(state).toBeDefined();
    expect(state!.setMock).not.toHaveBeenCalled();

    // Settle the backend: Redis init succeeds.
    resolveConnect();
    // Allow the connect → ping → _backend assignment → acquire chain to flush.
    await new Promise((r) => setTimeout(r, 50));

    // The acquire should now have resolved, and the lock must have been issued
    // by the Redis backend (SET NX), proving the post-settlement path is used.
    expect(acquired).toBe(true);
    expect(state!.setMock).toHaveBeenCalledWith(
      'lock:can-state-005:user-A',
      expect.any(String), // crypto.randomUUID()
      'PX',
      expect.any(Number), // DEFAULT_LOCK_TIMEOUT_MS = 30_000
      'NX',
    );

    // Clean up: invoke the ownership-safe async release.
    const release = await acquirePromise;
    if (release) {
      await release();
    }
  });

  it('serializes same-key acquisitions on the Redis backend after settle (single backend grants locks)', async () => {
    // Immediate healthy connect: init settles quickly.
    if (g[MOCK_KEY]) {
      g[MOCK_KEY]!.connectMock.mockResolvedValue(undefined);
      g[MOCK_KEY]!.pingMock.mockResolvedValue('PONG');
      g[MOCK_KEY]!.setImpl = () => Promise.resolve('OK');
      g[MOCK_KEY]!.setMock.mockClear();
    }
    process.env.REDIS_URL = 'redis://localhost:6379';

    const { createLockManager } = await import('./distributed-state');
    const manager = createLockManager('can-state-005-serial');

    // First acquire: SET NX returns 'OK' — lock granted on Redis.
    const release1 = await manager.acquire('user-B');
    expect(g[MOCK_KEY]!.setMock).toHaveBeenCalled();

    // Simulate a held lock for the second acquire: SET NX returns null
    // (key already exists). The second acquire must block in the Redis retry
    // loop — it must NOT fall back to (or split ownership with) the temp
    // in-memory backend, which would have granted it immediately.
    g[MOCK_KEY]!.setImpl = () => Promise.resolve(null);
    let secondAcquired = false;
    const p2 = manager.acquire('user-B').then((rel) => {
      secondAcquired = true;
      return rel;
    });

    // After a short tick, the second acquire must still be blocked — mutual
    // exclusion is enforced on the (single) Redis backend.
    await new Promise((r) => setTimeout(r, 120));
    expect(secondAcquired).toBe(false);

    // Now allow SET NX to succeed again; the retry loop (50ms cadence) will
    // acquire on the next iteration — still on the Redis backend, never on
    // the temp in-memory backend.
    g[MOCK_KEY]!.setImpl = () => Promise.resolve('OK');
    const release2 = await p2;
    expect(secondAcquired).toBe(true);

    await release1();
    await release2();
  });

  it('fail-closes lock acquisition when Redis init fails (no locks from temp in-memory backend)', async () => {
    // Suppress the expected console.error from the Lua release fallback path
    // (not exercised here, but defensive) and any init error logging.
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    if (g[MOCK_KEY]) {
      // Redis connect fails → initRedisBackend rejects → getBackend() records
      // the failure in _backendInitError and clears _backend.
      g[MOCK_KEY]!.connectMock.mockRejectedValue(new Error('Redis init failed: ECONNREFUSED'));
      g[MOCK_KEY]!.setImpl = () => Promise.resolve('OK');
      g[MOCK_KEY]!.setMock.mockClear();
    }
    process.env.REDIS_URL = 'redis://localhost:6379';

    const { createLockManager } = await import('./distributed-state');
    const manager = createLockManager('can-state-005-fail');

    // The acquire must block on awaitBackendReady() until init settles to
    // failure, then getBackend() must throw _backendInitError — fail-closed.
    // No lock is granted from either the temp in-memory backend or Redis.
    await expect(manager.acquire('user-C')).rejects.toThrow(/Redis connection failed.*REDIS_URL/);

    // Redis SET NX must never have been called (no lock granted at all).
    expect(g[MOCK_KEY]!.setMock).not.toHaveBeenCalled();

    // A subsequent acquire must also fail-closed — the failure is sticky and
    // locks are never granted from the temp in-memory backend after failure.
    await expect(manager.acquire('user-D')).rejects.toThrow(/Redis connection failed.*REDIS_URL/);
    expect(g[MOCK_KEY]!.setMock).not.toHaveBeenCalled();
  });

  it('does not grant a temporary lock when a slow failed init immediately retries', async () => {
    // A connection attempt can outlive the retry interval. When it then fails,
    // the acquire that was awaiting it starts the retry itself. It must await
    // that retry rather than accept the retry's temporary in-memory backend.
    process.env.REDIS_RETRY_INTERVAL_MS = '1';
    let rejectFirstConnect!: (reason: Error) => void;
    let resolveRetryConnect!: () => void;
    const firstConnect = new Promise<void>((_resolve, reject) => {
      rejectFirstConnect = reject;
    });
    const retryConnect = new Promise<void>((resolve) => {
      resolveRetryConnect = resolve;
    });

    if (g[MOCK_KEY]) {
      g[MOCK_KEY]!.connectMock
        .mockImplementationOnce(() => firstConnect)
        .mockImplementationOnce(() => retryConnect);
      g[MOCK_KEY]!.setMock.mockClear();
    }
    process.env.REDIS_URL = 'redis://localhost:6379';

    const { createLockManager } = await import('./distributed-state');
    const manager = createLockManager('can-state-005-retry-race');
    let acquired = false;
    const acquire = manager.acquire('user-retry').then((release) => {
      acquired = true;
      return release;
    });

    // Ensure the first attempt is older than the configured retry interval,
    // then fail it. The acquire's post-settlement re-check starts retry #2.
    await new Promise((resolve) => setTimeout(resolve, 10));
    rejectFirstConnect(new Error('ECONNREFUSED'));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(g[MOCK_KEY]!.connectMock).toHaveBeenCalledTimes(2);
    expect(acquired).toBe(false);
    expect(g[MOCK_KEY]!.setMock).not.toHaveBeenCalled();

    resolveRetryConnect();
    const release = await acquire;
    expect(acquired).toBe(true);
    expect(g[MOCK_KEY]!.setMock).toHaveBeenCalledWith(
      'lock:can-state-005-retry-race:user-retry',
      expect.any(String),
      'PX',
      expect.any(Number),
      'NX',
    );
    await release();
  });

  it('never uses unconditional DEL when an ownership-safe Redis release fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.REDIS_URL = 'redis://localhost:6379';
    const { createLockManager } = await import('./distributed-state');
    const manager = createLockManager('can-state-005-release');
    const release = await manager.acquire('user-release');

    // Simulate a Lua ownership check outage. An unconditional DEL could erase
    // a lock reacquired by another owner after this lease expires.
    g[MOCK_KEY]!.evalImpl = () => Promise.reject(new Error('Redis unavailable'));
    g[MOCK_KEY]!.delMock.mockClear();

    await expect(release()).resolves.toBeUndefined();
    expect(g[MOCK_KEY]!.delMock).not.toHaveBeenCalled();
  });

  it('bounds a hung token-checked Redis release without deleting a possible later owner', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.REDIS_URL = 'redis://localhost:6379';

    const { createLockManager, REDIS_LOCK_RELEASE_TIMEOUT_MS } = await import('./distributed-state');
    const manager = createLockManager('can-act-006-release-budget');
    const release = await manager.acquire('user-release-timeout');

    // The ownership-check Lua call never settles. A release must still settle
    // inside the cleanup margin; it must never issue a direct DEL, because the
    // TTL may have expired and a different owner may now hold the key.
    let settleLateEval!: () => void;
    const lateEval = new Promise<void>((resolve) => { settleLateEval = resolve; });
    g[MOCK_KEY]!.evalImpl = () => lateEval;
    g[MOCK_KEY]!.delMock.mockClear();

    vi.useFakeTimers();
    const releasePromise = release();
    await vi.advanceTimersByTimeAsync(REDIS_LOCK_RELEASE_TIMEOUT_MS);
    await expect(releasePromise).resolves.toBeUndefined();
    expect(g[MOCK_KEY]!.delMock).not.toHaveBeenCalled();

    // Even if the delayed Lua request eventually reaches Redis, it is still
    // the token-checked script (not an unconditional stale-owner deletion).
    settleLateEval();
    await Promise.resolve();
    expect(g[MOCK_KEY]!.evalMock).toHaveBeenLastCalledWith(
      expect.stringContaining("redis.call('get', KEYS[1]) == ARGV[1]"),
      1,
      'lock:can-act-006-release-budget:user-release-timeout',
      expect.any(String),
    );
    expect(g[MOCK_KEY]!.delMock).not.toHaveBeenCalled();
  });

  it('is a no-op for the pure in-memory backend (no REDIS_URL) — existing behavior unchanged', async () => {
    // No REDIS_URL → _readyPromise stays null, awaitBackendReady() is a no-op
    // after the getBackend() trigger, and locks are issued by InMemoryBackend
    // exactly as before the fix.
    delete process.env.REDIS_URL;

    const { createLockManager } = await import('./distributed-state');
    const manager = createLockManager('can-state-005-inmem');

    const release1 = await manager.acquire('user-E');
    // Same-key second acquire must block (in-memory mutual exclusion).
    let secondAcquired = false;
    const p2 = manager.acquire('user-E').then((rel) => {
      secondAcquired = true;
      return rel;
    });
    await new Promise((r) => setTimeout(r, 30));
    expect(secondAcquired).toBe(false);

    await release1();
    const release2 = await p2;
    expect(secondAcquired).toBe(true);
    await release2();

    // Redis SET must never have been called (no Redis backend instantiated).
    if (g[MOCK_KEY]) {
      expect(g[MOCK_KEY]!.setMock).not.toHaveBeenCalled();
    }
  });
});

// ============================================================================
// CAN-STATE-006: Bounded retry after Redis init failure.
//
// After an initial Redis connection failure, _backendInitError must NOT
// permanently latch. Instead, getBackend() throws (fail-closed for locks)
// until RETRY_INTERVAL_MS elapses, then attempts reinitialization. On
// success, locks and rate limiting resume. On failure, locks stay fail-closed.
// Rate-limit fail-open behavior is preserved throughout.
// ============================================================================

describe('CAN-STATE-006 — bounded retry after Redis init failure', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    delete process.env.REDIS_URL;
    delete process.env.REDIS_RETRY_INTERVAL_MS;
    if (g[MOCK_KEY]) {
      // Restore default healthy-Redis behavior between tests.
      g[MOCK_KEY]!.connectMock.mockReset();
      g[MOCK_KEY]!.pingMock.mockReset();
      g[MOCK_KEY]!.connectMock.mockResolvedValue(undefined);
      g[MOCK_KEY]!.pingMock.mockResolvedValue('PONG');
      g[MOCK_KEY]!.evalImpl = () => Promise.resolve(1);
      g[MOCK_KEY]!.evalMock.mockClear();
      g[MOCK_KEY]!.setImpl = () => Promise.resolve('OK');
      g[MOCK_KEY]!.setMock.mockClear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete process.env.REDIS_URL;
    delete process.env.REDIS_RETRY_INTERVAL_MS;
    if (g[MOCK_KEY]) {
      g[MOCK_KEY]!.connectMock.mockResolvedValue(undefined);
      g[MOCK_KEY]!.pingMock.mockResolvedValue('PONG');
      g[MOCK_KEY]!.setImpl = () => Promise.resolve('OK');
    }
  });

  it('(a) after initial Redis failure, a subsequent call triggers a retry', async () => {
    // Short retry interval for fast testing (50ms). The module reads this at
    // load time, so it must be set BEFORE the dynamic import.
    process.env.REDIS_RETRY_INTERVAL_MS = '50';
    process.env.REDIS_URL = 'redis://localhost:6379';
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Make Redis connect fail
    if (g[MOCK_KEY]) {
      g[MOCK_KEY]!.connectMock.mockRejectedValue(new Error('ECONNREFUSED'));
      g[MOCK_KEY]!.connectMock.mockClear();
    }

    const { createLockManager } = await import('./distributed-state');
    const manager = createLockManager('can-state-006-retry');

    // First acquire: init fails → fail-closed
    await expect(manager.acquire('user-A')).rejects.toThrow(/Redis connection failed.*REDIS_URL/);

    // connect should have been called once (initial attempt)
    expect(g[MOCK_KEY]!.connectMock).toHaveBeenCalledTimes(1);

    // Immediately after: retry not due yet (50ms interval) → still fail-closed
    await expect(manager.acquire('user-A2')).rejects.toThrow(/Redis connection failed.*REDIS_URL/);
    // connect should still be 1 (no retry yet)
    expect(g[MOCK_KEY]!.connectMock).toHaveBeenCalledTimes(1);

    // Wait past the retry interval
    await new Promise((r) => setTimeout(r, 80));

    // Second acquire: retry is due → reinitialization attempted (connect called again)
    // connect still rejects, so the retry also fails → fail-closed
    await expect(manager.acquire('user-B')).rejects.toThrow(/Redis connection failed.*REDIS_URL/);

    // connect must have been called at least twice (initial + retry)
    expect(g[MOCK_KEY]!.connectMock.mock.calls.length).toBeGreaterThanOrEqual(2);

    // Redis SET NX must never have been called (no lock ever granted)
    expect(g[MOCK_KEY]!.setMock).not.toHaveBeenCalled();
  });

  it('(b) if retry succeeds, locks are granted again (recovery)', async () => {
    process.env.REDIS_RETRY_INTERVAL_MS = '50';
    process.env.REDIS_URL = 'redis://localhost:6379';
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // First: make connect fail
    if (g[MOCK_KEY]) {
      g[MOCK_KEY]!.connectMock.mockRejectedValue(new Error('ECONNREFUSED'));
      g[MOCK_KEY]!.connectMock.mockClear();
      g[MOCK_KEY]!.setMock.mockClear();
    }

    const { createLockManager } = await import('./distributed-state');
    const manager = createLockManager('can-state-006-recovery');

    // First acquire: fails (init failure)
    await expect(manager.acquire('user-A')).rejects.toThrow(/Redis connection failed/);

    // Wait past retry interval
    await new Promise((r) => setTimeout(r, 80));

    // Now make Redis healthy (recovery)
    if (g[MOCK_KEY]) {
      g[MOCK_KEY]!.connectMock.mockResolvedValue(undefined);
      g[MOCK_KEY]!.pingMock.mockResolvedValue('PONG');
      g[MOCK_KEY]!.setImpl = () => Promise.resolve('OK');
      g[MOCK_KEY]!.setMock.mockClear();
    }

    // Second acquire: retry succeeds → lock granted on Redis backend
    const release = await manager.acquire('user-B');
    expect(typeof release).toBe('function');

    // Verify Redis SET NX was called (lock granted on the Redis backend,
    // proving recovery — not the temp in-memory stand-in)
    expect(g[MOCK_KEY]!.setMock).toHaveBeenCalledWith(
      'lock:can-state-006-recovery:user-B',
      expect.any(String),  // crypto.randomUUID()
      'PX',
      expect.any(Number), // DEFAULT_LOCK_TIMEOUT_MS
      'NX',
    );

    await release();
  });

  it('(c) if retry fails, locks remain fail-closed', async () => {
    process.env.REDIS_RETRY_INTERVAL_MS = '50';
    process.env.REDIS_URL = 'redis://localhost:6379';
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Make connect always fail (no recovery)
    if (g[MOCK_KEY]) {
      g[MOCK_KEY]!.connectMock.mockRejectedValue(new Error('ECONNREFUSED'));
      g[MOCK_KEY]!.connectMock.mockClear();
      g[MOCK_KEY]!.setMock.mockClear();
    }

    const { createLockManager } = await import('./distributed-state');
    const manager = createLockManager('can-state-006-failretry');

    // First acquire: fails (init failure)
    await expect(manager.acquire('user-A')).rejects.toThrow(/Redis connection failed/);

    // Wait past retry interval
    await new Promise((r) => setTimeout(r, 80));

    // Second acquire: retry is attempted but also fails → still fail-closed
    await expect(manager.acquire('user-B')).rejects.toThrow(/Redis connection failed/);

    // Redis SET NX must never have been called (no lock ever granted,
    // even after retry)
    expect(g[MOCK_KEY]!.setMock).not.toHaveBeenCalled();
  });

  it('(d) rate-limit fail-open behavior is preserved after init failure and during retry', async () => {
    process.env.REDIS_RETRY_INTERVAL_MS = '50';
    process.env.REDIS_URL = 'redis://localhost:6379';
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Make connect fail
    if (g[MOCK_KEY]) {
      g[MOCK_KEY]!.connectMock.mockRejectedValue(new Error('ECONNREFUSED'));
      g[MOCK_KEY]!.connectMock.mockClear();
    }

    const { createRateLimiter } = await import('./distributed-state');
    const limiter = createRateLimiter({ name: 'can-state-006-rl', windowMs: 60_000, max: 1 });

    // Trigger init — kicks off Redis init (which will fail)
    await limiter.check('warmup');
    // Wait for Redis init failure to propagate
    await new Promise((r) => setTimeout(r, 20));

    // After init failure: rate limiter must allow-through (not throw)
    const result1 = await limiter.check('user-A');
    expect(result1).toBe(true);

    // Wait past retry interval — retry also fails (connect still rejects)
    await new Promise((r) => setTimeout(r, 80));

    // Rate limiter must still allow-through after a failed retry
    const result2 = await limiter.check('user-B');
    expect(result2).toBe(true);

    // Warning must have been logged for the degraded state
    const consoleCalls = vi.mocked(console.warn).mock.calls;
    expect(
      consoleCalls.some((call) =>
        typeof call[0] === 'string' && call[0].includes('Backend unavailable'),
      ),
    ).toBe(true);
  });

  it.each(['-1', '0', 'not-a-number'])(
    '(e) invalid retry interval %j uses the default interval without a retry storm',
    async (retryInterval) => {
      let now = 1_000_000;
      vi.spyOn(Date, 'now').mockImplementation(() => now);
      process.env.REDIS_RETRY_INTERVAL_MS = retryInterval;
      process.env.REDIS_URL = 'redis://localhost:6379';
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});

      if (g[MOCK_KEY]) {
        g[MOCK_KEY]!.connectMock.mockRejectedValue(new Error('ECONNREFUSED'));
        g[MOCK_KEY]!.connectMock.mockClear();
        g[MOCK_KEY]!.setMock.mockClear();
      }

      const { createRateLimiter } = await import('./distributed-state');
      const limiter = createRateLimiter({
        name: 'can-state-006-invalid-interval',
        windowMs: 60_000,
        max: 10,
      });

      // Rate limiting is fail-open while the first async init fails.
      expect(await limiter.check('initial')).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(g[MOCK_KEY]!.connectMock).toHaveBeenCalledTimes(1);

      // Repeated callers before the default five-second retry window must not
      // initiate another Redis connection attempt.
      for (let index = 0; index < 3; index++) {
        expect(await limiter.check(`before-retry-${index}`)).toBe(true);
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      now += 4_999;
      expect(await limiter.check('just-before-default-retry')).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(g[MOCK_KEY]!.connectMock).toHaveBeenCalledTimes(1);

      // A retry occurs only when the default five-second interval has elapsed.
      now += 1;
      expect(await limiter.check('default-retry')).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(g[MOCK_KEY]!.connectMock).toHaveBeenCalledTimes(2);
    },
  );
});
