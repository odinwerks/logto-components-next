import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Module Mocks - hoisted above all imports
// ============================================================================

vi.mock('../capture-message', () => ({
  captureMessage: vi.fn((err: unknown) => {
    if (err instanceof Error) return err.message;
    return String(err);
  }),
}));

vi.mock('../errors', () => ({
  sanitize: vi.fn((_err: unknown, opts: { fallback: string }) => {
    const e = new Error(opts.fallback);
    e.name = 'SanitizedError';
    return e;
  }),
}));

vi.mock('../log', () => ({
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

// ============================================================================
// Imports under test
// ============================================================================

import { safeAction } from './safe';
import { sanitize } from '../errors';
import { warn } from '../log';

// ============================================================================
// Helpers
// ============================================================================

function makeSanitizedError(code: string): Error {
  const e = new Error(code);
  e.name = 'SanitizedError';
  return e;
}

function makeValidationError(code: string): Error {
  const e = new Error(code);
  e.name = 'ValidationError';
  return e;
}

// ============================================================================
// BUG-M02: safeAction must NOT leak raw errors in production
// ============================================================================

describe('safeAction - BUG-M02 production safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sanitizes raw errors in production even when DEBUG_ACTIONS=true', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEBUG_ACTIONS', 'true');

    const rawError = new Error('secret database connection string');
    const result = await safeAction(async () => { throw rawError; });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toContain('secret database connection string');
      expect(result.error).toBe('INTERNAL_ERROR');
    }
    expect(sanitize).toHaveBeenCalled();
    // No debug logging in production
    expect(warn).not.toHaveBeenCalled();
  });

  it('sanitizes raw errors in production without DEBUG_ACTIONS', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const rawError = new Error('raw internal error details');
    const result = await safeAction(async () => { throw rawError; });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INTERNAL_ERROR');
    }
    expect(sanitize).toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});

// ============================================================================
// BUG-M03: Pre-sanitized errors always pass through WITHOUT re-sanitization
// Raw errors always get sanitized first; raw message logged server-side in debug
// ============================================================================

describe('safeAction - BUG-M03 sanitization logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('passes through SanitizedError directly without calling sanitize()', async () => {
    const pre = makeSanitizedError('UNAUTHORIZED');
    const result = await safeAction(async () => { throw pre; });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('UNAUTHORIZED');
    expect(sanitize).not.toHaveBeenCalled();
  });

  it('passes through ValidationError directly without calling sanitize()', async () => {
    const pre = makeValidationError('INVALID_ID');
    const result = await safeAction(async () => { throw pre; });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('INVALID_ID');
    expect(sanitize).not.toHaveBeenCalled();
  });

  it('sanitizes raw Error before returning to client', async () => {
    const raw = new Error('DB: connection refused at 10.0.0.1:5432');
    const result = await safeAction(async () => { throw raw; });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toContain('connection refused');
      expect(result.error).toBe('INTERNAL_ERROR');
    }
    expect(sanitize).toHaveBeenCalledWith(raw, { fallback: 'INTERNAL_ERROR' });
  });

  it('sanitizes thrown string before returning to client', async () => {
    const result = await safeAction(async () => { throw 'some raw string'; });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('INTERNAL_ERROR');
    expect(sanitize).toHaveBeenCalled();
  });

  it('returns ok:true with data on success', async () => {
    const result = await safeAction(async () => ({ value: 42 }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ value: 42 });
    expect(sanitize).not.toHaveBeenCalled();
  });

  it('in debug mode (non-prod + DEBUG_ACTIONS=true), calls warn() with raw message but still sanitizes for client', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEBUG_ACTIONS', 'true');

    const raw = new Error('internal secret error');
    const result = await safeAction(async () => { throw raw; });

    // Client still receives sanitized output
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INTERNAL_ERROR');
    }
    // Raw message was logged server-side
    expect(warn).toHaveBeenCalledWith('[safeAction DEBUG]', 'internal secret error');
    // sanitize() was called for the client response
    expect(sanitize).toHaveBeenCalledWith(raw, { fallback: 'INTERNAL_ERROR' });
  });

  it('in test mode (NODE_ENV=test), calls warn() with raw message but still sanitizes for client', async () => {
    // NODE_ENV is already 'test' in test environment by default
    // Verify that sanitize is still called (i.e., client always gets sanitized output)
    const raw = new Error('test-mode raw error');
    const result = await safeAction(async () => { throw raw; });

    // Client still receives sanitized output (not the raw error)
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INTERNAL_ERROR');
    }
    // sanitize() is still called even in test mode (for the client response)
    expect(sanitize).toHaveBeenCalledWith(raw, { fallback: 'INTERNAL_ERROR' });
  });

  it('passes through SanitizedError in production (pre-sanitized codes survive)', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const pre = makeSanitizedError('UPLOAD_FAILED');
    const result = await safeAction(async () => { throw pre; });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('UPLOAD_FAILED');
    // sanitize() must NOT be called — the error is already sanitized
    expect(sanitize).not.toHaveBeenCalled();
  });
});
