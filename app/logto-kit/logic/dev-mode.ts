/**
 * ============================================================================
 * Dev / Prod environment gate
 * ============================================================================
 *
 * Single source of truth for the "are we in development?" check across the
 * codebase. Used to gate:
 *
 *   - The Dev tab (renders access token + raw user JSON)
 *   - Verbose error messages from server actions
 *   - Debug logging
 *
 * `process.env.NODE_ENV` is a Next.js special case: it's inlined at build time
 * into both server AND client bundles by webpack's DefinePlugin. No
 * NEXT_PUBLIC_ prefix is required. This means `isDev` gives the same answer
 * on both sides of the server/client boundary — exactly what we want.
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
 * information-disclosing behaviour — it makes the intent ("only if we are
 * CERTAIN we're not in prod") explicit at the call site.
 */
export const isProd: boolean = !isDev;
