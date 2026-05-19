/**
 * Static references so Next.js can inline NEXT_PUBLIC_ vars into client bundles.
 * Dynamic access (process.env[`NEXT_PUBLIC_${name}`]) is NOT replaced by Next.js,
 * so client components would always see `undefined`. This map ensures the
 * fallback path uses static property access that the bundler can substitute.
 */
const NEXT_PUBLIC_ENV: Record<string, string | undefined> = {
  USER_SHAPE: process.env.NEXT_PUBLIC_USER_SHAPE,
  THEME: process.env.NEXT_PUBLIC_THEME,
  DEFAULT_THEME_MODE: process.env.NEXT_PUBLIC_DEFAULT_THEME_MODE,
  LANG_MAIN: process.env.NEXT_PUBLIC_LANG_MAIN,
  LANG_AVAILABLE: process.env.NEXT_PUBLIC_LANG_AVAILABLE,
  LOAD_TABS: process.env.NEXT_PUBLIC_LOAD_TABS,
  MFA_ISSUER: process.env.NEXT_PUBLIC_MFA_ISSUER,
  NAME_TYPE: process.env.NEXT_PUBLIC_NAME_TYPE,
  DELETE_REDIRECT_DELAY: process.env.NEXT_PUBLIC_DELETE_REDIRECT_DELAY,
};

/**
 * Reads an environment variable, checking both the bare name and the
 * NEXT_PUBLIC_ prefixed variant as a fallback. Works in both server
 * and client contexts.
 *
 * On the server, process.env.USER_SHAPE etc. are available directly.
 * On the client, only NEXT_PUBLIC_ vars are inlined by Next.js, so the
 * fallback uses the static NEXT_PUBLIC_ENV map to ensure bundling works.
 *
 * @param allowPublic - If false, skips the NEXT_PUBLIC_ fallback. Use for secret values
 *                      (APP_SECRET, COOKIE_SECRET, etc.) to prevent accidental client exposure.
 */
/**
 * Returns the configured BASE_URL, throwing if not set.
 * Use in Route Handlers and server-side redirects.
 */
export function getBaseUrl(): string {
  const url = process.env.BASE_URL;
  if (!url) {
    throw new Error('BASE_URL environment variable is required but not set');
  }
  return url.replace(/\/$/, '');
}

export function readEnv(name: string, allowPublic = true): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env[name];
    if (val !== undefined) return val;
    if (allowPublic) {
      // Only check the static map — dynamic process.env[`NEXT_PUBLIC_${name}`]
      // is NOT replaced by Next.js's bundler on the client and always returns undefined.
      if (name in NEXT_PUBLIC_ENV) return NEXT_PUBLIC_ENV[name];
      if (typeof process !== 'undefined' && typeof window !== 'undefined') {
        console.warn(`[readEnv] "${name}" is not in NEXT_PUBLIC_ENV map — will be undefined on client`);
      }
    }
  }
  return undefined;
}
