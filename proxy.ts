import { NextRequest, NextResponse } from 'next/server';
import LogtoClient from '@logto/next/edge';
import { getLogtoConfig } from './app/logto-kit/config';
import { isAuthError, isInvalidGrantError, isTransientError } from './app/logto-kit/logic/errors';
import { error as logError, warn as logWarn, log } from './app/logto-kit/logic/log';

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

// These paths are public (no session needed). They are either:
//   - Auth-initiation routes (sign-in, callback) - must be reachable pre-auth
//   - Cookie/session management (wipe) - GET for convenience, POST enforces checkSameOrigin
// Note: Sign-out is handled by the signOutUser() Server Action, not an API route.
//   Server Actions have built-in origin validation, so no separate route or CSRF guard needed.
const PUBLIC_PATHS = [
  '/callback',
  '/api/auth/sign-in',
  '/api/wipe',
];

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

  // Skip public paths (exact match or with trailing slash) - apply CSP but skip auth check
  if (PUBLIC_PATHS.some(path => pathname === path || pathname === path + '/')) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  }

  try {
    // Auth check - use fetchUserInfo to detect deleted accounts
    const context = await getClient().getLogtoContext(request, { fetchUserInfo: true });

    if (!context.isAuthenticated) {
      // Not authenticated - redirect to sign-in
      return NextResponse.redirect(new URL('/api/auth/sign-in', request.url));
    }

    // Authenticated - proceed with nonce and CSP headers
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
      const nonce = crypto.randomUUID();
      const wipeUrl = new URL('/api/wipe', request.url);
      wipeUrl.searchParams.set('nonce', nonce);
      const response = NextResponse.redirect(wipeUrl);
      response.cookies.set(WIPE_NONCE_COOKIE, nonce, {
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
      const nonce = crypto.randomUUID();
      const wipeUrl = new URL('/api/wipe', request.url);
      wipeUrl.searchParams.set('nonce', nonce);
      const response = NextResponse.redirect(wipeUrl);
      response.cookies.set(WIPE_NONCE_COOKIE, nonce, {
        httpOnly: true,
        sameSite: 'lax',
        secure: request.nextUrl.protocol === 'https:',
        path: '/',
        maxAge: WIPE_NONCE_TTL_SECONDS,
      });
      return response;
    }

    // Classification of remaining errors
    if (isAuthError(error)) {
      logError('[Proxy] Auth error, redirecting to sign-in:', errorMessage);
      return NextResponse.redirect(new URL('/api/auth/sign-in', request.url));
    }

    if (isTransientError(error)) {
      logWarn('[Proxy] Transient error, returning 503:', errorMessage);
      return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 });
    }

    // Any other unexpected error
    logError('[Proxy] Unexpected error, redirecting to sign-in:', errorMessage);
    return NextResponse.redirect(new URL('/api/auth/sign-in', request.url));
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
