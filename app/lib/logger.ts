/**
 * Structured logger built on Pino.
 *
 * Features:
 * - JSON output in production, pretty-printed in development
 * - Environment-aware default log levels (debug in dev, info in prod)
 * - Optional HTTP webhook transport via LOGGING_WEBHOOK_URL
 * - Typed event registry for compile-time safety
 *
 * Usage:
 *   import { logger } from './logger';
 *   import { LOG_EVENTS } from './log-events';
 *
 *   logger.info(LOG_EVENTS.AUTH_SIGN_IN, 'User signed in', { userId: '123' });
 *   logger.error(LOG_EVENTS.API_ERROR, 'Request failed', { statusCode: 500 });
 */

import pino, {
  type ChildLoggerOptions,
  type Logger,
  type LoggerOptions,
  type LevelWithSilent,
} from 'pino';
import { format } from 'node:util';
import { type LogEvent } from './log-events';
import {
  redactSensitive,
  scrubArgs,
  scrubLogString,
  SENSITIVE_KEYS,
} from './scrub-log-string';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Returns the default log level based on the environment.
 * - Development: 'debug'
 * - Production: 'info'
 * Validates LOG_LEVEL env var against valid Pino levels; falls back to default
 * with a console warning if invalid.
 */

const VALID_LOG_LEVELS = new Set<string>(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']);

export function getDefaultLevel(): LevelWithSilent {
  if (process.env.LOG_LEVEL) {
    if (VALID_LOG_LEVELS.has(process.env.LOG_LEVEL)) {
      return process.env.LOG_LEVEL as LevelWithSilent;
    }
    // Invalid level — warn and fall through to environment-based default
    console.warn(
      `[Logger] Invalid LOG_LEVEL "${process.env.LOG_LEVEL}". ` +
      `Must be one of: ${[...VALID_LOG_LEVELS].join(', ')}. Falling back to default.`
    );
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

// ============================================================================
// Sensitive Key Redaction
// ============================================================================

// IMPORTANT: Sensitive keys (token, password, secret, key, authorization,
// apiKey, api_key, accessToken, refreshToken, idToken, m2mToken, and the
// snake_case OAuth/OIDC variants access_token, refresh_token, id_token,
// client_secret, code, state) are automatically redacted via Pino native
// `redact.paths` below and the shared `redactSensitive` function (imported
// from './scrub-log-string'). Do NOT log credentials in any form.
//
// `redactSensitive` and the `SENSITIVE_KEYS` regex live in scrub-log-string.ts
// (the scrub leaf module) so they can be shared with `scrubArgs` for the
// console log path without creating a circular import.

// ============================================================================
// Webhook Transport
// ============================================================================

/**
 * Creates a pino destination stream that also sends logs to a webhook URL.
 * Uses a simple batching approach: sends every log individually (no batching
 * complexity needed for this use case).
 *
 * Security:
 * - Enforces authenticated HTTPS generic delivery.
 * - Restricts provider adapters to their official HTTPS webhook URL patterns.
 * - Non-JSON log lines are scrubbed rather than forwarded verbatim.
 */
export type WebhookAdapter = 'generic' | 'slack' | 'discord';

interface WebhookDestinationConfig {
  adapter: WebhookAdapter;
  secret?: string;
}

function limitCodePoints(value: string, maximum: number): string {
  let codePoints = 0;
  let end = 0;
  for (const codePoint of value) {
    if (codePoints === maximum) return value.slice(0, end);
    end += codePoint.length;
    codePoints++;
  }
  return value;
}

function resolveWebhookAdapter(webhookUrl: URL, configured?: string): WebhookAdapter {
  if (configured) {
    const normalized = configured.toLowerCase();
    if (normalized === 'generic' || normalized === 'slack' || normalized === 'discord') {
      return normalized;
    }
    throw new Error('LOGGING_WEBHOOK_ADAPTER must be one of: generic, slack, discord');
  }

  // Preserve the documented Slack/Discord URL-only setup while still routing
  // through explicit, provider-compatible adapters.
  if (webhookUrl.hostname === 'hooks.slack.com') return 'slack';
  if (
    (webhookUrl.hostname === 'discord.com' || webhookUrl.hostname === 'discordapp.com') &&
    webhookUrl.pathname.startsWith('/api/webhooks/')
  ) {
    return 'discord';
  }
  return 'generic';
}

function makeWebhookBody(adapter: WebhookAdapter, records: unknown[]): string {
  if (adapter === 'generic') return JSON.stringify(records);

  const text = records.map((record) => JSON.stringify(record)).join('\n');
  if (adapter === 'slack') {
    return JSON.stringify({ text: limitCodePoints(text, 4000) });
  }
  return JSON.stringify({ content: limitCodePoints(text, 2000) });
}

function writeWebhookFailure(status?: number): void {
  const detail = status === undefined
    ? '[logger] webhook delivery failed'
    : `[logger] webhook delivery failed (HTTP ${status})`;
  // Direct stderr output is intentionally non-recursive: webhook failure must
  // never enqueue another webhook delivery attempt.
  try {
    process.stderr.write(`${scrubLogString(detail)}\n`);
  } catch {
    // Logging failures are best-effort and must not crash the application.
  }
}

function createWebhookDestination(
  webhookUrl: string,
  { adapter, secret }: WebhookDestinationConfig,
) {
  let parsed: URL;
  try {
    parsed = new URL(webhookUrl);
  } catch {
    throw new Error('LOGGING_WEBHOOK_URL must be a valid URL');
  }

  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error(
      `LOGGING_WEBHOOK_URL must use HTTPS in production. Got: ${parsed.protocol}`
    );
  }

  if (adapter === 'slack') {
    const isSlackWebhook =
      parsed.protocol === 'https:' &&
      parsed.hostname === 'hooks.slack.com' &&
      parsed.port === '' &&
      parsed.username === '' &&
      parsed.password === '' &&
      /^\/services\/[^/]+\/[^/]+\/[^/]+\/?$/u.test(parsed.pathname);
    if (!isSlackWebhook) {
      throw new Error('Slack webhook URL must be an HTTPS hooks.slack.com/services/... URL');
    }
  } else if (adapter === 'discord') {
    const isDiscordWebhook =
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'discord.com' || parsed.hostname === 'discordapp.com') &&
      parsed.port === '' &&
      parsed.username === '' &&
      parsed.password === '' &&
      /^\/api\/webhooks\/[^/]+\/[^/]+\/?$/u.test(parsed.pathname);
    if (!isDiscordWebhook) {
      throw new Error('Discord webhook URL must be an HTTPS discord.com/api/webhooks/... URL');
    }
  } else {
    if (parsed.protocol !== 'https:') {
      throw new Error('Generic LOGGING_WEBHOOK_URL must use HTTPS');
    }
    if (!secret?.trim()) {
      throw new Error('LOGGING_WEBHOOK_SECRET is required for the generic webhook adapter');
    }
    if (/[\r\n]/u.test(secret)) {
      throw new Error('LOGGING_WEBHOOK_SECRET contains invalid characters');
    }
  }

  const MAX_QUEUE_SIZE = 5000;
  let pending = false;
  const queue: string[] = [];

  async function flush() {
    if (pending || queue.length === 0) return;
    pending = true;

    const batch = [...queue];
    queue.length = 0;

    try {
      const records = batch.map((line) => {
        try {
          return redactSensitive(JSON.parse(line));
        } catch {
          // Non-JSON line: do NOT forward the raw string (it may contain
          // un-redacted credentials that bypassed structured logging).
          return { raw: '[non-JSON log line — content scrubbed]' };
        }
      });
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adapter === 'generic') headers.Authorization = `Bearer ${secret!.trim()}`;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: makeWebhookBody(adapter, records),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) writeWebhookFailure(response.status);
    } catch {
      writeWebhookFailure();
    } finally {
      pending = false;
      // Flush any new items that arrived while we were sending
      if (queue.length > 0) {
        setImmediate(() => flush());
      }
    }
  }

  return {
    write(line: string) {
      if (queue.length >= MAX_QUEUE_SIZE) {
        queue.shift();
        process.stdout.write('[logger] webhook queue full, dropping oldest log line\n');
      }
      queue.push(line.trim());
      // Flush on next tick to allow batching
      setImmediate(() => flush());
    },
  };
}

/**
 * Scrub Pino arguments both before and after printf-style interpolation.
 * Pre-scrubbing protects structured interpolation values; post-scrubbing
 * catches credential patterns assembled by formatting and applies the message
 * size cap to the final emitted string rather than to each fragment.
 */
function redactInterpolationDescriptors(value: unknown): unknown {
  // Reuse the M-012 traversal first so ordinary sensitive keys, class fields,
  // and custom toJSON output are safe before util.format can serialize them.
  const redacted = redactSensitive(value);
  const visited = new WeakSet<object>();

  const isSensitiveDescriptorName = (candidate: unknown): boolean => {
    if (typeof candidate !== 'string') return false;
    // A descriptor's `key` property is itself redacted by M-012. Treat that
    // marker conservatively as sensitive; otherwise reuse the shared key list,
    // including its separator-insensitive aliases.
    if (candidate === '[REDACTED]') return true;
    return SENSITIVE_KEYS.test(candidate) ||
      SENSITIVE_KEYS.test(candidate.replace(/[^A-Za-z0-9]/gu, ''));
  };

  const visit = (current: unknown): void => {
    if (current === null || typeof current !== 'object' || visited.has(current)) return;
    visited.add(current);

    const record = current as Record<string, unknown>;
    const hasOwn = (key: string) => Object.prototype.hasOwnProperty.call(record, key);
    if (hasOwn('value')) {
      for (const descriptorKey of ['key', 'name', 'field'] as const) {
        if (!hasOwn(descriptorKey)) continue;
        let descriptorName: unknown;
        try {
          descriptorName = Reflect.get(record, descriptorKey);
        } catch {
          descriptorName = '[REDACTED]';
        }
        if (isSensitiveDescriptorName(descriptorName)) {
          // redactSensitive returns writable serialization-safe copies for
          // traversable objects, so this never mutates the caller's input.
          Object.defineProperty(record, 'value', {
            configurable: true,
            enumerable: true,
            writable: true,
            value: '[REDACTED]',
          });
          break;
        }
      }
    }

    for (const key of Object.keys(record)) {
      let child: unknown;
      try {
        child = Reflect.get(record, key);
      } catch {
        continue;
      }
      visit(child);
    }
  };

  visit(redacted);
  return redacted;
}

function scrubPrintfInterpolationArgs(
  formatString: string,
  interpolationArgs: unknown[],
): [string, ...unknown[]] {
  // Redact every interpolation value before token-specific formatting. Node's
  // %s also inspects object values, so limiting descriptor redaction to the
  // JSON/object tokens would expose descriptor.value through %s.
  const scrubbedArgs = interpolationArgs.map(redactInterpolationDescriptors);
  let rewrittenFormat = '';
  let cursor = 0;
  let argumentIndex = 0;

  // Keep this in sync with node:util's printf tokens. %% is non-consuming;
  // every other token is checked through the same pre-format scrub path so
  // JSON/inspect quoting (%j/%o/%O) cannot hide a credential from the regex.
  for (const match of formatString.matchAll(/%[sdifjoOc%]/g)) {
    const token = match[0];
    const tokenIndex = match.index;
    rewrittenFormat += formatString.slice(cursor, tokenIndex);
    cursor = tokenIndex + token.length;

    if (token === '%%' || argumentIndex >= scrubbedArgs.length) {
      rewrittenFormat += token;
      continue;
    }

    // String interpolation values get their own pattern scrub even without a
    // Bearer prefix. Objects have already received M-012 deep-key redaction
    // plus descriptor-aware value redaction above, regardless of token.
    const interpolationArg = scrubbedArgs[argumentIndex];
    if (typeof interpolationArg === 'string') {
      scrubbedArgs[argumentIndex] = scrubLogString(interpolationArg);
    }

    const candidate = format('%s', scrubbedArgs[argumentIndex]);
    const formattedPrefix = format(
      rewrittenFormat,
      ...scrubbedArgs.slice(0, argumentIndex),
    );
    // A short probe avoids the message-length cap affecting the comparison,
    // while retaining enough preceding context for every credential pattern.
    const probe = `${formattedPrefix.slice(-64)}${candidate.slice(0, 128)}`;

    if (scrubLogString(probe) !== probe) {
      scrubbedArgs[argumentIndex] = '[REDACTED]';
      rewrittenFormat += '%s';
    } else {
      rewrittenFormat += token;
    }
    argumentIndex++;
  }

  rewrittenFormat += formatString.slice(cursor);
  return [rewrittenFormat, ...scrubbedArgs];
}

function scrubPinoLogArgs(args: unknown[]): unknown[] {
  const scrubbed = scrubArgs(args);
  if (scrubbed.length === 0) return scrubbed;

  const messageIndex = typeof scrubbed[0] === 'string'
    ? 0
    : typeof scrubbed[1] === 'string'
      ? 1
      : -1;
  if (messageIndex === -1) return scrubbed;

  const messageArgs = scrubPrintfInterpolationArgs(
    scrubbed[messageIndex] as string,
    scrubbed.slice(messageIndex + 1),
  );
  const formattedMessage = format(...messageArgs);
  // Always scrub the complete formatted message. This catches credential
  // patterns emitted by any interpolation position, including later mixed
  // %j/%o/%O tokens whose serialization changes quoting or token boundaries.
  const scrubbedMessage = scrubLogString(formattedMessage);
  return [
    ...scrubbed.slice(0, messageIndex),
    scrubbedMessage,
  ];
}

// ============================================================================
// Logger Factory
// ============================================================================

export interface LoggerConfig {
  /** Log level (default: from LOG_LEVEL env or environment-based default) */
  level?: LevelWithSilent;
  /** Optional webhook URL for log forwarding */
  webhookUrl?: string;
  /** Webhook payload/authentication adapter (auto-detected for Slack/Discord URLs) */
  webhookAdapter?: WebhookAdapter;
  /** Bearer credential required by the generic webhook adapter */
  webhookSecret?: string;
}

/**
 * Creates a typed Pino logger instance.
 *
 * @param config - Optional configuration overrides
 * @returns A Pino logger with typed methods for each log event
 */
export function createLogger(config: LoggerConfig = {}): TypedLogger {
  // Evaluate isDevelopment at call time (not module load time) to support test/edge isolation.
  const isDevelopment = process.env.NODE_ENV === 'development';
  const level = config.level ?? getDefaultLevel();
  const webhookUrl = config.webhookUrl ?? process.env.LOGGING_WEBHOOK_URL;

  const options: LoggerOptions = {
    level,
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    hooks: {
      logMethod(args, method) {
        method.apply(this, scrubPinoLogArgs(args) as Parameters<typeof method>);
      },
    },
    redact: {
      paths: [
        // Core sensitive keys
        'token', 'password', 'secret', 'key', 'authorization', 'apiKey', 'api_key', 'accessToken', 'refreshToken', 'idToken', 'm2mToken',
        '*.token', '*.password', '*.secret', '*.key', '*.authorization', '*.apiKey', '*.api_key', '*.accessToken', '*.refreshToken', '*.idToken', '*.m2mToken',
        '*.*.token', '*.*.password', '*.*.secret', '*.*.key', '*.*.authorization', '*.*.apiKey', '*.*.api_key', '*.*.accessToken', '*.*.refreshToken', '*.*.idToken', '*.*.m2mToken',
        // Stack traces and error details (can contain credentials from Error.message / Error.stack)
        'stack', 'error',
        '*.stack', '*.error',
        '*.*.stack', '*.*.error',
        // OAuth / OIDC token field names (snake_case variants)
        'access_token', 'refresh_token', 'id_token', 'client_secret', 'code', 'state',
        '*.access_token', '*.refresh_token', '*.id_token', '*.client_secret', '*.code', '*.state',
        '*.*.access_token', '*.*.refresh_token', '*.*.id_token', '*.*.client_secret', '*.*.code', '*.*.state',
      ],
      censor: '[REDACTED]',
    },
  };

  if (isDevelopment) {
    // Development: pretty-printed output to stderr
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };
  }

  let logger: Logger;

  if (webhookUrl && !isDevelopment) {
    // Production with webhook: use multistream
    const parsedWebhookUrl = new URL(webhookUrl);
    const webhookAdapter = resolveWebhookAdapter(
      parsedWebhookUrl,
      config.webhookAdapter ??
        process.env.LOGGING_WEBHOOK_ADAPTER ??
        process.env.LOGGING_WEBHOOK_TYPE,
    );
    const webhookStream = createWebhookDestination(webhookUrl, {
      adapter: webhookAdapter,
      secret: config.webhookSecret ?? process.env.LOGGING_WEBHOOK_SECRET,
    });
    logger = pino(
      options,
      pino.multistream([
        { stream: process.stdout, level },
        { stream: webhookStream, level },
      ])
    );
  } else {
    logger = pino(options);
  }

  return wrapLogger(logger);
}

// ============================================================================
// Typed Logger Interface
// ============================================================================

export interface TypedLogger {
  /** Log an info-level event */
  info(event: LogEvent, msg: string, context?: Record<string, unknown>): void;
  /** Log a warn-level event */
  warn(event: LogEvent, msg: string, context?: Record<string, unknown>): void;
  /** Log an error-level event */
  error(event: LogEvent, msg: string, context?: Record<string, unknown>): void;
  /** Log a debug-level event */
  debug(event: LogEvent, msg: string, context?: Record<string, unknown>): void;
  /** Create a child logger with bound context */
  child(bindings: Record<string, unknown>): TypedLogger;
  /** Access the underlying Pino logger (for advanced use) */
  readonly raw: Logger;
}

/**
 * Wraps a Pino logger with typed methods that enforce the LogEvent type.
 */
const RAW_LOGGER_PROXIES = new WeakMap<Logger, Logger>();

function secureRawLogger(raw: Logger): Logger {
  const existing = RAW_LOGGER_PROXIES.get(raw);
  if (existing) return existing;

  const secured = new Proxy(raw, {
    get(target, property) {
      if (property === 'child') {
        return (bindings: Record<string, unknown>, options?: ChildLoggerOptions) =>
          secureRawLogger(target.child(
            redactSensitive(bindings) as Record<string, unknown>,
            options,
          ));
      }
      if (property === 'setBindings') {
        const setBindings: Logger['setBindings'] = (bindings) =>
          target.setBindings(redactSensitive(bindings) as Record<string, unknown>);
        return setBindings;
      }

      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
    set(target, property, value) {
      return Reflect.set(target, property, value, target);
    },
  });
  RAW_LOGGER_PROXIES.set(raw, secured);
  return secured;
}

function wrapLogger(raw: Logger): TypedLogger {
  const securedRaw = secureRawLogger(raw);
  return {
    info(event, msg, context = {}) {
      raw.info({ event, ...redactSensitive(context) as Record<string, unknown> }, scrubLogString(msg));
    },
    warn(event, msg, context = {}) {
      raw.warn({ event, ...redactSensitive(context) as Record<string, unknown> }, scrubLogString(msg));
    },
    error(event, msg, context = {}) {
      raw.error({ event, ...redactSensitive(context) as Record<string, unknown> }, scrubLogString(msg));
    },
    debug(event, msg, context = {}) {
      raw.debug({ event, ...redactSensitive(context) as Record<string, unknown> }, scrubLogString(msg));
    },
    child(bindings) {
      return wrapLogger(raw.child(redactSensitive(bindings) as Record<string, unknown>));
    },
    raw: securedRaw,
  };
}

// ============================================================================
// Default Export
// ============================================================================

/**
 * Default logger instance for the application.
 * Import and use directly in server actions and API routes.
 */
const LOGGER_SINGLETON_KEY = '__appLoggerSingleton__';

type GlobalWithLogger = typeof globalThis & {
  [LOGGER_SINGLETON_KEY]?: TypedLogger;
};

const globalWithLogger = globalThis as GlobalWithLogger;

function createLazyLogger(factory: () => TypedLogger): TypedLogger {
  let resolved: TypedLogger | undefined;
  const getLogger = () => resolved ??= factory();

  return {
    info(event, msg, context) {
      getLogger().info(event, msg, context);
    },
    warn(event, msg, context) {
      getLogger().warn(event, msg, context);
    },
    error(event, msg, context) {
      getLogger().error(event, msg, context);
    },
    debug(event, msg, context) {
      getLogger().debug(event, msg, context);
    },
    child(bindings) {
      return createLazyLogger(() => getLogger().child(bindings));
    },
    get raw() {
      return getLogger().raw;
    },
  };
}

export const logger =
  globalWithLogger[LOGGER_SINGLETON_KEY] ??
  (globalWithLogger[LOGGER_SINGLETON_KEY] = createLazyLogger(() => createLogger()));
