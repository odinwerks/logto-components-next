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
});
