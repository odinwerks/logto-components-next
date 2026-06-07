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

      const debugLines = parsedLines.filter((p: any) => p.level === 'debug');
      const warnLines = parsedLines.filter((p: any) => p.level === 'warn');

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
});
