// ============================================================================
// Language Metadata Map
// Maps locale codes to display names, native endonyms, and ISO country codes
// for flag rendering. Must stay in sync with AVAILABLE_LOCALES in i18n.ts.
// ============================================================================

import type { LocaleCode } from './i18n';
import { getFlagEmoji } from './country-codes';

export interface LanguageMeta {
  code: LocaleCode;
  /** English name: "English", "Georgian", "Ukrainian" */
  name: string;
  /** Endonym in native script: "English", "ქართული", "Українська" */
  nativeName: string;
  /** 2-letter ISO-3166 country code for flag emoji: "US", "GE", "UA" */
  iso: string;
}

/**
 * Static metadata for every locale in AVAILABLE_LOCALES.
 * When adding a new locale to i18n.ts, add its entry here too.
 */
export const LANGUAGE_META: Record<LocaleCode, LanguageMeta> = {
  'en-US': { code: 'en-US', name: 'English', nativeName: 'English', iso: 'US' },
  'ka-GE': { code: 'ka-GE', name: 'Georgian', nativeName: 'ქართული', iso: 'GE' },
  'uk-UA': { code: 'uk-UA', name: 'Ukrainian', nativeName: 'Українська', iso: 'UA' },
};

/**
 * Returns the country flag emoji for a locale code, or '🌐' if unknown.
 */
export function getLangFlag(code: string): string {
  // TypeScript cast is safe: the runtime guard handles both invalid keys and
  // codes that aren't in LANGUAGE_META at all.
  const meta = LANGUAGE_META[code as LocaleCode];
  return meta ? getFlagEmoji(meta.iso) : '🌐';
}
