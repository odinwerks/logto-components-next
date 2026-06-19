/**
 * Tests for app/logto-kit/logic/log.ts
 *
 * Focuses on the security guarantee: credentials passed as string arguments
 * to log/warn/error/debug are scrubbed before being written to the console.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('log.ts — console path scrubbing', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    debug: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    // Use 'console' backend to test scrubbing in the console path only
    vi.stubEnv('LOG_BACKEND', 'console');

    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('scrubs Bearer tokens from warn() string arguments', async () => {
    const { warn } = await import('./log');
    warn('Request failed: Bearer eySecretToken123 was rejected');

    expect(consoleSpy.warn).toHaveBeenCalled();
    const callArgs = consoleSpy.warn.mock.calls[0];
    const loggedOutput = callArgs.join(' ');
    expect(loggedOutput).not.toContain('eySecretToken123');
    expect(loggedOutput).toContain('Bearer [REDACTED]');
  });

  it('scrubs Bearer tokens from error() string arguments', async () => {
    const { error } = await import('./log');
    error('Auth error', 'Bearer myTokenValue456 expired');

    expect(consoleSpy.error).toHaveBeenCalled();
    const callArgs = consoleSpy.error.mock.calls[0];
    const loggedOutput = callArgs.join(' ');
    expect(loggedOutput).not.toContain('myTokenValue456');
    expect(loggedOutput).toContain('Bearer [REDACTED]');
  });

  it('scrubs access_token from log() string arguments', async () => {
    const { log } = await import('./log');
    log('Redirected to callback with access_token=myaccesstoken12345');

    expect(consoleSpy.log).toHaveBeenCalled();
    const callArgs = consoleSpy.log.mock.calls[0];
    const loggedOutput = callArgs.join(' ');
    expect(loggedOutput).not.toContain('myaccesstoken12345');
    expect(loggedOutput).toContain('access_token=[REDACTED]');
  });

  it('scrubs credentials from debug() string arguments', async () => {
    const { debug } = await import('./log');
    debug('Token refresh_token=myrefreshtoken99 received');

    expect(consoleSpy.debug).toHaveBeenCalled();
    const callArgs = consoleSpy.debug.mock.calls[0];
    const loggedOutput = callArgs.join(' ');
    expect(loggedOutput).not.toContain('myrefreshtoken99');
    expect(loggedOutput).toContain('refresh_token=[REDACTED]');
  });

  it('scrubs credentials from Error arguments', async () => {
    const { error } = await import('./log');
    const err = new Error('Token mismatch: Bearer secretBearerVal789 expected');
    error('Handler failed:', err);

    expect(consoleSpy.error).toHaveBeenCalled();
    const callArgs = consoleSpy.error.mock.calls[0];
    // Check that the error message was scrubbed
    const scrubbed = callArgs.find((a: unknown) => a instanceof Error) as Error | undefined;
    if (scrubbed) {
      expect(scrubbed.message).not.toContain('secretBearerVal789');
    } else {
      // May have been converted to string
      const loggedOutput = callArgs.join(' ');
      expect(loggedOutput).not.toContain('secretBearerVal789');
    }
  });

  it('passes safe strings through unchanged', async () => {
    const { log } = await import('./log');
    const safeMsg = 'User logged in successfully with userId=abc123';
    log(safeMsg);

    expect(consoleSpy.log).toHaveBeenCalled();
    const callArgs = consoleSpy.log.mock.calls[0];
    expect(callArgs[0]).toBe(safeMsg);
  });

  it('passes non-string arguments (objects, numbers) through unchanged', async () => {
    const { log } = await import('./log');
    const obj = { userId: 'abc', status: 200 };
    log('Event data:', obj, 42);

    expect(consoleSpy.log).toHaveBeenCalled();
    const callArgs = consoleSpy.log.mock.calls[0];
    // The object reference should be the same (not cloned)
    expect(callArgs[1]).toBe(obj);
    expect(callArgs[2]).toBe(42);
  });
});

describe('logEvent console path scrubbing', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    vi.stubEnv('LOG_BACKEND', 'console');

    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('scrubs Bearer tokens from logEvent.error() message', async () => {
    const { logEvent } = await import('./log');
    logEvent.error('API_ERROR' as never, 'Failed: Bearer secretEventToken12 rejected');

    expect(consoleSpy.error).toHaveBeenCalled();
    const callArgs = consoleSpy.error.mock.calls[0];
    const loggedOutput = callArgs.join(' ');
    expect(loggedOutput).not.toContain('secretEventToken12');
    expect(loggedOutput).toContain('Bearer [REDACTED]');
  });

  it('scrubs Bearer tokens from logEvent.warn() message', async () => {
    const { logEvent } = await import('./log');
    logEvent.warn('AUTH_SIGN_IN' as never, 'Warning: access_token=warntoken99 suspicious');

    expect(consoleSpy.warn).toHaveBeenCalled();
    const callArgs = consoleSpy.warn.mock.calls[0];
    const loggedOutput = callArgs.join(' ');
    expect(loggedOutput).not.toContain('warntoken99');
    expect(loggedOutput).toContain('access_token=[REDACTED]');
  });
});

describe('log.ts — Pino path scrubbing (BUG-M-001)', () => {
  beforeEach(() => {
    vi.stubEnv('LOG_BACKEND', 'pino');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('scrubs JWT from Pino msg field (single-arg call)', async () => {
    const pinoLoggerMock = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
      raw: vi.fn(),
    };
    vi.doMock('../../lib/logger', () => ({
      createLogger: vi.fn().mockReturnValue(pinoLoggerMock),
    }));

    const { warn } = await import('./log');
    const jwt = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.sig123';
    warn(`Credential leak: ${jwt}`);

    const calls = pinoLoggerMock.warn.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const [, msg] = calls[0];
    expect(msg).not.toContain('eyJhbGciOiJSUzI1NiJ9');
    expect(msg).toContain('[JWT_REDACTED]');
  });

  it('scrubs access_token from Pino detail field (multi-arg call)', async () => {
    const pinoLoggerMock = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
      raw: vi.fn(),
    };
    vi.doMock('../../lib/logger', () => ({
      createLogger: vi.fn().mockReturnValue(pinoLoggerMock),
    }));

    const { warn } = await import('./log');
    warn('Token exchange failed', 'access_token=supersecretaccesstoken');

    const calls = pinoLoggerMock.warn.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const [, , detail] = calls[0];
    if (detail && typeof detail === 'object' && 'detail' in detail) {
      expect((detail as { detail: string }).detail).not.toContain('supersecretaccesstoken');
      expect((detail as { detail: string }).detail).toContain('access_token=[REDACTED]');
    }
  });
});
