/**
 * ============================================================================
 * Shared Logger - configurable backend routing
 * ============================================================================
 *
 * Routes log output to console, Pino, or both based on LOG_BACKEND env var:
 *
 *   LOG_BACKEND=console  → console.* only
 *   LOG_BACKEND=pino     → Pino structured JSON only
 *   LOG_BACKEND=both     → both (default)
 *
 * Two APIs are exported:
 *
 *   1. Unstructured (console-style):
 *        import { log, warn, error, debug } from './log';
 *        warn('[upload] HTTP 500:', body);
 *
 *   2. Structured (Pino-style, event-driven):
 *        import { logEvent } from './log';
 *        import { LOG_EVENTS } from '../../lib/log-events';
 *        logEvent.info(LOG_EVENTS.AUTH_SIGN_IN, 'User signed in', { userId });
 *
 * In "both" mode (default), unstructured calls go to console.log / console.warn /
 * console.error AND to Pino as structured { msg, args } entries.
 *
 * In "console" mode, only console.* is used.
 * In "pino" mode, only Pino is used.
 *
 * This file is safe to import from any server-side context:
 *   - Server actions ('use server')
 *   - API routes
 *   - Middleware
 *   - Utility modules imported by server-side code
 *
 * It does NOT work in client components - Pino is a server-only library.
 */

import { LOG_EVENTS, type LogEvent } from '../../lib/log-events';
import { createLogger, type TypedLogger } from '../../lib/logger';

// ============================================================================
// Backend selection
// ============================================================================

type LogBackend = 'console' | 'pino' | 'both';

function getBackend(): LogBackend {
  const val = process.env.LOG_BACKEND?.toLowerCase();
  if (val === 'console' || val === 'pino') return val;
  return 'both';
}

const backend = getBackend();
const useConsole = backend === 'console' || backend === 'both';
const usePino = backend === 'pino' || backend === 'both';

// ============================================================================
// Pino instance (lazy - only created if pino or both mode is active)
// ============================================================================

let _pinoLogger: TypedLogger | null = null;

function getPinoLogger(): TypedLogger {
  if (!_pinoLogger) _pinoLogger = createLogger();
  return _pinoLogger;
}

// ============================================================================
// Structured event logger (Pino-style)
// ============================================================================

function stringifyArgs(args: unknown[]): string {
  try {
    return args
      .map((a) => {
        if (a instanceof Error) return a.message;
        if (typeof a === 'string') return a;
        try { return JSON.stringify(a); } catch { return String(a); }
      })
      .join(' ');
  } catch {
    return '[unserializable]';
  }
}

/**
 * Converts console-style arguments into a message string.
 * The first string argument is treated as a format prefix.
 */
function formatMessage(args: unknown[]): { msg: string; detail?: string } {
  if (args.length === 0) return { msg: '' };
  if (args.length === 1) {
    return { msg: typeof args[0] === 'string' ? args[0] : String(args[0]) };
  }
  const [first, ...rest] = args;
  const prefix = typeof first === 'string' ? first : String(first);
  const detail = stringifyArgs(rest);
  return { msg: prefix, detail };
}

// ============================================================================
// Unstructured API (console-style)
// ============================================================================

export function log(...args: unknown[]): void {
  if (useConsole) {
    try { console.log(...args); } catch { /* best-effort */ }
  }
  if (usePino) {
    const { msg, detail } = formatMessage(args);
    getPinoLogger().info(
      LOG_EVENTS.GENERIC_LOG,
      msg,
      detail ? { detail } : undefined,
    );
  }
}

export function warn(...args: unknown[]): void {
  if (useConsole) {
    try { console.warn(...args); } catch { /* best-effort */ }
  }
  if (usePino) {
    const { msg, detail } = formatMessage(args);
    getPinoLogger().warn(
      LOG_EVENTS.GENERIC_LOG,
      msg,
      detail ? { detail } : undefined,
    );
  }
}

export function error(...args: unknown[]): void {
  if (useConsole) {
    try { console.error(...args); } catch { /* best-effort */ }
  }
  if (usePino) {
    const { msg, detail } = formatMessage(args);
    getPinoLogger().error(
      LOG_EVENTS.GENERIC_LOG,
      msg,
      detail ? { detail } : undefined,
    );
  }
}

export function debug(...args: unknown[]): void {
  if (useConsole) {
    try { console.debug(...args); } catch { /* best-effort */ }
  }
  if (usePino) {
    const { msg, detail } = formatMessage(args);
    getPinoLogger().debug(
      LOG_EVENTS.GENERIC_LOG,
      msg,
      detail ? { detail } : undefined,
    );
  }
}

// ============================================================================
// Structured API (Pino-style, event-driven)
// ============================================================================

/**
 * Structured event logger. Use this for typed, event-driven logging:
 *
 *   logEvent.info(LOG_EVENTS.AUTH_SIGN_IN, 'User signed in', { userId });
 *   logEvent.error(LOG_EVENTS.API_ERROR, 'Request failed', { statusCode: 500 });
 *
 * When backend is "console", writes to console in a structured format.
 * When backend is "pino", writes through Pino.
 * When backend is "both", writes through both.
 */
export const logEvent: TypedLogger = {
  info(event: LogEvent, msg: string, context: Record<string, unknown> = {}) {
    if (useConsole) {
      try { console.log(`[${event}]`, msg, Object.keys(context).length ? context : ''); } catch { /* best-effort */ }
    }
    if (usePino) {
      getPinoLogger().info(event, msg, context);
    }
  },
  warn(event: LogEvent, msg: string, context: Record<string, unknown> = {}) {
    if (useConsole) {
      try { console.warn(`[${event}]`, msg, Object.keys(context).length ? context : ''); } catch { /* best-effort */ }
    }
    if (usePino) {
      getPinoLogger().warn(event, msg, context);
    }
  },
  error(event: LogEvent, msg: string, context: Record<string, unknown> = {}) {
    if (useConsole) {
      try { console.error(`[${event}]`, msg, Object.keys(context).length ? context : ''); } catch { /* best-effort */ }
    }
    if (usePino) {
      getPinoLogger().error(event, msg, context);
    }
  },
  debug(event: LogEvent, msg: string, context: Record<string, unknown> = {}) {
    if (useConsole) {
      try { console.debug(`[${event}]`, msg, Object.keys(context).length ? context : ''); } catch { /* best-effort */ }
    }
    if (usePino) {
      getPinoLogger().debug(event, msg, context);
    }
  },
  child(bindings: Record<string, unknown>) {
    const pinoChild = getPinoLogger().child(bindings);
    // Return a new logEvent-like object with bound context
    return {
      info(event: LogEvent, msg: string, context: Record<string, unknown> = {}) {
        if (useConsole) {
          try { console.log(`[${event}]`, msg, { ...bindings, ...context }); } catch { /* best-effort */ }
        }
        if (usePino) pinoChild.info(event, msg, { ...bindings, ...context });
      },
      warn(event: LogEvent, msg: string, context: Record<string, unknown> = {}) {
        if (useConsole) {
          try { console.warn(`[${event}]`, msg, { ...bindings, ...context }); } catch { /* best-effort */ }
        }
        if (usePino) pinoChild.warn(event, msg, { ...bindings, ...context });
      },
      error(event: LogEvent, msg: string, context: Record<string, unknown> = {}) {
        if (useConsole) {
          try { console.error(`[${event}]`, msg, { ...bindings, ...context }); } catch { /* best-effort */ }
        }
        if (usePino) pinoChild.error(event, msg, { ...bindings, ...context });
      },
      debug(event: LogEvent, msg: string, context: Record<string, unknown> = {}) {
        if (useConsole) {
          try { console.debug(`[${event}]`, msg, { ...bindings, ...context }); } catch { /* best-effort */ }
        }
        if (usePino) pinoChild.debug(event, msg, { ...bindings, ...context });
      },
      child: (childBindings: Record<string, unknown>) =>
        logEvent.child({ ...bindings, ...childBindings }),
      raw: pinoChild.raw,
    };
  },
  raw: getPinoLogger().raw,
};
