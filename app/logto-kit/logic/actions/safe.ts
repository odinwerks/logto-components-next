import { captureMessage } from '../capture-message';
import { sanitize } from '../errors';
import { warn } from '../log';
import { resolveClientCode } from '../verbosity';
import { requestContext } from '../../../lib/request-context';

export type ActionResult = { ok: true } | { ok: false; error: string };
export type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Wraps a server action body with sanitisation and verbosity resolution.
 *
 * - Sets `requestContext` with a fresh `requestId` when no context is active
 *   (e.g. a server action invoked directly from a client component). When a
 *   route handler already set the context (via `withLogger`), the existing
 *   context is reused so the action shares the route's `requestId`.
 * - Preserves `SanitizedError`/`ValidationError` messages (intentional codes).
 * - Applies `resolveClientCode` to the `error` value so deployment-level
 *   verbosity (`ERROR_VERBOSITY`) governs what code reaches the client.
 * - Return shape `{ ok, error }` / `{ ok, data }` is UNCHANGED.
 */
export async function safeAction<T>(fn: () => Promise<T>): Promise<DataResult<T>> {
  // Set requestId for server-action invocations that don't go through withLogger.
  const existing = requestContext.getStore();
  const run = existing
    ? <U>(f: () => U) => f()
    : <U>(f: () => U) => requestContext.run({ requestId: crypto.randomUUID() }, f);

  return run(async () => {
    try {
      const data = await fn();
      return { ok: true, data };
    } catch (err) {
      // NEXT_REDIRECT is a control-flow pseudo-error that Next.js uses to perform
      // server-side redirects. It must be re-thrown unchanged so the router can
      // pick it up. This matches the pattern in auth.ts (signInUser / signOutUser).
      if (
        err instanceof Error &&
        (err.message === 'NEXT_REDIRECT' || (err as { digest?: string }).digest?.startsWith('NEXT_REDIRECT'))
      ) {
        throw err;
      }

      // BUG-M02: production check is authoritative — test/debug modes cannot bypass sanitization
      // in production. isDebug is only true when NOT in production.
      const isDebug = process.env.NODE_ENV !== 'production' &&
        (process.env.DEBUG_ACTIONS === 'true' || process.env.NODE_ENV === 'test');

      // BUG-M03: Always sanitize before returning to client; log raw error server-side only in debug.
      // Preserve pre-sanitized errors (e.g. sanitize() in errors.ts sets name='SanitizedError')
      // so intentional codes like 'UNAUTHORIZED' survive the double-wrap.
      if (err instanceof Error && (err.name === 'SanitizedError' || err.name === 'ValidationError')) {
        const precise = (err as Error & { code?: string }).code;
        const display = captureMessage(err);
        return { ok: false, error: resolveClientCode(precise, display) };
      }
      const safe = sanitize(err, { fallback: 'INTERNAL_ERROR' });
      if (isDebug) {
        warn('[safeAction DEBUG]', err instanceof Error ? err.message : String(err));
      }
      // sanitize() didn't stamp .code; captureMessage(safe) returns 'INTERNAL_ERROR'.
      return { ok: false, error: resolveClientCode('INTERNAL_ERROR', captureMessage(safe)) };
    }
  });
}
