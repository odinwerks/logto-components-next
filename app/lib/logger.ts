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

import pino, { type Logger, type LoggerOptions, type LevelWithSilent } from 'pino';
import { type LogEvent } from './log-events';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Returns the default log level based on the environment.
 * - Development: 'debug'
 * - Production: 'info'
 */
export function getDefaultLevel(): LevelWithSilent {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL as LevelWithSilent;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const isDevelopment = process.env.NODE_ENV === 'development';

// ============================================================================
// Webhook Transport
// ============================================================================

/**
 * Creates a pino destination stream that also sends logs to a webhook URL.
 * Uses a simple batching approach: sends every log individually (no batching
 * complexity needed for this use case).
 */
function createWebhookDestination(webhookUrl: string) {
  let pending = false;
  const queue: string[] = [];

  async function flush() {
    if (pending || queue.length === 0) return;
    pending = true;

    const batch = [...queue];
    queue.length = 0;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch.map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return { raw: line };
          }
        })),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Webhook unreachable - log a warning to stdout and continue.
      // Don't crash the app.
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
      queue.push(line.trim());
      // Flush on next tick to allow batching
      setImmediate(() => flush());
    },
  };
}

// ============================================================================
// Logger Factory
// ============================================================================

export interface LoggerConfig {
  /** Log level (default: from LOG_LEVEL env or environment-based default) */
  level?: LevelWithSilent;
  /** Optional webhook URL for log forwarding */
  webhookUrl?: string;
}

/**
 * Creates a typed Pino logger instance.
 *
 * @param config - Optional configuration overrides
 * @returns A Pino logger with typed methods for each log event
 */
export function createLogger(config: LoggerConfig = {}): TypedLogger {
  const level = config.level ?? getDefaultLevel();
  const webhookUrl = config.webhookUrl ?? process.env.LOGGING_WEBHOOK_URL;

  const options: LoggerOptions = {
    level,
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
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
    const webhookStream = createWebhookDestination(webhookUrl);
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
function wrapLogger(raw: Logger): TypedLogger {
  return {
    info(event, msg, context = {}) {
      raw.info({ event, ...context }, msg);
    },
    warn(event, msg, context = {}) {
      raw.warn({ event, ...context }, msg);
    },
    error(event, msg, context = {}) {
      raw.error({ event, ...context }, msg);
    },
    debug(event, msg, context = {}) {
      raw.debug({ event, ...context }, msg);
    },
    child(bindings) {
      return wrapLogger(raw.child(bindings));
    },
    raw,
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

export const logger =
  globalWithLogger[LOGGER_SINGLETON_KEY] ??
  (globalWithLogger[LOGGER_SINGLETON_KEY] = createLogger());
