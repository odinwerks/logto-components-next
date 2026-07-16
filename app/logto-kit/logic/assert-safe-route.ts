import { ValidationError } from './validation';

/**
 * Validates that routeTo resolves to the same origin as `base`.
 *
 * Uses the WHATWG URL parser's origin-equality check instead of substring
 * matching. This closes the backslash bypass (BUG-010): the parser normalises
 * `\` to `/` inside special schemes, so `/\evil.com` resolves to
 * `http://evil.com/` whose origin differs from `base` and is therefore
 * rejected — along with all scheme-relative and absolute-URL tricks.
 */
export function assertSafeRouteTo(routeTo: string, base: string): void {
  try {
    const resolved = new URL(routeTo, base);
    const baseUrl = new URL(base);
    if (resolved.origin !== baseUrl.origin) {
      throw new ValidationError('INVALID_ROUTE', routeTo);
    }
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError('INVALID_ROUTE', routeTo);
  }
}
