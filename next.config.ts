import type { NextConfig } from 'next';

/**
 * Builds the connect-src CSP directive using the configured Logto endpoint.
 *
 * Reads ENDPOINT (or NEXT_PUBLIC_ENDPOINT) and extracts the origin so only
 * the actual Logto host is allowed — not a hardcoded domain from a fork's
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
      // Malformed ENDPOINT — log and use fallback
      console.warn('[CSP] ENDPOINT env var is not a valid URL; using fallback connect-src');
    }
  }

  return [
    "connect-src 'self'",
    logtoOrigin,
    'https://ipapi.co',
    'https://*.basemaps.cartocdn.com',
    'https://*.supabase.co',
    'wss:',
  ].join(' ');
}

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Suppress Next.js 16 dev-mode Server Action argument tracing.
  // The default traces every SA call with its first argument serialised —
  // this leaks sensitive values (passwords, tokens) to stdout in development.
  // In production, no arguments are ever logged regardless of this setting.
  logging: {
    serverFunctions: false,
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            // Enforce HTTPS for 2 years. preload flag signals readiness for HSTS preload list.
            // Only active in production (HTTPS). Does no harm in dev over HTTP.
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            // Content Security Policy.
            //
            // 'unsafe-inline' for scripts is required by Next.js inline scripts
            // (e.g., the theme-flash-prevention script in layout.tsx). This is
            // a known trade-off; Next.js 15+ supports nonce-based CSP which
            // eliminates this — migrate when ready.
            //
            // 'unsafe-eval' is only needed for Next.js hot-reload in development.
            // Production builds do not use eval() — gate this strictly.
            //
            // frame-ancestors 'none' — equivalent to X-Frame-Options: DENY but
            // for CSP2-compliant browsers.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-eval' is only needed for Next.js hot-reload in development.
              // Production builds do not use eval() — gate this strictly.
              process.env.NODE_ENV === 'development'
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
                : "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // img-src: self + data URIs (avatars, QR codes) + blob (image cropper)
              // + any HTTPS source (avatar URLs from S3/Supabase can vary)
              "img-src 'self' data: blob: https:",
              // connect-src: Next.js HMR in dev, Logto OIDC endpoint (derived from ENDPOINT
              // env var — no hardcoded domains), ipapi.co for geo, CartoCD for map tiles,
              // Supabase for storage.
              buildConnectSrc(),
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

