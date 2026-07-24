/**
 * ============================================================================
 * Client-side logger facade
 * ============================================================================
 *
 * A thin, silencable facade that mirrors the server `log` API but routes to
 * `console.*` only (no Pino on the client) and applies the same `scrubLogString`
 * redaction for JWTs/Bearer tokens (defense-in-depth, so secrets don't hit
 * devtools even in dev).
 *
 * Silenced via `NEXT_PUBLIC_CLIENT_LOGS=false`. In production builds, consider
 * setting this to suppress all client-side console output.
 *
 * Usage:
 *   import { clientLog } from './client-logger';
 *   clientLog.error('Protected', 'Permission load failed:', err);
 *   clientLog.warn('setActiveOrg', 'Persist failed:', r.error);
 */

import { scrubLogString } from '../../lib/scrub-log-string';

type ClientLogLevel = 'info' | 'warn' | 'error' | 'debug';

// NEXT_PUBLIC so it can be tuned per-deployment; 'false' silences all output.
// Default: enabled (logs appear in devtools). Set NEXT_PUBLIC_CLIENT_LOGS=false
// in production to suppress.
const ENABLED = process.env.NEXT_PUBLIC_CLIENT_LOGS !== 'false';

function emit(level: ClientLogLevel, scope: string, ...args: unknown[]): void {
  if (!ENABLED) return;
  const scrubbed = args.map((a) => {
    if (typeof a === 'string') return scrubLogString(a);
    if (a instanceof Error) {
      const scrubbedErr = new Error(scrubLogString(a.message));
      scrubbedErr.name = a.name;
      if (a.stack) scrubbedErr.stack = scrubLogString(a.stack);
      return scrubbedErr;
    }
    return a;
  });
  try {
    console[level](`[${scope}]`, ...scrubbed);
  } catch {
    /* best-effort — never throw from a logger */
  }
}

export const clientLog = {
  info: (scope: string, ...a: unknown[]): void => emit('info', scope, ...a),
  warn: (scope: string, ...a: unknown[]): void => emit('warn', scope, ...a),
  error: (scope: string, ...a: unknown[]): void => emit('error', scope, ...a),
  debug: (scope: string, ...a: unknown[]): void => emit('debug', scope, ...a),
};
