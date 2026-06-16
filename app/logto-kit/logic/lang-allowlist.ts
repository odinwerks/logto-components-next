/**
 * Language allowlist loader for the `lang` preference guard.
 *
 * Reads the LANG_AVAILABLE / NEXT_PUBLIC_LANG_AVAILABLE environment variable
 * and returns a Set<string> of accepted language codes.
 *
 * Falls back to ['en-US', 'ka-GE', 'uk-UA'] if the variable is unset or
 * resolves to an empty list — matching the .env.example default.
 *
 * Always returns a non-empty Set.
 */

import { readEnv } from './env';

const DEFAULT_LANGS = ['en-US', 'ka-GE', 'uk-UA'] as const;

/**
 * Returns the set of allowed language codes from the LANG_AVAILABLE env var.
 *
 * Parsing rules:
 *   - Reads LANG_AVAILABLE (server) or NEXT_PUBLIC_LANG_AVAILABLE (client)
 *   - Splits on commas and trims whitespace from each entry
 *   - Filters out empty strings (handles malformed input like ",,  ,")
 *   - Falls back to the default list if the result is empty
 */
export function getLangAllowlist(): Set<string> {
  const raw = readEnv('LANG_AVAILABLE', true);
  if (raw) {
    const parsed = raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (parsed.length > 0) {
      return new Set(parsed);
    }
  }
  return new Set(DEFAULT_LANGS);
}
