import { captureMessage } from '../capture-message';
import { sanitize } from '../errors';
import { warn } from '../log';

export type ActionResult = { ok: true } | { ok: false; error: string };
export type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function safeAction<T>(fn: () => Promise<T>): Promise<DataResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    // BUG-M02: production check is authoritative — test/debug modes cannot bypass sanitization
    // in production. isDebug is only true when NOT in production.
    const isDebug = process.env.NODE_ENV !== 'production' &&
      (process.env.DEBUG_ACTIONS === 'true' || process.env.NODE_ENV === 'test');

    // BUG-M03: Always sanitize before returning to client; log raw error server-side only in debug.
    // Preserve pre-sanitized errors (e.g. sanitize() in errors.ts sets name='SanitizedError')
    // so intentional codes like 'UNAUTHORIZED' survive the double-wrap.
    if (err instanceof Error && (err.name === 'SanitizedError' || err.name === 'ValidationError')) {
      return { ok: false, error: captureMessage(err) };
    }
    const safe = sanitize(err, { fallback: 'INTERNAL_ERROR' });
    if (isDebug) {
      warn('[safeAction DEBUG]', err instanceof Error ? err.message : String(err));
    }
    return { ok: false, error: captureMessage(safe) };
  }
}