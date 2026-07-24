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
 * **Only codes present in AVAILABLE_LOCALES (from i18n.ts) are included.**
 */

import { readEnv } from './env';
import { AVAILABLE_LOCALES } from './i18n';

const DEFAULT_LANGS = ['en-US', 'ka-GE', 'uk-UA'] as const;

/**
 * Returns the set of allowed language codes from the LANG_AVAILABLE env var.
 *
 * Parsing rules:
 *   - Reads LANG_AVAILABLE (server) or NEXT_PUBLIC_LANG_AVAILABLE (client)
 *   - Splits on commas and trims whitespace from each entry
 *   - Filters out empty strings (handles malformed input like ",,  ,")
 *   - Filters to only codes present in AVAILABLE_LOCALES
 *   - Falls back to the default list if the result is empty
 */
export function getLangAllowlist(): Set<string> {
  const raw = readEnv('LANG_AVAILABLE', true);
  if (raw) {
    const parsed = raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const valid = parsed.filter((code) =>
      (AVAILABLE_LOCALES as readonly string[]).includes(code)
    );

    if (valid.length > 0) {
      return new Set(valid);
    }
  }
  return new Set(DEFAULT_LANGS);
}
