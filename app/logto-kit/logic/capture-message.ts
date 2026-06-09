/**
 * Client-safe error message extraction.
 * Safe to call on either side of the server/client boundary.
 *
 * - Error instances   → `err.message` (Next.js digest hash stripped)
 * - Object with .msg  → that
 * - Strings            → the string directly
 * - Anything else      → `String(err)`
 */
export function captureMessage(err: unknown): string {
  if (err instanceof Error) {
    const base = err.message || String(err);
    // Strip Next.js internal digest hash if appended to message.
    // Next.js appends "\n\ndigest: <hash>" to error messages for
    // server-side debugging — this must never reach client responses.
    return base.split('\n\ndigest:')[0];
  }
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  try {
    return String(err);
  } catch {
    return 'Unknown error';
  }
}
