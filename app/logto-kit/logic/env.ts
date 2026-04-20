/**
 * Reads an environment variable, checking both the bare name and the
 * NEXT_PUBLIC_ prefixed variant as a fallback. Works in both server
 * and client contexts.
 *
 * Usage: readEnv('THEME') checks process.env.THEME first, then process.env.NEXT_PUBLIC_THEME
 *
 * @param allowPublic - If false, skips the NEXT_PUBLIC_ fallback. Use for secret values
 *                      (APP_SECRET, COOKIE_SECRET, etc.) to prevent accidental client exposure.
 */
export function readEnv(name: string, allowPublic = true): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env[name];
    if (val !== undefined) return val;
    if (allowPublic) {
      return process.env[`NEXT_PUBLIC_${name}`];
    }
  }
  return undefined;
}
