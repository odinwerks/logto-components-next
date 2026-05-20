import { captureMessage } from '../capture-message';
import { sanitize } from '../errors';
import { isDev } from '../dev-mode';

export type ActionResult = { ok: true } | { ok: false; error: string };
export type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function safeAction<T>(fn: () => Promise<T>): Promise<DataResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    // Preserve pre-sanitized errors (e.g. sanitize() in errors.ts sets name='SanitizedError')
    // so intentional codes like 'UNAUTHORIZED' survive the double-wrap.
    if (!isDev && err instanceof Error && err.name === 'SanitizedError') {
      return { ok: false, error: captureMessage(err) };
    }
    // Sanitize before extracting message — prevents upstream API detail leakage
    const safe = isDev ? err : sanitize(err, { fallback: 'INTERNAL_ERROR' });
    return { ok: false, error: captureMessage(safe) };
  }
}
