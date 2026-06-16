import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import type { TypedLogger } from './logger';

describe('with-logger', () => {
  let capturedLines: string[] = [];

  beforeEach(() => {
    capturedLines = [];

    // Force production mode so logger outputs JSON (not pretty-printed)
    vi.stubEnv('NODE_ENV', 'production');

    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
      if (typeof chunk === 'string') {
        capturedLines.push(chunk);
      }
      return true;
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('wraps a handler and logs request and response', async () => {
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

    // Should have logged the request and response
    await new Promise((resolve) => setTimeout(resolve, 50));

    const parsedLines = capturedLines
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const requestLogs = parsedLines.filter(
      (p: Record<string, unknown>) => p.event === 'API_REQUEST'
    );
    expect(requestLogs.length).toBeGreaterThanOrEqual(1);

    const firstRequestLog = requestLogs[0];
    expect(firstRequestLog.requestId).toBeDefined();
    expect(firstRequestLog.method).toBe('POST');
  });

  it('logs errors and re-throws them', async () => {
    const { withLogger } = await import('./with-logger');

    const testError = new Error('Something went wrong');
    const handler = vi.fn().mockRejectedValue(testError);

    const wrapped = withLogger(handler);
    const request = new NextRequest('http://localhost/api/test', {
      method: 'GET',
    });

    await expect(wrapped(request)).rejects.toThrow('Something went wrong');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const parsedLines = capturedLines
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const errorLogs = parsedLines.filter(
      (p: Record<string, unknown>) => p.event === 'API_ERROR'
    );
    expect(errorLogs.length).toBeGreaterThanOrEqual(1);
    // stack field must be absent (security: stack traces can contain credentials)
    expect(errorLogs[0].stack).toBeUndefined();
    // error message should be present but scrubbed
    expect(errorLogs[0].error).toBeDefined();
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

    await new Promise((resolve) => setTimeout(resolve, 50));

    // The raw log output must not contain the bearer token
    const rawOutput = capturedLines.join('\n');
    expect(rawOutput).not.toContain('eySecretToken99');
    expect(rawOutput).not.toContain('Bearer eySecretToken99');

    // But the log line should still have a redacted error field
    const parsedLines = capturedLines
      .filter((l) => l.trim())
      .map((l) => {
        try { return JSON.parse(l); } catch { return null; }
      })
      .filter(Boolean);

    const errorLogs = parsedLines.filter(
      (p: Record<string, unknown>) => p.event === 'API_ERROR'
    );
    expect(errorLogs.length).toBeGreaterThanOrEqual(1);
    // stack must be absent
    expect(errorLogs[0].stack).toBeUndefined();
    // error field should be present
    expect(errorLogs[0].error).toBeDefined();
    // credential must be redacted
    expect(errorLogs[0].error).not.toContain('eySecretToken99');
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

    await new Promise((resolve) => setTimeout(resolve, 50));

    const parsedLines = capturedLines
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Find a log that has duration
    const logWithDuration = parsedLines.find(
      (p: Record<string, unknown>) => typeof p.duration === 'number'
    );
    expect(logWithDuration).toBeDefined();
    expect((logWithDuration as Record<string, unknown>).duration).toBeGreaterThan(0);
  });

  it('attaches request ID to child logger used by handler', async () => {
    const { withLogger } = await import('./with-logger');

    // Handler that uses the injected logger
    const handler = vi.fn().mockImplementation(async (_req: NextRequest, logger: TypedLogger) => {
      logger.info('TEST_EVENT' as unknown as never, 'Handler log message');
      return NextResponse.json({ ok: true }, { status: 200 });
    });

    const wrapped = withLogger(handler);
    const request = new NextRequest('http://localhost/api/test', {
      method: 'GET',
    });

    await wrapped(request);

    await new Promise((resolve) => setTimeout(resolve, 50));

    // The handler's log should have a requestId from the wrapper
    const parsedLines = capturedLines
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const handlerLog = parsedLines.find(
      (p: Record<string, unknown>) => p.msg === 'Handler log message'
    );
    expect(handlerLog).toBeDefined();
    expect((handlerLog as Record<string, unknown>).requestId).toBeDefined();
  });
});
