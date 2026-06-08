/**
 * Client-safe error message extraction.
 * Safe to call on either side of the server/client boundary.
 *
 * - Error instances   → `err.message` + Next.js digest if present
 * - Object with .msg  → that
 * - Strings            → the string directly
 * - Anything else      → `String(err)`
 */
export function captureMessage(err: unknown): string {
  if (err instanceof Error) {
    const base = err.message || String(err);
    // Never leak Next.js internal digest hash to client responses.
    return base;
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
