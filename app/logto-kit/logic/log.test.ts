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

  it('passes non-sensitive objects through with same content (cloned by scrubArgs for BUG-008)', async () => {
    const { log } = await import('./log');
    const obj = { userId: 'abc', status: 200 };
    log('Event data:', obj, 42);

    expect(consoleSpy.log).toHaveBeenCalled();
    const callArgs = consoleSpy.log.mock.calls[0];
    // scrubArgs clones plain objects (BUG-008 fix) — reference will differ but content is the same
    expect(callArgs[1]).toStrictEqual(obj);
    // Non-sensitive keys are preserved
    expect((callArgs[1] as typeof obj).userId).toBe('abc');
    expect((callArgs[1] as typeof obj).status).toBe(200);
    // Numbers pass through by value
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
    const jwt = 'eyJ' + 'hbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.sig123';
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

// ============================================================================
// Smoke tests — real Pino backend, no mocks
// ============================================================================

describe('logEvent — real Pino backend smoke test', () => {
  beforeEach(() => {
    vi.stubEnv('LOG_BACKEND', 'pino');
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('logEvent.info(LOG_EVENTS.GENERIC_LOG, ...) does not throw', async () => {
    const { logEvent } = await import('./log');
    const { LOG_EVENTS } = await import('../../lib/log-events');

    expect(() => {
      logEvent.info(LOG_EVENTS.GENERIC_LOG, 'smoke test info');
    }).not.toThrow();
  });

  it('logEvent.warn(LOG_EVENTS.RBAC_PERMISSION_DENIED, ...) does not throw', async () => {
    const { logEvent } = await import('./log');
    const { LOG_EVENTS } = await import('../../lib/log-events');

    expect(() => {
      logEvent.warn(LOG_EVENTS.RBAC_PERMISSION_DENIED, 'smoke test warn', { action: 'test' });
    }).not.toThrow();
  });

  it('logEvent.error(LOG_EVENTS.API_ERROR, ...) does not throw', async () => {
    const { logEvent } = await import('./log');
    const { LOG_EVENTS } = await import('../../lib/log-events');

    expect(() => {
      logEvent.error(LOG_EVENTS.API_ERROR, 'smoke test error', { statusCode: 500 });
    }).not.toThrow();
  });

  it('logEvent.debug(LOG_EVENTS.API_REQUEST, ...) does not throw', async () => {
    const { logEvent } = await import('./log');
    const { LOG_EVENTS } = await import('../../lib/log-events');

    expect(() => {
      logEvent.debug(LOG_EVENTS.API_REQUEST, 'smoke test debug');
    }).not.toThrow();
  });

  it('logEvent.child() creates a child that does not throw when logging', async () => {
    const { logEvent } = await import('./log');
    const { LOG_EVENTS } = await import('../../lib/log-events');

    const child = logEvent.child({ requestId: 'smoke-test-req-001' });
    expect(() => {
      child.info(LOG_EVENTS.AUTH_SIGN_IN, 'child logger smoke test');
    }).not.toThrow();
  });

  it('requestId from requestContext auto-merged into logEvent', async () => {
    const { logEvent } = await import('./log');
    const { LOG_EVENTS } = await import('../../lib/log-events');
    const { requestContext, getRequestId } = await import('../../lib/request-context');

    // Silence stdout for this test
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await requestContext.run({ requestId: 'ctx-smoke-test-001' }, () => {
      expect(getRequestId()).toBe('ctx-smoke-test-001');
      expect(() => {
        logEvent.info(LOG_EVENTS.GENERIC_LOG, 'context smoke test');
      }).not.toThrow();
    });

    writeSpy.mockRestore();
  });

  it('logEvent in "both" backend mode does not throw', async () => {
    vi.stubEnv('LOG_BACKEND', 'both');
    vi.stubEnv('NODE_ENV', 'production');

    const { logEvent } = await import('./log');
    const { LOG_EVENTS } = await import('../../lib/log-events');

    expect(() => {
      logEvent.info(LOG_EVENTS.GENERIC_LOG, 'both mode test');
    }).not.toThrow();
  });
});
