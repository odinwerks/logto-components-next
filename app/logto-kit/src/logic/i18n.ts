// ============================================================================
// i18n Handler
// Reads supported languages from ENV, validates them, enforces ordering.
// This is the single source of truth for language configuration.
// ============================================================================

// The canonical set of locale codes the app ships with.
// When you add a new locale file (e.g. ru-RU.ts), add it here.
export const AVAILABLE_LOCALES = ['en-US', 'ka-GE'] as const;
export type LocaleCode = (typeof AVAILABLE_LOCALES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// ENV parsing helpers (work server-side AND with NEXT_PUBLIC_ prefix client-side)
// ─────────────────────────────────────────────────────────────────────────────

function readEnv(name: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env[name] ||
      process.env[`NEXT_PUBLIC_${name}`] ||
      undefined
    );
  }
  return undefined;
}

/**
 * Returns the ordered list of supported language codes.
 *
 * Source: `LANG_AVAILABLE` or `NEXT_PUBLIC_LANG_AVAILABLE`
 * Example value: "en-US,ka-GE,ru-RU"
 *
 * Rules:
 *  1. Parse as comma-separated list, trim each item.
 *  2. Filter to only codes that exist in AVAILABLE_LOCALES.
 *  3. Preserve the ENV order exactly.
 *  4. If empty / missing, fall back to [defaultLang].
 */
export function getSupportedLangs(): string[] {
  const raw = readEnv('LANG_AVAILABLE') || '';
  if (!raw.trim()) {
    return [getDefaultLang()];
  }

  const parsed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const valid = parsed.filter((code) =>
    (AVAILABLE_LOCALES as readonly string[]).includes(code)
  );

  if (valid.length === 0) {
    console.warn(
      `[i18n] LANG_AVAILABLE="${raw}" contained no recognized locale codes. ` +
        `Recognized: ${AVAILABLE_LOCALES.join(', ')}. Falling back to default.`
    );
    return [getDefaultLang()];
  }

  return valid;
}

/**
 * Returns the default/main language code.
 *
 * Source: `LANG_MAIN` or `NEXT_PUBLIC_LANG_MAIN`
 * Falls back to first entry in LANG_AVAILABLE, then 'en-US'.
 */
export function getDefaultLang(): string {
  const raw = (readEnv('LANG_MAIN') || '').trim();
  if (raw && (AVAILABLE_LOCALES as readonly string[]).includes(raw)) {
    return raw;
  }
  // Fall back to first lang in the available list (if LANG_AVAILABLE is set)
  const rawAvail = (readEnv('LANG_AVAILABLE') || '').trim();
  if (rawAvail) {
    const first = rawAvail.split(',')[0]?.trim();
    if (first && (AVAILABLE_LOCALES as readonly string[]).includes(first)) {
      return first;
    }
  }
  return 'en-US';
}

/**
 * Checks whether a given lang code is supported.
 */
export function isValidLang(lang: string): boolean {
  return getSupportedLangs().includes(lang);
}

/**
 * Given the current lang, returns the next lang in the ENV-ordered cycle.
 * If current is the last, wraps around to the first.
 */
export function getNextLang(currentLang: string): string {
  const langs = getSupportedLangs();
  const idx = langs.indexOf(currentLang);
  if (idx === -1) return langs[0];
  return langs[(idx + 1) % langs.length];
}

/**
 * Safe getter: if lang is not valid, return default.
 */
export function resolvelang(lang: string | undefined | null): string {
  if (!lang) return getDefaultLang();
  if (isValidLang(lang)) return lang;
  return getDefaultLang();
}
