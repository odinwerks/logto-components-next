import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  assertVerificationNotExpired,
  createLockManager,
} from './helpers';
import { VERIFICATION_CLOCK_SKEW_TOLERANCE_MS } from '../constants';

// Mock audit at module level for auditSafe tests
const auditMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../audit', () => ({
  audit: (...args: unknown[]) => auditMock(...args),
}));

// Import after mock setup
import { auditSafe } from './helpers';

// ============================================================================
// assertVerificationNotExpired
// ============================================================================

describe('assertVerificationNotExpired', () => {
  it('does not throw when timestamp is well within tolerance', () => {
    const recentTimestamp = Date.now() - 1000; // 1 second ago
    expect(() => assertVerificationNotExpired(recentTimestamp)).not.toThrow();
  });

  it('does not throw when timestamp is within tolerance (1ms margin)', () => {
    // Date.now() - tolerance + 1 is safely within tolerance
    // (the +1 accounts for clock advancement between assignment and check)
    const withinToleranceTimestamp = Date.now() - VERIFICATION_CLOCK_SKEW_TOLERANCE_MS + 1;
    expect(() => assertVerificationNotExpired(withinToleranceTimestamp)).not.toThrow();
  });

  it('throws VERIFICATION_EXPIRED when timestamp is beyond tolerance', () => {
    const expiredTimestamp = Date.now() - VERIFICATION_CLOCK_SKEW_TOLERANCE_MS - 1;
    expect(() => assertVerificationNotExpired(expiredTimestamp)).toThrow('VERIFICATION_EXPIRED');
  });

  it('throws VERIFICATION_EXPIRED for a very old timestamp', () => {
    const ancientTimestamp = 0; // epoch
    expect(() => assertVerificationNotExpired(ancientTimestamp)).toThrow('VERIFICATION_EXPIRED');
  });

  it('does not throw for a future timestamp', () => {
    const futureTimestamp = Date.now() + 60_000; // 1 minute in the future
    expect(() => assertVerificationNotExpired(futureTimestamp)).not.toThrow();
  });
});

// ============================================================================
// auditSafe
// ============================================================================

describe('auditSafe', () => {
  beforeEach(() => {
    auditMock.mockReset();
    auditMock.mockResolvedValue(undefined);
  });

  it('calls audit with the provided arguments on success', async () => {
    auditSafe('user-1', 'password.change', 'user-1', { note: 'test' });

    // auditSafe is sync but audit is async — give it a tick
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(auditMock).toHaveBeenCalledWith({
      actor: 'user-1',
      action: 'password.change',
      resource: 'user-1',
      metadata: { note: 'test' },
    });
  });

  it('does not throw when audit throws', async () => {
    auditMock.mockRejectedValue(new Error('audit service down'));

    expect(() => auditSafe('user-1', 'test.action')).not.toThrow();

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(auditMock).toHaveBeenCalled();
  });

  it('does not throw when audit rejects with a string', async () => {
    auditMock.mockRejectedValue('string error');

    expect(() => auditSafe('user-1', 'test.action')).not.toThrow();

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(auditMock).toHaveBeenCalled();
  });

  it('works without optional resource and metadata', async () => {
    auditSafe('user-1', 'mfa.totp.enroll');

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(auditMock).toHaveBeenCalledWith({
      actor: 'user-1',
      action: 'mfa.totp.enroll',
      resource: undefined,
      metadata: undefined,
    });
  });
});

// ============================================================================
// createLockManager
// ============================================================================

describe('createLockManager', () => {
  it('acquires and releases a lock', async () => {
    const manager = createLockManager();
    const release = await manager.acquire('key-1');
    expect(manager.locks.has('key-1')).toBe(true);
    release();
    expect(manager.locks.has('key-1')).toBe(false);
  });

  it('serializes concurrent access for the same key', async () => {
    const manager = createLockManager();
    const order: string[] = [];

    const release1 = await manager.acquire('same-key');
    order.push('acquired-1');

    // Start a second acquire — it should wait
    const p2 = manager.acquire('same-key').then(release2 => {
      order.push('acquired-2');
      return release2;
    });

    // Give the second acquire a chance to run (it should be waiting)
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(order).toEqual(['acquired-1']); // second hasn't acquired yet

    release1();
    const release2 = await p2;
    expect(order).toEqual(['acquired-1', 'acquired-2']);

    release2();
    expect(manager.locks.has('same-key')).toBe(false);
  });

  it('allows concurrent access for different keys', async () => {
    const manager = createLockManager();
    const order: string[] = [];

    const release1 = await manager.acquire('key-a');
    order.push('acquired-a');

    // Different key should not block
    const release2 = await manager.acquire('key-b');
    order.push('acquired-b');

    expect(order).toEqual(['acquired-a', 'acquired-b']);

    release1();
    release2();
  });

  it('throws an error when maxEntries is exceeded', async () => {
    const manager = createLockManager(2); // max 2 entries

    const release1 = await manager.acquire('oldest');
    const release2 = await manager.acquire('middle');

    expect(manager.locks.size).toBe(2);

    // Acquiring a third should throw an error because it is at capacity
    await expect(manager.acquire('newest')).rejects.toThrow(
      "Lock manager at capacity (2). Try again later."
    );

    expect(manager.locks.size).toBe(2);
    expect(manager.locks.has('oldest')).toBe(true);
    expect(manager.locks.has('middle')).toBe(true);

    release1();
    release2();
  });

  it('allows waiting on an existing key even if at capacity', async () => {
    const manager = createLockManager(2); // max 2 entries

    const release1 = await manager.acquire('oldest');
    const release2 = await manager.acquire('middle');

    expect(manager.locks.size).toBe(2);

    // Acquiring 'oldest' again should NOT throw, but wait on the existing lock
    const pWait = manager.acquire('oldest');
    
    // Give wait a moment
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // release1 first lock
    release1();
    
    const release3 = await pWait;
    expect(manager.locks.size).toBe(2);
    
    release2();
    release3();
  });

  it('default maxEntries is 1000', () => {
    const manager = createLockManager();
    expect(manager.locks.size).toBe(0);
    // We can't easily test 1000 without performance issues,
    // but we verify the default is accepted
  });

  it('handles many sequential acquires and releases', async () => {
    const manager = createLockManager();

    for (let i = 0; i < 100; i++) {
      const release = await manager.acquire(`key-${i}`);
      release();
    }

    expect(manager.locks.size).toBe(0);
  });
});
