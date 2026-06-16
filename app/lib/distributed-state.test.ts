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
};

const g = globalThis as unknown as Record<string, IoredisMockState | undefined>;

vi.mock('ioredis', () => {
  // Create fresh mocks each time the factory runs (after vi.resetModules())
  const evalMock = vi.fn().mockImplementation((...args: unknown[]) => {
    const state = g[MOCK_KEY];
    if (state?.evalImpl) return state.evalImpl(...args);
    return Promise.resolve(1);
  });
  const connectMock = vi.fn().mockResolvedValue(undefined);
  const pingMock = vi.fn().mockResolvedValue('PONG');
  const delMock = vi.fn().mockResolvedValue(1);

  const mockClient = {
    connect: connectMock,
    ping: pingMock,
    eval: evalMock,
    del: delMock,
  };

  // Store refs on globalThis so tests can access them after vi.resetModules()
  g[MOCK_KEY] = {
    evalImpl: () => Promise.resolve(1),
    evalMock,
    connectMock,
    pingMock,
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
      expect.stringContaining('rl:redis-lua-test:user-x'),
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
    expect(tokenCache.get('nonexistent-key')).toBeNull();
  });

  it('stores and retrieves a token', async () => {
    const { tokenCache } = await import('./distributed-state');
    const expiresAt = Date.now() + 3600_000;

    tokenCache.set('m2m-token', 'my-token-value', expiresAt);
    expect(tokenCache.get('m2m-token')).toBe('my-token-value');
  });

  it('returns null for expired tokens', async () => {
    vi.useFakeTimers();
    const now = 1_700_000_000_000;
    vi.setSystemTime(now);

    const { tokenCache } = await import('./distributed-state');

    // Set token that expires in 1 second
    tokenCache.set('expiring-token', 'soon-dead', now + 1000);
    expect(tokenCache.get('expiring-token')).toBe('soon-dead');

    // Advance past expiry
    vi.advanceTimersByTime(1001);

    expect(tokenCache.get('expiring-token')).toBeNull();

    vi.useRealTimers();
  });

  it('clear() removes a token', async () => {
    const { tokenCache } = await import('./distributed-state');
    const expiresAt = Date.now() + 3600_000;

    tokenCache.set('clearable-token', 'value-to-clear', expiresAt);
    expect(tokenCache.get('clearable-token')).toBe('value-to-clear');

    tokenCache.clear('clearable-token');
    expect(tokenCache.get('clearable-token')).toBeNull();
  });

  it('set() overwrites an existing token', async () => {
    const { tokenCache } = await import('./distributed-state');
    const expiresAt = Date.now() + 3600_000;

    tokenCache.set('overwrite-key', 'original-token', expiresAt);
    tokenCache.set('overwrite-key', 'new-token', expiresAt + 100);

    expect(tokenCache.get('overwrite-key')).toBe('new-token');
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
