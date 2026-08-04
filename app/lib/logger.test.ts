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

    it('scrubs credential substrings and record separators from root and child messages', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });

      logger.warn(LOG_EVENTS.API_ERROR, 'root\nBearer root-message-secret');
      logger.child({ component: 'auth' }).error(
        LOG_EVENTS.API_ERROR,
        `child\u2028access_token=${'c'.repeat(250)}`,
      );

      await new Promise((resolve) => setTimeout(resolve, 50));
      const parsedLines = capturedLines.filter((line) => line.trim()).map((line) => JSON.parse(line));

      expect(parsedLines[0].msg).toBe('root Bearer [REDACTED]');
      expect(parsedLines[1].msg).not.toContain('c'.repeat(20));
      expect(parsedLines[1].msg).not.toMatch(/[\n\r\u0085\u2028\u2029]/u);
      expect([...parsedLines[1].msg].length).toBeLessThanOrEqual(200);
    });

    it('recursively redacts case-varied aliases in root contexts and child bindings', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });
      const child = logger.child({
        outer: { middle: { Authorization: 'secret-auth', tokenValue: 'secret-token' } },
        CREDENTIAL: 'secret-credential',
      });

      child.info(LOG_EVENTS.AUTH_SIGN_IN, 'safe', {
        list: [{ verificationId: 'secret-verification', Cred: 'secret-cred' }],
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      const parsed = JSON.parse(capturedLines[capturedLines.length - 1]);

      expect(parsed.outer.middle.Authorization).toBe('[REDACTED]');
      expect(parsed.outer.middle.tokenValue).toBe('[REDACTED]');
      expect(parsed.CREDENTIAL).toBe('[REDACTED]');
      expect(parsed.list[0].verificationId).toBe('[REDACTED]');
      expect(parsed.list[0].Cred).toBe('[REDACTED]');
      expect(JSON.stringify(parsed)).not.toContain('secret-');
    });

    it('handles cyclic structured contexts without mutating them', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });
      const context: Record<string, unknown> = { TOKEN: 'cycle-secret' };
      context.self = context;

      expect(() => logger.info(LOG_EVENTS.API_REQUEST, 'cyclic context', context)).not.toThrow();
      expect(context.TOKEN).toBe('cycle-secret');
      expect(context.self).toBe(context);

      await new Promise((resolve) => setTimeout(resolve, 50));
      const parsed = JSON.parse(capturedLines[capturedLines.length - 1]);
      expect(parsed.TOKEN).toBe('[REDACTED]');
    });

    it('scrubs messages written through the raw Pino logger', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });

      logger.raw.info('Bearer raw-message-secret');
      logger.raw.child({ TokenValue: 'raw-child-secret' }).info('raw child');

      await new Promise((resolve) => setTimeout(resolve, 50));
      const parsedLines = capturedLines.filter((line) => line.trim()).map((line) => JSON.parse(line));
      expect(parsedLines[0].msg).toBe('Bearer [REDACTED]');
      expect(parsedLines[1].TokenValue).toBe('[REDACTED]');
    });

    it('M-011 scrubs printf interpolation after raw Pino formatting', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });

      logger.raw.info('Bearer %s', 'printf-interpolation-secret');

      await new Promise((resolve) => setTimeout(resolve, 50));
      const parsed = JSON.parse(capturedLines[capturedLines.length - 1]);
      expect(parsed.msg).toBe('Bearer [REDACTED]');
      expect(capturedLines[capturedLines.length - 1]).not.toContain('printf-interpolation-secret');
    });

    it('M-011 scrubs standalone credential-pattern string interpolation values', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });
      const jwt = `eyJ${'x'.repeat(24)}.eyJ${'y'.repeat(24)}.${'z'.repeat(24)}`;

      logger.raw.info('credential %s', jwt);

      await new Promise((resolve) => setTimeout(resolve, 50));
      const line = capturedLines[capturedLines.length - 1];
      expect(JSON.parse(line).msg).toBe('credential [JWT_REDACTED]');
      expect(line).not.toContain(jwt);
    });

    it('M-011 scrubs %j JSON interpolation secrets', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });

      logger.raw.info('Bearer %j', 'json-interpolation-secret');

      await new Promise((resolve) => setTimeout(resolve, 50));
      const line = capturedLines[capturedLines.length - 1];
      const parsed = JSON.parse(line);
      expect(parsed.msg).toBe('Bearer [REDACTED]');
      expect(line).not.toContain('json-interpolation-secret');
    });

    it('M-011 redacts nested credential descriptors in %j interpolation', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });

      logger.raw.info('Bearer %j', {
        nested: { key: 'token', value: 'nested-json-secret' },
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      const line = capturedLines[capturedLines.length - 1];
      const parsed = JSON.parse(line);
      expect(parsed.msg).toContain('[REDACTED]');
      expect(line).not.toContain('nested-json-secret');
    });

    it('M-011 redacts aliased credential descriptors below depth two', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });

      logger.raw.info('descriptor %j', {
        outer: {
          middle: {
            descriptor: { field: 'Authorization', value: 'deep-authorization-secret' },
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      const line = capturedLines[capturedLines.length - 1];
      expect(JSON.parse(line).msg).toContain('[REDACTED]');
      expect(line).not.toContain('deep-authorization-secret');
    });

    it('M-011 redacts a credential descriptor interpolated with %s', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });

      logger.raw.info('descriptor %s', {
        name: 'authorization',
        value: 'percent-s-secret',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      const line = capturedLines[capturedLines.length - 1];
      expect(JSON.parse(line).msg).toContain('[REDACTED]');
      expect(line).not.toContain('percent-s-secret');
    });

    it('M-011 redacts a depth-two credential key interpolated with %s', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });

      logger.raw.info('nested %s', {
        outer: { authorization: 'nested-percent-s-secret' },
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      const line = capturedLines[capturedLines.length - 1];
      expect(line).not.toContain('nested-percent-s-secret');
    });

    it.each(['%d', '%j', '%o', '%O', '%s'])(
      'M-011 redacts credential descriptors for %s interpolation',
      async (token) => {
        const { createLogger } = await import('./logger');
        const logger = createLogger({ level: 'debug' });
        const secret = `descriptor-${token.slice(1)}-secret`;

        (logger.raw.info as unknown as (...args: unknown[]) => void)(
          `descriptor ${token}`,
          { name: 'authorization', value: secret },
        );

        await new Promise((resolve) => setTimeout(resolve, 50));
        const line = capturedLines[capturedLines.length - 1];
        expect(line).not.toContain(secret);
      },
    );

    it('M-011 scrubs mixed %s then %j interpolation across the entire message', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });
      const jwt = `eyJ${'a'.repeat(24)}.eyJ${'b'.repeat(24)}.${'c'.repeat(24)}`;

      logger.raw.info('%s then %j', 'Bearer mixed-first-secret', {
        nested: { name: 'access-token', value: 'mixed-descriptor-secret' },
        jwt,
        later: 'Bearer mixed-later-secret',
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      const line = capturedLines[capturedLines.length - 1];
      const parsed = JSON.parse(line);
      expect(parsed.msg).toContain('Bearer [REDACTED]');
      expect(parsed.msg).toContain('[JWT_REDACTED]');
      expect(line).not.toContain('mixed-first-secret');
      expect(line).not.toContain('mixed-descriptor-secret');
      expect(line).not.toContain('mixed-later-secret');
      expect(line).not.toContain(jwt);
    });

    it.each(['%o', '%O'])('M-011 scrubs %s object interpolation secrets', async (token) => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });
      const secret = `${token.slice(1)}-interpolation-secret`;

      if (token === '%o') {
        logger.raw.info('Bearer %o', secret);
      } else {
        logger.raw.info('Bearer %O', secret);
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
      const line = capturedLines[capturedLines.length - 1];
      const parsed = JSON.parse(line);
      expect(parsed.msg).toBe('Bearer [REDACTED]');
      expect(line).not.toContain(secret);
    });

    it('M-012 redacts class and toJSON serialization attacks', async () => {
      class EnumerableAttack {
        Authorization = 'class-authorization-secret';
        tokenValue = 'class-token-secret';
      }
      class ToJsonAttack {
        toJSON() {
          return {
            Authorization: 'tojson-authorization-secret',
            tokenValue: 'tojson-token-secret',
          };
        }
      }

      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });
      logger.raw.info({ enumerable: new EnumerableAttack(), serialized: new ToJsonAttack() }, 'attack');

      await new Promise((resolve) => setTimeout(resolve, 50));
      const line = capturedLines[capturedLines.length - 1];
      const parsed = JSON.parse(line);
      expect(parsed.enumerable.Authorization).toBe('[REDACTED]');
      expect(parsed.enumerable.tokenValue).toBe('[REDACTED]');
      expect(parsed.serialized.Authorization).toBe('[REDACTED]');
      expect(parsed.serialized.tokenValue).toBe('[REDACTED]');
      expect(line).not.toContain('authorization-secret');
      expect(line).not.toContain('token-secret');
    });

    it('M-013 caps the final formatted raw message and normalizes record separators', async () => {
      const { createLogger } = await import('./logger');
      const logger = createLogger({ level: 'debug' });

      logger.raw.info('%s%s', 'a'.repeat(200), `\u2028${'b'.repeat(200)}`);

      await new Promise((resolve) => setTimeout(resolve, 50));
      const parsed = JSON.parse(capturedLines[capturedLines.length - 1]);
      expect([...parsed.msg]).toHaveLength(200);
      expect(parsed.msg).not.toMatch(/[\n\r\u0085\u2028\u2029]/u);
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

    // BUG-L-009: LOG_LEVEL validation
    it('falls back to default and warns when LOG_LEVEL is invalid', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('LOG_LEVEL', 'verbose'); // Not a valid Pino level
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { getDefaultLevel } = await import('./logger');
      const result = getDefaultLevel();

      expect(result).toBe('info'); // falls back to production default
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid LOG_LEVEL "verbose"'));

      warnSpy.mockRestore();
    });

    it('falls back to debug in development when LOG_LEVEL is invalid', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('LOG_LEVEL', 'superverbose');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { getDefaultLevel } = await import('./logger');
      const result = getDefaultLevel();

      expect(result).toBe('debug'); // falls back to development default
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('accepts all valid Pino levels without warning', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']) {
        vi.resetModules();
        vi.stubEnv('LOG_LEVEL', level);
        const { getDefaultLevel } = await import('./logger');
        expect(getDefaultLevel()).toBe(level);
        expect(warnSpy).not.toHaveBeenCalled();
      }

      warnSpy.mockRestore();
    });
  });

  // BUG-L-008: isDevelopment evaluated inside createLogger, not at module load
  describe('createLogger - isDevelopment isolation (BUG-L-008)', () => {
    it('uses production mode when NODE_ENV is overridden after module import', async () => {
      // Simulate a test environment that re-stubs NODE_ENV after import
      vi.stubEnv('NODE_ENV', 'production');
      const { createLogger } = await import('./logger');

      // Should not set up pino-pretty transport (production mode)
      // We verify by checking the logger works without errors
      expect(() => createLogger()).not.toThrow();
    });

    it('evaluates isDevelopment fresh on each createLogger() call', async () => {
      // First create in production
      vi.stubEnv('NODE_ENV', 'production');
      const { createLogger } = await import('./logger');
      const prodLogger = createLogger();
      expect(prodLogger).toBeDefined();

      // Now re-stub to test mode — would have failed if isDevelopment were frozen at module load
      vi.stubEnv('NODE_ENV', 'test');
      expect(() => createLogger()).not.toThrow();
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
        createLogger({
          webhookUrl: 'https://external-webhook.example.com/log',
          webhookSecret: 'collector-secret',
        })
      ).not.toThrow();
    });

    it('rejects a localhost URL impersonating a provider webhook', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const { createLogger } = await import('./logger');

      expect(() =>
        createLogger({
          webhookUrl: 'http://localhost:3001/log',
          webhookAdapter: 'slack',
        })
      ).toThrow('LOGGING_WEBHOOK_URL must use HTTPS in production');
    });

    it('does not initialize webhook transport in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      const { createLogger } = await import('./logger');

      expect(() =>
        createLogger({
          webhookUrl: 'http://dev-webhook.local/log',
          webhookAdapter: 'slack',
        })
      ).not.toThrow();
    });
  });

  describe('webhook adapters', () => {
    it.each([
      ['slack', 'https://collector.example.com/api/webhooks/slack'],
      ['discord', 'https://collector.example.com/api/webhooks/123/secret'],
    ] as const)('M-002 rejects the %s adapter on an arbitrary collector URL', async (webhookAdapter, webhookUrl) => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const { createLogger } = await import('./logger');

      expect(() => createLogger({ webhookUrl, webhookAdapter })).toThrow(/webhook URL/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('fails closed when a generic webhook has no sender secret', async () => {
      const { createLogger } = await import('./logger');

      expect(() => createLogger({
        webhookUrl: 'https://collector.example.com/logs',
        webhookAdapter: 'generic',
      })).toThrow('LOGGING_WEBHOOK_SECRET');
    });

    it('authenticates generic delivery with a Bearer header', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 202 } as Response);
      const { createLogger } = await import('./logger');
      const logger = createLogger({
        webhookUrl: 'https://collector.example.com/logs',
        webhookAdapter: 'generic',
        webhookSecret: 'runtime-collector-secret',
      });

      logger.info(LOG_EVENTS.API_REQUEST, 'generic webhook');
      await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());

      const [, init] = fetchSpy.mock.calls[0];
      expect(init?.headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer runtime-collector-secret',
      });
      expect(JSON.parse(String(init?.body))).toEqual([
        expect.objectContaining({ event: 'API_REQUEST', msg: 'generic webhook' }),
      ]);
    });

    it.each([
      ['slack', 'https://hooks.slack.com/services/T/B/secret', 'text'],
      ['discord', 'https://discord.com/api/webhooks/123/secret', 'content'],
    ] as const)('sends a valid %s payload shape', async (webhookAdapter, webhookUrl, payloadKey) => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 204 } as Response);
      const { createLogger } = await import('./logger');
      const logger = createLogger({ webhookUrl });

      logger.warn(LOG_EVENTS.API_ERROR, `${webhookAdapter} delivery`);
      await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());

      const [, init] = fetchSpy.mock.calls[0];
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({ [payloadKey]: expect.any(String) });
      expect(body[payloadKey]).toContain(`${webhookAdapter} delivery`);
      expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
    });

    it('writes a bounded non-recursive stderr warning for HTTP failures', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 503 } as Response);
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      const { createLogger } = await import('./logger');
      const logger = createLogger({
        webhookUrl: 'https://hooks.slack.com/services/T/B/secret',
        webhookAdapter: 'slack',
      });

      logger.error(LOG_EVENTS.API_ERROR, 'delivery failure');
      await vi.waitFor(() => expect(stderrSpy).toHaveBeenCalled());

      const warning = String(stderrSpy.mock.calls[0][0]);
      expect(warning).toContain('webhook delivery failed (HTTP 503)');
      expect([...warning].length).toBeLessThanOrEqual(201);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
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
        webhookSecret: 'collector-secret',
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
