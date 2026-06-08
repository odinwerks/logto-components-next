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

export function checkSameOrigin(
  request: NextRequest,
  extraOrigins?: string[]
): NextResponse | null {
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

  let origin = request.headers.get('origin');

  if (!origin && request.method === 'GET') {
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        origin = new URL(referer).origin;
      } catch {}
    }
  }

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
    // Also allow any additionally configured origins (e.g. Logto ENDPOINT)
    const allowed = extraOrigins ?? [];
    if (!allowed.some((o) => requestOrigin === safelyParseOrigin(o))) {
      return NextResponse.json({ error: 'FORBIDDEN_ORIGIN' }, { status: 403 });
    }
  }

  return null; // same-origin (or allowed extra origin) - allow
}

/**
 * Safely extract the origin from a URL string.
 * Returns undefined for malformed / non-absolute URLs
 * so callers can silently skip them.
 */
function safelyParseOrigin(raw: string): string | undefined {
  try {
    return new URL(raw).origin;
  } catch {
    return undefined;
  }
}
