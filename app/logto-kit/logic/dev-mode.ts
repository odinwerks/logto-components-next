/**
 * ============================================================================
 * Dev / Prod environment gate
 * ============================================================================
 *
 * Single source of truth for the "are we in development?" check across the
 * codebase. Used to gate:
 *
 *   - Verbose error messages from server actions
 *   - Debug logging
 *
 * `process.env.NODE_ENV` is a Next.js special case: it's inlined at build time
 * into both server AND client bundles by webpack's DefinePlugin. No
 * NEXT_PUBLIC_ prefix is required. This means `isDev` gives the same answer
 * on both sides of the server/client boundary - exactly what we want.
 *
 * Security posture: `isDev` defaults to `false` when NODE_ENV is missing or
 * unrecognised. Fail-closed.
 */

const ENV = process.env.NODE_ENV;

/**
 * `true` only when NODE_ENV is explicitly "development" or "test".
 * Anything else (including unset, "production", "staging", garbage) → `false`.
 */
export const isDev: boolean = ENV === 'development' || ENV === 'test';

/**
 * Convenience inverse. Prefer this in checks that gate destructive or
 * information-disclosing behaviour - it makes the intent ("only if we are
 * CERTAIN we're not in prod") explicit at the call site.
 */
export const isProd: boolean = !isDev;

// ============================================================================
// Startup guard: warn operators who deploy with NODE_ENV != production
// ============================================================================

/**
 * Checks whether a URL points to localhost / 127.0.0.1 / [::1].
 * Returns false for empty strings or invalid URLs (so they don't trigger warnings).
 */
function isLocalhostUrl(url: string): boolean {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

/**
 * Module-level startup guard. Fires once when this module is first imported.
 *
 * Warns (does NOT throw) when:
 *   - NODE_ENV is not "production", AND
 *   - BASE_URL or ENDPOINT is a non-localhost URL
 *
 * This catches the common misconfiguration where an operator copies .env.example
 * and deploys to a live server without changing NODE_ENV. The warning is visible
 * in server logs and can be caught by log-monitoring alerts.
 *
 * Does NOT warn during tests (NODE_ENV=test) to keep test output clean.
 */
if (
  typeof process !== 'undefined' &&
  process.env.NODE_ENV !== 'production' &&
  process.env.NODE_ENV !== 'test'
) {
  const baseUrl = process.env.BASE_URL || process.env.APP_URL || '';
  const endpoint = process.env.ENDPOINT || '';

  if (baseUrl && !isLocalhostUrl(baseUrl)) {
    console.warn(
      '[SECURITY] NODE_ENV is not "production" but BASE_URL is a non-localhost URL: ' +
        baseUrl +
        '. Cookies will NOT have the Secure flag. ' +
        'Set NODE_ENV=production for all live deployments.',
    );
  }
  if (endpoint && !isLocalhostUrl(endpoint)) {
    console.warn(
      '[SECURITY] NODE_ENV is not "production" but ENDPOINT is a non-localhost URL: ' +
        endpoint +
        '. Set NODE_ENV=production for all live deployments.',
    );
  }
}
