/**
 * Same-origin request guard for plain route handlers.
 *
 * Next.js Server Actions enforce same-origin automatically (framework-level).
 * Plain `route.ts` handlers do NOT - they need an explicit check.
 *
 * Fail-closed: returns a 403 response if the Origin header is absent OR
 * does not match BASE_URL. Cross-origin POST requests from browsers always
 * include an Origin header, so legitimate same-origin calls will never be
 * rejected by this check.
 */
import { NextRequest, NextResponse } from 'next/server';
import { warn } from './log';

/**
 * Checks if the request originates from the same origin as the configured BASE_URL.
 *
 * **Return convention (inverse boolean):**
 * - Returns `null` (falsy) when the origin matches → caller should continue processing
 * - Returns a `NextResponse` (truthy) with 403 status when origin is invalid → caller should return this response
 *
 * Example usage:
 * ```ts
 * const originCheck = checkSameOrigin(request);
 * if (originCheck) return originCheck; // truthy = block the request
 * // null = allow the request to proceed
 * ```
 */
export function checkSameOrigin(request: NextRequest): NextResponse | null {
  const baseUrl = process.env.BASE_URL || process.env.APP_URL;
  if (!baseUrl) {
    warn('[origin-guard] BASE_URL is not configured, rejecting request');
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });
  }

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(baseUrl).origin;
  } catch {
    // BASE_URL is malformed - fail closed to avoid silently allowing anything.
    warn('[origin-guard] BASE_URL is malformed, rejecting request');
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });
  }

  const origin = request.headers.get('origin');

  // For GET requests without Origin header, we cannot verify same-origin.
  // The Referer header is user-agent-controlled and not a reliable CSRF token.
  // Fail closed — same behavior as POST without Origin.

  if (!origin) {
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });
  }

  let requestOrigin: string;
  try {
    requestOrigin = new URL(origin).origin;
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });
  }

  if (requestOrigin !== expectedOrigin) {
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });
  }

  return null; // same-origin - allow
}
