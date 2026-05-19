/**
 * Same-origin request guard for plain route handlers.
 *
 * Next.js Server Actions enforce same-origin automatically (framework-level).
 * Plain `route.ts` handlers do NOT — they need an explicit check.
 *
 * Fail-closed: returns a 403 response if the Origin header is absent OR
 * does not match the configured base URL. Cross-origin POST requests from
 * browsers always include an Origin header, so legitimate same-origin calls
 * will never be rejected by this check.
 */
import { NextRequest, NextResponse } from 'next/server';
import { warn } from './log';

export function checkSameOrigin(request: NextRequest): NextResponse | null {
  const baseUrl = process.env.BASE_URL || process.env.PUBLIC_BASE_URL || process.env.APP_URL;
  if (!baseUrl) {
    warn('[origin-guard] No BASE_URL, PUBLIC_BASE_URL, or APP_URL configured — rejecting request');
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });
  }

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(baseUrl).origin;
  } catch {
    warn('[origin-guard] BASE_URL is malformed, rejecting request');
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });
  }

  const origin = request.headers.get('origin');
  if (!origin) {
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });
  }

  let requestOrigin: string;
  try {
    requestOrigin = new URL(origin).origin;
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });
  }

  if (requestOrigin === expectedOrigin) return null; // same-origin — allow

  // In development, also allow localhost origins so devs can work locally
  // while BASE_URL is configured for their production domain.
  const isDev = process.env.NODE_ENV !== 'production';
  const isLocalhost = requestOrigin.startsWith('http://localhost:') ||
                      requestOrigin.startsWith('http://127.0.0.1:');
  if (isDev && isLocalhost) return null;

  return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });
}
