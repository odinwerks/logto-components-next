// ============================================================================
// User Preferences Handler
// Manages the `Preferences` key inside Logto's customData field.
// This persists theme + language choices to the user's Logto profile.
// ============================================================================

import type { UserData } from './types';
import { pickPreferences, SAFE_ID_REGEX } from './guards';
import { warn } from './log';

export interface UserPreferences {
  theme: 'dark' | 'light';
  lang: string; // e.g. 'en-US', 'ka-GE'
  asOrg: string | null; // active organization ID, null = "be yourself" (global context)
}

const PREFS_KEY = 'Preferences';

// ─────────────────────────────────────────────────────────────────────────────
// Read helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts UserPreferences from a UserData object.
 * Returns null if the Preferences key does not exist or is malformed.
 */
export function getPreferencesFromUserData(userData: UserData): Partial<UserPreferences> | null {
  const customData = userData.customData;
  if (!customData || typeof customData !== 'object') return null;

  const raw = (customData as Record<string, unknown>)[PREFS_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const prefs = raw as Partial<UserPreferences>;

  // Validate theme
  const theme: 'dark' | 'light' | undefined =
    prefs.theme === 'dark' || prefs.theme === 'light' ? prefs.theme : undefined;

  // Validate lang (basic format check)
  const lang: string | undefined =
    typeof prefs.lang === 'string' && prefs.lang.length > 0 ? prefs.lang : undefined;

  // Validate asOrg - null is a valid value meaning "be yourself"
  // Only accept safe Logto IDs to prevent injection via stored customData
  const hasAsOrg = 'asOrg' in prefs;
  const asOrg: string | null = (() => {
    if (typeof prefs.asOrg !== 'string') return null;
    if (!SAFE_ID_REGEX.test(prefs.asOrg)) {
      warn('[Preferences] Stored asOrg value failed SAFE_ID_REGEX validation; treating as null');
      return null;
    }
    return prefs.asOrg;
  })();

  // Return preferences if any key exists (even if all values resolve to defaults)
  if (!theme && !lang && !hasAsOrg) return null;

  return {
    ...(theme !== undefined && { theme }),
    ...(lang !== undefined && { lang }),
    ...(hasAsOrg && { asOrg }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Write helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merges new preferences into the existing customData object.
 * Returns the full updated customData (safe to pass directly to the Management API).
 *
 * This is a shallow merge - all other keys in customData are preserved.
 * Inside Preferences, the provided fields are merged (theme and lang independently).
 *
 * The updates are validated through pickPreferences() to ensure only allowed
 * keys with valid values are accepted (mass-assignment protection).
 */
export function buildUpdatedCustomData(
  userData: UserData,
  updates: Partial<UserPreferences>
): Record<string, unknown> {
  // Validate updates through the allowlist before merging (BUG-021)
  const safeUpdates = pickPreferences(updates) as Partial<UserPreferences>;

  const existing = (userData.customData as Record<string, unknown>) ?? {};
  const existingPrefs = (existing[PREFS_KEY] as Partial<UserPreferences>) ?? {};

  // BUG-L07: Align with the live server action's preserve-and-override merge
  // (profile.ts updateUserCustomData does `{ ...existingPrefs, ...safePrefs }`
  // and never invents defaults). Previously this invented 'dark' / 'en-US'
  // when no value was present, diverging from the server action. Now an
  // unset theme/lang resolves to undefined, which JSON.stringify drops —
  // i.e. those keys are preserved as-is on the server, matching the live path.
  const newPrefs: Partial<UserPreferences> = {
    theme: safeUpdates.theme ?? existingPrefs.theme,
    lang: safeUpdates.lang ?? existingPrefs.lang,
    asOrg: safeUpdates.asOrg !== undefined ? safeUpdates.asOrg : (existingPrefs.asOrg ?? null),
  };

  return {
    ...existing,
    [PREFS_KEY]: newPrefs,
  };
}

/**
 * Convenience: does customData already have a Preferences key?
 */
export function hasPreferences(userData: UserData): boolean {
  return getPreferencesFromUserData(userData) !== null;
}
