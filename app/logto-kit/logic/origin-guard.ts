/**
 * Same-origin request guard for plain route handlers.
 *
 * Next.js Server Actions enforce same-origin automatically (framework-level).
 * Plain `route.ts` handlers do NOT — they need an explicit check.
 *
 * Fail-closed: returns a 403 response if Origin/Referer is absent OR
 * does not match BASE_URL. Cross-origin POST requests from browsers always
 * include an Origin header, so legitimate same-origin calls will never be
 * rejected by this check.
 */
import { NextRequest, NextResponse } from 'next/server';

export function checkSameOrigin(request: NextRequest): NextResponse | null {
  const baseUrl = process.env.BASE_URL || process.env.APP_URL || 'http://localhost:3000';

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(baseUrl).origin;
  } catch {
    // BASE_URL is malformed — fail closed to avoid silently allowing anything.
    console.warn('[origin-guard] BASE_URL is malformed, rejecting request');
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });
  }

  const origin = request.headers.get('origin') ?? request.headers.get('referer');
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

  return null; // same-origin — allow
}
