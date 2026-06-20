import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Required for Docker: generates a self-contained .next/standalone output
  // that includes only the minimal server files (no full node_modules copy).
  output: 'standalone',

  // ioredis is dynamically imported in app/lib/distributed-state.ts via
  //   `await import('ioredis')`
  // Next.js's standalone tracer does not follow conditional dynamic imports, so
  // the built/ directory is stripped from the standalone output. Marking it as
  // an external package tells Next.js to keep it as-is (not bundle it) AND
  // ensures the tracer includes it in the standalone node_modules tree.
  serverExternalPackages: ['ioredis'],

  async headers() {
    return [
      {
        // Apply security headers to all routes.
        // NOTE: Content-Security-Policy is intentionally omitted here.
        // It is set dynamically per-request in proxy.ts (the Next.js middleware)
        // using a per-request nonce, which removes 'unsafe-inline' from script-src.
        source: '/:path*',
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
        ],
      },
    ];
  },
};

export default nextConfig;

