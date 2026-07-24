// ============================================================================
// i18n Handler
// Reads supported languages from ENV, validates them, enforces ordering.
// This is the single source of truth for language configuration.
// ============================================================================

import { readEnv } from './env';
import { warn } from './log';

// The canonical set of locale codes the app ships with.
// When you add a new locale file (e.g. ru-RU.ts), add it here.
export const AVAILABLE_LOCALES = ['en-US', 'ka-GE', 'uk-UA'] as const;
export type LocaleCode = (typeof AVAILABLE_LOCALES)[number];

/**
 * Returns the ordered list of supported language codes.
 *
 * Source: `LANG_AVAILABLE` (also checks `NEXT_PUBLIC_LANG_AVAILABLE` as fallback)
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
    warn(
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
 * Source: `LANG_MAIN` (also checks `NEXT_PUBLIC_LANG_MAIN` as fallback)
 * Falls back to first entry in LANG_AVAILABLE, then to AVAILABLE_LOCALES[0].
 *
 * Guarantee: the returned code is always a member of `getSupportedLangs()`,
 * i.e. it respects both AVAILABLE_LOCALES and LANG_AVAILABLE filtering.
 */
export function getDefaultLang(): string {
  const raw = (readEnv('LANG_MAIN') || '').trim();
  const rawAvail = (readEnv('LANG_AVAILABLE') || '').trim();
  const availCodes = rawAvail
    ? rawAvail
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  // LANG_MAIN must be in AVAILABLE_LOCALES AND (if LANG_AVAILABLE is set) in LANG_AVAILABLE
  if (raw && (AVAILABLE_LOCALES as readonly string[]).includes(raw)) {
    if (!availCodes || availCodes.includes(raw)) {
      return raw;
    }
    // LANG_MAIN is valid per AVAILABLE_LOCALES but excluded by LANG_AVAILABLE.
    // Fall through to the next fallback — don't return a lang that getSupportedLangs()
    // won't include.
  }

  // Fall back to first lang in LANG_AVAILABLE (if set and has a recognized entry)
  if (availCodes && availCodes.length > 0) {
    const first = availCodes[0];
    if (first && (AVAILABLE_LOCALES as readonly string[]).includes(first)) {
      return first;
    }
  }

  // Ultimate fallback: first entry in AVAILABLE_LOCALES (always a member of itself)
  return AVAILABLE_LOCALES[0];
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
export function resolveLang(lang: string | undefined | null): string {
  if (!lang) return getDefaultLang();
  if (isValidLang(lang)) return lang;
  return getDefaultLang();
}
