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

export async function updateUserBasicInfo(updates: {
  name?: string;
  username?: string;
  avatar?: string;
}): Promise<void> {
  assertNameField(updates.name, 'name');
  assertUsername(updates.username);
  assertHttpUrl(updates.avatar, 'avatar');

  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined && v !== '')
  );
  if (Object.keys(cleanUpdates).length === 0) return;
  await patchMyAccount(cleanUpdates, 'Basic info update failed');
}

export async function updateUserProfile(profile: {
  givenName?: string;
  familyName?: string;
}): Promise<void> {
  assertNameField(profile.givenName, 'givenName');
  assertNameField(profile.familyName, 'familyName');

  const res = await makeRequest('/api/my-account/profile', {
    method: 'PATCH',
    body: profile,
  });
  await throwOnApiError(res, 'UPDATE_FAILED', 'profile-update');
}

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
 * There is a narrow race window between GET and PATCH; for user preference fields
 * (theme, lang, org) simultaneous conflicting writes are extremely rare and the
 * last-write-wins outcome is acceptable.
 */
export async function updateUserCustomData(customData: Record<string, unknown>): Promise<void> {
  const rawPrefs = (customData.Preferences ?? {}) as unknown;
  const safePrefs = pickPreferences(rawPrefs);
  if (Object.keys(safePrefs).length === 0) return;

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
}

export async function updateAvatarUrl(avatarUrl: string): Promise<void> {
  await patchMyAccount({ avatar: avatarUrl || null }, 'Avatar update failed');
}
