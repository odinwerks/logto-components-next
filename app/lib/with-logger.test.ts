import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { TypedLogger } from './logger';

// Mock logEvent from log.ts so withLogger's child logger and structured logs
// are captured. The mock must include `child` (returns a logger with the same
// methods) and `raw` so the TypedLogger contract is satisfied.
// Use vi.hoisted so the mock is accessible from both the factory and tests.
const { logEventMock, childLoggerMock } = vi.hoisted(() => {
  const childLoggerMock = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
    raw: {},
  };
  childLoggerMock.child.mockReturnValue(childLoggerMock);
  const logEventMock = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnValue(childLoggerMock),
    raw: {},
  };
  return { logEventMock, childLoggerMock };
});

vi.mock('../logto-kit/logic/log', () => ({
  logEvent: logEventMock,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

describe('with-logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('wraps a handler and logs request and response via logEvent', async () => {
    const { withLogger } = await import('./with-logger');

    const handler = vi.fn().mockResolvedValue(
      NextResponse.json({ ok: true }, { status: 200 })
    );

    const wrapped = withLogger(handler);
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
    });

    const response = await wrapped(request);

    expect(handler).toHaveBeenCalled();
    expect(response.status).toBe(200);

    // withLogger should call logEvent.child to create a request-scoped logger.
    expect(logEventMock.child).toHaveBeenCalledTimes(1);
    const childBindings = logEventMock.child.mock.calls[0][0];
    expect(childBindings.requestId).toBeDefined();
    expect(childBindings.method).toBe('POST');
    expect(childBindings.path).toBe('/api/test');

    // The child logger's info should be called for request start + completion.
    const childLogger = childLoggerMock;
    expect(childLogger.info).toHaveBeenCalled();
  });

  it('logs errors via logEvent and re-throws them', async () => {
    const { withLogger } = await import('./with-logger');

    const testError = new Error('Something went wrong');
    const handler = vi.fn().mockRejectedValue(testError);

    const wrapped = withLogger(handler);
    const request = new NextRequest('http://localhost/api/test', {
      method: 'GET',
    });

    await expect(wrapped(request)).rejects.toThrow('Something went wrong');

    // The child logger's error should be called with API_ERROR event.
    const childLogger = childLoggerMock;
    expect(childLogger.error).toHaveBeenCalled();
    const errorCallArgs = childLogger.error.mock.calls[0];
    expect(errorCallArgs[0]).toBe('API_ERROR');
    // stack field must be absent (security: stack traces can contain credentials)
    const context = errorCallArgs[2];
    expect(context).toBeDefined();
    expect((context as Record<string, unknown>).stack).toBeUndefined();
    // error message should be present
    expect((context as Record<string, unknown>).error).toBeDefined();
  });

  it('scrubs bearer tokens from error messages before logging', async () => {
    const { withLogger } = await import('./with-logger');

    // Simulate an error whose message contains a credential
    const sensitiveError = new Error('Request failed: Bearer eySecretToken99 was rejected');
    const handler = vi.fn().mockRejectedValue(sensitiveError);

    const wrapped = withLogger(handler);
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
    });

    await expect(wrapped(request)).rejects.toThrow();

    // The error logged via the child logger must be scrubbed.
    const childLogger = childLoggerMock;
    const errorCallArgs = childLogger.error.mock.calls[0];
    const context = errorCallArgs[2] as Record<string, unknown>;
    expect(context.error).toBeDefined();
    // credential must be redacted
    expect(context.error).not.toContain('eySecretToken99');
  });

  it('includes duration in response log', async () => {
    const { withLogger } = await import('./with-logger');

    const handler = vi.fn().mockImplementation(async () => {
      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 10));
      return NextResponse.json({ ok: true }, { status: 200 });
    });

    const wrapped = withLogger(handler);
    const request = new NextRequest('http://localhost/api/test', {
      method: 'GET',
    });

    await wrapped(request);

    // The child logger's info should have a completion log with duration.
    const childLogger = childLoggerMock;
    const infoCalls = childLogger.info.mock.calls;
    // Find the completion log (second call) which has duration in context.
    const completionCall = infoCalls.find(
      (call: unknown[]) => typeof (call[2] as Record<string, unknown>)?.duration === 'number'
    );
    expect(completionCall).toBeDefined();
    expect((completionCall![2] as Record<string, unknown>).duration).toBeGreaterThanOrEqual(0);
  });

  it('attaches request ID to child logger used by handler', async () => {
    const { withLogger } = await import('./with-logger');

    // Handler that uses the injected logger
    const handler = vi.fn().mockImplementation(async (_req: NextRequest, logger: TypedLogger) => {
      logger.info('TEST_EVENT' as never, 'Handler log message');
      return NextResponse.json({ ok: true }, { status: 200 });
    });

    const wrapped = withLogger(handler);
    const request = new NextRequest('http://localhost/api/test', {
      method: 'GET',
    });

    await wrapped(request);

    // The handler should have been called with a child logger that has requestId.
    expect(handler).toHaveBeenCalledTimes(1);
    const injectedLogger = handler.mock.calls[0][1];
    expect(injectedLogger).toBeDefined();
    // The child logger was created with requestId bindings.
    expect(logEventMock.child).toHaveBeenCalledTimes(1);
    const childBindings = logEventMock.child.mock.calls[0][0];
    expect(childBindings.requestId).toBeDefined();
  });

  it('does not log NEXT_REDIRECT (by message) as API_ERROR', async () => {
    const { withLogger } = await import('./with-logger');

    const redirectErr = new Error('NEXT_REDIRECT');
    const handler = vi.fn().mockRejectedValue(redirectErr);

    const wrapped = withLogger(handler);
    const request = new NextRequest('http://localhost/api/auth/sign-in', {
      method: 'GET',
    });

    // Must still re-throw so Next.js can handle the redirect
    await expect(wrapped(request)).rejects.toThrow('NEXT_REDIRECT');

    // error() must NOT have been called — it's a control-flow pseudo-error
    expect(childLoggerMock.error).not.toHaveBeenCalled();
  });

  it('does not log NEXT_REDIRECT (by digest) as API_ERROR', async () => {
    const { withLogger } = await import('./with-logger');

    const redirectErr = new Error('NEXT_REDIRECT');
    (redirectErr as { digest?: string }).digest = 'NEXT_REDIRECT;replace;/;307;';
    const handler = vi.fn().mockRejectedValue(redirectErr);

    const wrapped = withLogger(handler);
    const request = new NextRequest('http://localhost/callback', {
      method: 'GET',
    });

    await expect(wrapped(request)).rejects.toThrow('NEXT_REDIRECT');
    expect(childLoggerMock.error).not.toHaveBeenCalled();
  });

  it('still logs real errors as API_ERROR after NEXT_REDIRECT guard', async () => {
    const { withLogger } = await import('./with-logger');

    const realError = new Error('Database connection failed');
    const handler = vi.fn().mockRejectedValue(realError);

    const wrapped = withLogger(handler);
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
    });

    await expect(wrapped(request)).rejects.toThrow('Database connection failed');

    // Real errors must still be logged
    expect(childLoggerMock.error).toHaveBeenCalledTimes(1);
    expect(childLoggerMock.error.mock.calls[0][0]).toBe('API_ERROR');
  });

  it('sets requestContext so getRequestId returns the id inside the handler', async () => {
    const { withLogger } = await import('./with-logger');
    const { getRequestId } = await import('./request-context');

    let capturedRequestId: string | undefined;
    const handler = vi.fn().mockImplementation(async () => {
      capturedRequestId = getRequestId();
      return NextResponse.json({ ok: true }, { status: 200 });
    });

    const wrapped = withLogger(handler);
    const request = new NextRequest('http://localhost/api/test', {
      method: 'GET',
    });

    await wrapped(request);

    // The requestId inside the handler should match the one bound to the child logger.
    const childBindings = logEventMock.child.mock.calls[0][0];
    expect(capturedRequestId).toBe(childBindings.requestId);
  });
});
