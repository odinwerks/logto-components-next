/**
 * Reads an environment variable, checking both the bare name and the
 * NEXT_PUBLIC_ prefixed variant as a fallback. Works in both server
 * and client contexts.
 *
 * Usage: readEnv('THEME') checks process.env.THEME first, then process.env.NEXT_PUBLIC_THEME
 */
export function readEnv(name: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env[name] ||
      process.env[`NEXT_PUBLIC_${name}`] ||
      undefined
    );
  }
  return undefined;
}
