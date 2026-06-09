/**
 * Debug logging utility - only outputs when DEBUG=true.
 * Use instead of console.log/console.warn for development traces
 * that should not appear in production logs.
 */
import { isDev } from './dev-mode';
import { debug as logDebug, warn, error } from './log';

const DEBUG = isDev && process.env.DEBUG === 'true';

function formatArgs(args: unknown[]): string {
  return args.map(a => {
    if (typeof a === 'string') return a;
    try {
      return JSON.stringify(a);
    } catch {
      return String(a);
    }
  }).join(' ');
}

export function debugLog(...args: unknown[]): void {
  if (DEBUG) {
    logDebug('[DEBUG]', formatArgs(args));
  }
}

export function debugWarn(...args: unknown[]): void {
  if (DEBUG) {
    warn('[DEBUG]', formatArgs(args));
  }
}

export function debugError(...args: unknown[]): void {
  if (DEBUG) {
    error('[DEBUG]', formatArgs(args));
  }
}
