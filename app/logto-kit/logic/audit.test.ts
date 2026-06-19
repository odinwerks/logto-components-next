import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Module mocks - hoisted
// ============================================================================

vi.mock('./dev-mode', () => ({
  isDev: false, // default: production mode for these tests
  isProd: true,
}));

vi.mock('./log', () => ({
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  logEvent: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  },
}));

// ============================================================================
// Imports under test
// ============================================================================

import { audit } from './audit';
import { log } from './log';

// ============================================================================
// Tests
// ============================================================================

describe('audit', () => {
  const entry = {
    actor: 'user-123',
    action: 'password.change',
    resource: 'user-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('always calls log() (routes through Pino scrubbing pipeline)', async () => {
    await audit(entry);

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      '[AUDIT]',
      expect.stringContaining('"action":"password.change"'),
    );
    expect(log).toHaveBeenCalledWith(
      '[AUDIT]',
      expect.stringContaining('"actor":"user-123"'),
    );
  });

  it('does NOT use console.info (BUG-M09: bypassed Pino scrubbing)', async () => {
    // BUG-M09: Previously in dev mode, audit used console.info which bypassed
    // the Pino scrub-log pipeline. Now it always uses log().
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    await audit(entry);

    // console.info must never be called directly by audit()
    expect(consoleSpy).not.toHaveBeenCalled();
    // log() must have been called
    expect(log).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });

  it('calls log() in production mode', async () => {
    await audit(entry);

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      '[AUDIT]',
      expect.stringContaining('"action":"password.change"'),
    );
    expect(log).toHaveBeenCalledWith(
      '[AUDIT]',
      expect.stringContaining('"actor":"user-123"'),
    );
  });

  it('includes a timestamp in the audit record', async () => {
    await audit(entry);

    expect(log).toHaveBeenCalledWith(
      '[AUDIT]',
      expect.stringMatching(/"ts":"\d{4}-\d{2}-\d{2}T/),
    );
  });

  it('includes metadata when provided', async () => {
    await audit({
      ...entry,
      metadata: { ip: '127.0.0.1' },
    });

    expect(log).toHaveBeenCalledWith(
      '[AUDIT]',
      expect.stringContaining('"ip":"127.0.0.1"'),
    );
  });

  it('passes the entire entry as structured JSON', async () => {
    await audit(entry);

    const callArgs = vi.mocked(log).mock.calls[0];
    const record = JSON.parse(callArgs[1] as string);

    expect(record).toHaveProperty('ts');
    expect(record).toHaveProperty('actor', 'user-123');
    expect(record).toHaveProperty('action', 'password.change');
    expect(record).toHaveProperty('resource', 'user-123');
  });

  // ── BUG-M-007: Non-serializable metadata ─────────────────────────────────

  it('does not throw when metadata contains a BigInt', async () => {
    await expect(
      audit({ actor: 'user1', action: 'test', metadata: { size: BigInt(999) } })
    ).resolves.not.toThrow();
  });

  it('does not throw when metadata contains a circular reference', async () => {
    const circ: Record<string, unknown> = {};
    circ.self = circ;
    await expect(
      audit({ actor: 'user1', action: 'test', metadata: circ })
    ).resolves.not.toThrow();
  });

  it('logs a partial record with _serializeError when metadata is non-serializable', async () => {
    const circ: Record<string, unknown> = {};
    circ.self = circ;
    await audit({ actor: 'user-fallback', action: 'test.action', metadata: circ });

    const callArgs = vi.mocked(log).mock.calls[0];
    const record = JSON.parse(callArgs[1] as string);
    expect(record).toHaveProperty('actor', 'user-fallback');
    expect(record).toHaveProperty('action', 'test.action');
    expect(record).toHaveProperty('_serializeError');
    expect(record).not.toHaveProperty('metadata');
  });

  it('logs the full record when metadata is serializable', async () => {
    await audit({ actor: 'user2', action: 'normal', metadata: { ip: '1.2.3.4' } });

    const callArgs = vi.mocked(log).mock.calls[0];
    const record = JSON.parse(callArgs[1] as string);
    expect(record).toHaveProperty('metadata.ip', '1.2.3.4');
    expect(record).not.toHaveProperty('_serializeError');
  });
});
