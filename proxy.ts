import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/edge';
import { getLogtoConfig } from './app/logto-kit/config';
import { isInvalidGrantError, isTransientError } from './app/logto-kit/logic/errors';
import { warn as logWarn, log } from './app/logto-kit/logic/log';

/**
 * Builds the connect-src CSP directive using the configured Logto endpoint.
 *
 * Reads ENDPOINT (or NEXT_PUBLIC_ENDPOINT) and extracts the origin so only
 * the actual Logto host is allowed - not a hardcoded domain from a fork's
 * original developer.
 *
 * Falls back to `https://*.logto.app` if neither env var is set (safe default
 * for cloud-hosted Logto instances).
 */
function buildConnectSrc(): string {
  const raw = process.env.ENDPOINT ?? process.env.NEXT_PUBLIC_ENDPOINT;
  let logtoOrigin = 'https://*.logto.app'; // safe cloud fallback

  if (raw) {
    try {
      const url = new URL(raw);
      logtoOrigin = url.origin; // e.g. "https://auth.example.com"
    } catch {
      // Malformed ENDPOINT - log and use fallback
      console.warn('[CSP] ENDPOINT env var is not a valid URL; using fallback connect-src');
    }
  }

  const sources = [
    "connect-src 'self'",
    logtoOrigin,
    'https://ipapi.co',
    'https://*.basemaps.cartocdn.com',
    'https://*.supabase.co',
  ];

  if (process.env.NODE_ENV === 'development') {
    sources.push('ws://localhost:* wss://localhost:*');
  }

  return sources.join(' ');
}

/**
 * Builds a per-request Content-Security-Policy header using a nonce for
 * script-src. This removes 'unsafe-inline' from script-src, replacing it
 * with a nonce that is embedded in the theme-flash-prevention inline script
 * in layout.tsx.
 *
 * 'unsafe-eval' is only needed for Next.js hot-reload in development.
 */
function buildCsp(nonce: string): string {
  const scriptSrc = process.env.NODE_ENV === 'development'
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // img-src: self + data URIs (avatars, QR codes) + blob (image cropper)
    // + any HTTPS source (avatar URLs from S3/Supabase can vary)
    "img-src 'self' data: blob: https:",
    // connect-src: Next.js HMR in dev, Logto OIDC endpoint (derived from ENDPOINT
    // env var - no hardcoded domains), ipapi.co for geo, CartoCDN for map tiles,
    // Supabase for storage.
    buildConnectSrc(),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/**
 * Sanitizes an error for safe logging: truncates to 200 chars, replaces newlines.
 */
function safeLogMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.substring(0, 200).replace(/\n/g, ' ');
}

const STALE_COOKIE_ERROR = 'Cookies can only be modified';
const WIPE_NONCE_COOKIE = 'logto-wipe-nonce';
const WIPE_NONCE_TTL_SECONDS = 60;

/**
 * Returns true if the given pathname is a public (unauthenticated-accessible) path.
 *
 * Public paths:
 * - `/` (exact) — the landing page
 * - `/demo` and `/demo/*` — demo pages (intentionally public for unauthenticated visitors)
 * - `/docs` and `/docs/*` — docs pages
 * - `/api/auth/sign-in` — sign-in flow entry point
 * - `/callback` — OAuth callback handler
 * - `/api/wipe` — cookie cleaning route (protected by its own origin guard)
 *
 * All other paths are protected and require authentication.
 */
function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname === '/demo' || pathname.startsWith('/demo/')) return true;
  if (pathname === '/docs' || pathname.startsWith('/docs/')) return true;
  if (pathname === '/api/auth/sign-in') return true;
  if (pathname === '/callback') return true;
  if (pathname === '/api/wipe') return true;
  return false;
}

const getClient = () => new LogtoClient(getLogtoConfig());

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip Next.js internals (no CSP needed for static assets)
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Generate a per-request nonce for CSP script-src
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url');
  const cspHeader = buildCsp(nonce);

  // Request headers forwarded to the app (layout.tsx reads x-nonce)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  try {
    // Attempt to get Logto context to handle session error recovery and auth check.
    const context = await getClient().getLogtoContext(request, { fetchUserInfo: true });

    // If unauthenticated and on a protected route, redirect to sign-in.
    if (!context.isAuthenticated && !isPublicPath(pathname)) {
      const signInUrl = new URL('/api/auth/sign-in', request.url);
      return NextResponse.redirect(signInUrl);
    }

    // Proceed with nonce and CSP headers
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  } catch (error) {
    const errorMessage = safeLogMessage(error);

    // Handle stale cookie error
    if (errorMessage.includes(STALE_COOKIE_ERROR)) {
      log('[CookieKiller] 🔧 Stale cookies detected, redirecting to wipe...');
      // /api/wipe clears stale Logto cookies and redirects home.
      // Nonce is required so only this middleware-triggered flow can wipe via GET.
      const wipeNonce = crypto.randomUUID();
      const wipeUrl = new URL('/api/wipe', request.url);
      wipeUrl.searchParams.set('nonce', wipeNonce);
      const response = NextResponse.redirect(wipeUrl);
      response.cookies.set(WIPE_NONCE_COOKIE, wipeNonce, {
        httpOnly: true,
        sameSite: 'lax',
        secure: request.nextUrl.protocol === 'https:',
        path: '/',
        maxAge: WIPE_NONCE_TTL_SECONDS,
      });
      return response;
    }

    // Handle invalid_grant (server-side grant revocation, e.g. session revoked elsewhere)
    if (isInvalidGrantError(error)) {
      logWarn('[Proxy] invalid_grant detected, redirecting to wipe:', errorMessage);
      const wipeNonce = crypto.randomUUID();
      const wipeUrl = new URL('/api/wipe', request.url);
      wipeUrl.searchParams.set('nonce', wipeNonce);
      const response = NextResponse.redirect(wipeUrl);
      response.cookies.set(WIPE_NONCE_COOKIE, wipeNonce, {
        httpOnly: true,
        sameSite: 'lax',
        secure: request.nextUrl.protocol === 'https:',
        path: '/',
        maxAge: WIPE_NONCE_TTL_SECONDS,
      });
      return response;
    }

    if (isTransientError(error)) {
      logWarn('[Proxy] Transient error, returning 503:', errorMessage);
      return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 });
    }

    // Any other error from the Logto client (e.g. network, config): allow through.
    // The app itself will handle the unauthenticated state.
    logWarn('[Proxy] Non-critical error from Logto client, allowing request through:', errorMessage);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
