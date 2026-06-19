import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LOG_EVENTS } from './log-events';

describe('logger', () => {
  let capturedLines: string[] = [];

  beforeEach(() => {
    capturedLines = [];

    // Force production mode so logger outputs JSON (not pretty-printed)
    vi.stubEnv('NODE_ENV', 'production');

    // Capture stdout
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
    // Clear any cached logger modules
    vi.resetModules();
    delete (globalThis as { __appLoggerSingleton__?: unknown }).__appLoggerSingleton__;
  });

  describe('default logger singleton', () => {
    it('reuses the same default logger across module reloads', async () => {
      vi.stubEnv('NODE_ENV', 'test');

      const first = await import('./logger');
      const firstLogger = first.logger;

      vi.resetModules();

      const second = await import('./logger');

      expect(second.logger).toBe(firstLogger);
      expect(second.logger.raw).toBe(firstLogger.raw);
    });
  });

  describe('createLogger', () => {
    it('creates a logger that outputs JSON with required fields', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });

      logger.info(LOG_EVENTS.AUTH_SIGN_IN, 'User signed in', { userId: '123' });

      // Flush pino
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(capturedLines.length).toBeGreaterThan(0);
      const lastLine = capturedLines[capturedLines.length - 1];
      const parsed = JSON.parse(lastLine);

      expect(parsed.level).toBe('info');
      expect(parsed.event).toBe('AUTH_SIGN_IN');
      expect(parsed.msg).toBe('User signed in');
      expect(parsed.userId).toBe('123');
      expect(parsed.time).toBeDefined();
    });

    it('includes context fields in log output', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });

      logger.error(LOG_EVENTS.API_ERROR, 'Request failed', {
        statusCode: 500,
        path: '/api/protected',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const lastLine = capturedLines[capturedLines.length - 1];
      const parsed = JSON.parse(lastLine);

      expect(parsed.level).toBe('error');
      expect(parsed.event).toBe('API_ERROR');
      expect(parsed.msg).toBe('Request failed');
      expect(parsed.statusCode).toBe(500);
      expect(parsed.path).toBe('/api/protected');
    });

    it('redacts sensitive information in stdout', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });

      logger.info(LOG_EVENTS.AUTH_SIGN_IN, 'Login attempt', {
        password: 'super-secret-password',
        nested: {
          token: 'some-token',
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const lastLine = capturedLines[capturedLines.length - 1];
      const parsed = JSON.parse(lastLine);

      expect(parsed.password).toBe('[REDACTED]');
      expect(parsed.nested.token).toBe('[REDACTED]');
    });

    it('respects log level filtering', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'warn' });

      logger.debug(LOG_EVENTS.API_REQUEST, 'This should not appear');
      logger.warn(LOG_EVENTS.API_ERROR, 'This should appear');

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Only warn and above should be captured
      const parsedLines = capturedLines
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l));

      const debugLines = parsedLines.filter((p: Record<string, unknown>) => p.level === 'debug');
      const warnLines = parsedLines.filter((p: Record<string, unknown>) => p.level === 'warn');

      expect(debugLines.length).toBe(0);
      expect(warnLines.length).toBeGreaterThanOrEqual(1);
    });

    it('supports child loggers with bound context', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });
      const childLogger = logger.child({ requestId: 'req-abc-123', component: 'auth' });

      childLogger.info(LOG_EVENTS.AUTH_SIGN_IN, 'Child log test');

      await new Promise((resolve) => setTimeout(resolve, 50));

      const lastLine = capturedLines[capturedLines.length - 1];
      const parsed = JSON.parse(lastLine);

      expect(parsed.requestId).toBe('req-abc-123');
      expect(parsed.component).toBe('auth');
    });

    it('redacts stack, error, access_token, refresh_token from log context', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });

      logger.error(LOG_EVENTS.API_ERROR, 'Failure with credentials', {
        stack: 'Error: secret at line 1',
        error: 'some error detail',
        access_token: 'raw-access-token-value',
        refresh_token: 'raw-refresh-token-value',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const lastLine = capturedLines[capturedLines.length - 1];
      const parsed = JSON.parse(lastLine);

      expect(parsed.stack).toBe('[REDACTED]');
      expect(parsed.error).toBe('[REDACTED]');
      expect(parsed.access_token).toBe('[REDACTED]');
      expect(parsed.refresh_token).toBe('[REDACTED]');
    });
  });

  describe('getDefaultLevel', () => {
    it('returns debug in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      const { getDefaultLevel } = await import('./logger');
      expect(getDefaultLevel()).toBe('debug');
    });

    it('returns info in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      const { getDefaultLevel } = await import('./logger');
      expect(getDefaultLevel()).toBe('info');
    });

    it('respects LOG_LEVEL env var', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('LOG_LEVEL', 'warn');

      const { getDefaultLevel } = await import('./logger');
      expect(getDefaultLevel()).toBe('warn');
    });
  });

  describe('createWebhookDestination (HTTPS enforcement)', () => {
    it('throws when given an http:// URL in production (non-localhost)', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const { createLogger } = await import('./logger');

      expect(() =>
        createLogger({ webhookUrl: 'http://external-webhook.example.com/log' })
      ).toThrow('LOGGING_WEBHOOK_URL must use HTTPS in production');
    });

    it('allows https:// URL in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const { createLogger } = await import('./logger');

      // Should not throw
      expect(() =>
        createLogger({ webhookUrl: 'https://external-webhook.example.com/log' })
      ).not.toThrow();
    });

    it('allows http://localhost in production (local exception)', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const { createLogger } = await import('./logger');

      expect(() =>
        createLogger({ webhookUrl: 'http://localhost:3001/log' })
      ).not.toThrow();
    });

    it('allows http:// URLs in non-production environments', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      const { createLogger } = await import('./logger');

      expect(() =>
        createLogger({ webhookUrl: 'http://dev-webhook.local/log' })
      ).not.toThrow();
    });
  });

  describe('webhook queue overflow (BUG-M11)', () => {
    it('drops oldest entries and warns when queue exceeds MAX_QUEUE_SIZE', async () => {
      vi.stubEnv('NODE_ENV', 'production');

      // Capture stdout writes
      const stdoutWrites: string[] = [];
      vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
        if (typeof chunk === 'string') stdoutWrites.push(chunk);
        return true;
      });

      // Patch global fetch to block flushing so queue can grow
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        new Promise(() => {}) // never resolves — keeps 'pending = true'
      );

      const { createLogger } = await import('./logger');
      const logger = createLogger({
        level: 'info',
        webhookUrl: 'https://webhook.example.com/log',
      });

      // First write triggers a flush that sets pending = true and never resolves.
      // Subsequent writes accumulate in the queue without flushing.
      // We write MAX_QUEUE_SIZE + 2 entries to trigger at least one eviction.
      const MAX = 5000;
      for (let i = 0; i < MAX + 2; i++) {
        logger.info(LOG_EVENTS.AUTH_SIGN_IN, `msg ${i}`);
      }

      // Allow setImmediate callbacks to run
      await new Promise((resolve) => setImmediate(resolve));

      // Overflow warning must have been emitted at least once
      const warnLines = stdoutWrites.filter((w) =>
        w.includes('[logger] webhook queue full')
      );
      expect(warnLines.length).toBeGreaterThanOrEqual(1);

      fetchSpy.mockRestore();
    });
  });
});
