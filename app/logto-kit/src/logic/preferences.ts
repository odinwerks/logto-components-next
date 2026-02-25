// ============================================================================
// User Preferences Handler
// Manages the `Preferences` key inside Logto's customData field.
// This persists theme + language choices to the user's Logto profile.
// ============================================================================

import type { UserData } from './types';

export interface UserPreferences {
  theme: 'dark' | 'light';
  lang: string; // e.g. 'en-US', 'ka-GE'
}

const PREFS_KEY = 'Preferences';

// ─────────────────────────────────────────────────────────────────────────────
// Read helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts UserPreferences from a UserData object.
 * Returns null if the Preferences key does not exist or is malformed.
 */
export function getPreferencesFromUserData(userData: UserData): UserPreferences | null {
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

  if (!theme && !lang) return null;

  return {
    theme: theme ?? 'dark',
    lang: lang ?? 'en-US',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Write helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merges new preferences into the existing customData object.
 * Returns the full updated customData (safe to pass directly to onUpdateCustomData).
 *
 * This is a shallow merge — all other keys in customData are preserved.
 * Inside Preferences, the provided fields are merged (theme and lang independently).
 */
export function buildUpdatedCustomData(
  userData: UserData,
  updates: Partial<UserPreferences>
): Record<string, unknown> {
  const existing = (userData.customData as Record<string, unknown>) ?? {};
  const existingPrefs = (existing[PREFS_KEY] as Partial<UserPreferences>) ?? {};

  const newPrefs: UserPreferences = {
    theme: updates.theme ?? existingPrefs.theme ?? 'dark',
    lang: updates.lang ?? existingPrefs.lang ?? 'en-US',
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
