import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// distributed-state module tests
// ============================================================================
// Tests createRateLimiter, createLockManager, and tokenCache.
// Uses the in-memory backend (no REDIS_URL set).
// ============================================================================

// Ensure REDIS_URL is not set so we use the in-memory backend.
// vi.resetModules() in beforeEach ensures a fresh backend each test suite.

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

    expect(limiter.check('user1')).toBe(true);
    expect(limiter.check('user1')).toBe(true);
    expect(limiter.check('user1')).toBe(true);
  });

  it('blocks requests over the limit', async () => {
    const { createRateLimiter } = await import('./distributed-state');
    const limiter = createRateLimiter({ name: 'test-block', windowMs: 60_000, max: 2 });

    expect(limiter.check('user2')).toBe(true);
    expect(limiter.check('user2')).toBe(true);
    expect(limiter.check('user2')).toBe(false);
    expect(limiter.check('user2')).toBe(false);
  });

  it('separate keys are tracked independently', async () => {
    const { createRateLimiter } = await import('./distributed-state');
    const limiter = createRateLimiter({ name: 'test-keys', windowMs: 60_000, max: 1 });

    expect(limiter.check('userA')).toBe(true);
    expect(limiter.check('userB')).toBe(true);
    // userA is at limit, userB is at limit
    expect(limiter.check('userA')).toBe(false);
    expect(limiter.check('userB')).toBe(false);
  });

  it('allows requests again after the window expires', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const { createRateLimiter } = await import('./distributed-state');
    const limiter = createRateLimiter({ name: 'test-window', windowMs: 10_000, max: 1 });

    expect(limiter.check('user3')).toBe(true);
    expect(limiter.check('user3')).toBe(false); // over limit

    // Advance past the window
    vi.advanceTimersByTime(10_001);

    expect(limiter.check('user3')).toBe(true);

    vi.useRealTimers();
  });

  it('reset() clears the limit for a key', async () => {
    const { createRateLimiter } = await import('./distributed-state');
    const limiter = createRateLimiter({ name: 'test-reset', windowMs: 60_000, max: 1 });

    expect(limiter.check('user4')).toBe(true);
    expect(limiter.check('user4')).toBe(false); // at limit

    limiter.reset('user4');

    expect(limiter.check('user4')).toBe(true); // reset worked
  });

  it('different limiter instances with different names are independent', async () => {
    const { createRateLimiter } = await import('./distributed-state');
    const limiterA = createRateLimiter({ name: 'namespace-a', windowMs: 60_000, max: 1 });
    const limiterB = createRateLimiter({ name: 'namespace-b', windowMs: 60_000, max: 1 });

    expect(limiterA.check('user5')).toBe(true);
    expect(limiterA.check('user5')).toBe(false);

    // Same key but different namespace - should be independent
    expect(limiterB.check('user5')).toBe(true);
  });
});

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
});

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
    expect(limiter.check('test-user')).toBe(true);
  });
});
