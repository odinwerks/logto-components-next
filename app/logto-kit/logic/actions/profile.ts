'use server';

import { makeRequest } from './request';
import { patchMyAccount } from './shared';
import { throwOnApiError } from '../errors';
import {
  assertNameField,
  assertUsername,
  assertHttpUrl,
  pickPreferences,
} from '../guards';
import { safeAction, type ActionResult, type DataResult } from './safe';

export async function updateUserBasicInfo(updates: {
  name?: string;
  username?: string;
  avatar?: string;
}): Promise<ActionResult> {
  return safeAction(async () => {
    assertNameField(updates.name, 'name');
    assertUsername(updates.username);
    assertHttpUrl(updates.avatar, 'avatar');

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined && v !== '')
    );
    if (Object.keys(cleanUpdates).length === 0) return;
    await patchMyAccount(cleanUpdates, 'Basic info update failed');
  });
}

export async function updateUserProfile(profile: {
  givenName?: string;
  familyName?: string;
}): Promise<ActionResult> {
  return safeAction(async () => {
    assertNameField(profile.givenName, 'givenName');
    assertNameField(profile.familyName, 'familyName');

    const res = await makeRequest('/api/my-account/profile', {
      method: 'PATCH',
      body: profile,
    });
    await throwOnApiError(res, 'UPDATE_FAILED', 'profile-update');
  });
}

// In-flight lock to prevent concurrent GET-PATCH races when
// PreferencesProvider calls updateUserCustomData in rapid succession.
let customDataUpdateLock: Promise<void> | null = null;

/**
 * Updates the user's custom data Preferences.
 *
 * Only the `Preferences` key is allowed through; all others are dropped
 * (mass-assignment protection). Within Preferences, only whitelisted keys
 * (asOrg, theme, lang) are accepted.
 *
 * NOTE: Logto's Account API uses 'replace' mode for customData — a PATCH with
 * { customData: { Preferences: {...} } } would wipe all other top-level customData
 * keys set by other apps, Logto Console, or other flows. We must GET first, merge
 * the Preferences delta into the full customData, then PATCH the merged result.
 *
 * An in-flight lock serializes concurrent calls so the GET-PATCH cycle completes
 * atomically, preventing lost-write races when PreferencesProvider fires multiple
 * persist calls in quick succession.
 */
export async function updateUserCustomData(customData: Record<string, unknown>): Promise<ActionResult> {
  return safeAction(async () => {
    const rawPrefs = (customData.Preferences ?? {}) as unknown;
    const safePrefs = pickPreferences(rawPrefs);
    if (Object.keys(safePrefs).length === 0) return;

    // Serialize updates: wait for any in-flight update to complete before starting
    if (customDataUpdateLock) {
      await customDataUpdateLock.catch(() => {}); // absorb failures
    }

    // Create a new lock
    let releaseLock: () => void;
    customDataUpdateLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    try {
      // GET the full account to read current customData before merging.
      // Required because Logto's PATCH completely replaces customData (no shallow-merge).
      const existing = await makeRequest('/api/my-account', { method: 'GET' });
      await throwOnApiError(existing, 'FETCH_FAILED', 'Get my account for customData merge');
      const existingData = await existing.json() as { customData?: Record<string, unknown> };
      const existingCustomData = existingData?.customData ?? {};

      const merged = {
        ...existingCustomData,
        Preferences: {
          ...(existingCustomData.Preferences as Record<string, unknown> ?? {}),
          ...safePrefs,
        },
      };

      const res = await makeRequest('/api/my-account', {
        method: 'PATCH',
        body: { customData: merged },
      });
      await throwOnApiError(res, 'UPDATE_FAILED', 'Update custom data');
    } finally {
      customDataUpdateLock = null;
      releaseLock!();
    }
  });
}

export async function updateAvatarUrl(avatarUrl: string): Promise<ActionResult> {
  return safeAction(async () => {
    if (avatarUrl) assertHttpUrl(avatarUrl, 'avatar');
    await patchMyAccount({ avatar: avatarUrl || null }, 'Avatar update failed');
  });
}
