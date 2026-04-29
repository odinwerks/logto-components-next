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
 * Updates the user's custom data, merging with existing data to preserve
 * keys set by other apps on the same Logto tenant.
 *
 * Only the `Preferences` key is allowed through; all others are dropped
 * (mass-assignment protection). Within Preferences, only whitelisted keys
 * (asOrg, themeMode, language) are accepted.
 */
export async function updateUserCustomData(customData: Record<string, unknown>): Promise<void> {
  const rawPrefs = (customData.Preferences ?? {}) as unknown;
  const safePrefs = pickPreferences(rawPrefs);

  // Fetch existing customData to merge (preserve other apps' keys).
  // Abort on non-OK — proceeding with an empty base would silently destroy
  // all keys stored by other applications on this Logto tenant.
  const res = await makeRequest('/api/my-account');
  if (!res.ok) {
    throw new Error('FETCH_FAILED');
  }

  let existingCustomData: Record<string, unknown> = {};
  try {
    const existing = await res.json() as { customData?: Record<string, unknown> };
    existingCustomData = existing.customData ?? {};
  } catch {
    // If the response body is unparseable, abort rather than overwrite with empty.
    throw new Error('FETCH_FAILED');
  }

  // Guard: existingCustomData.Preferences must be a plain object before spreading.
  // A non-object value (string from legacy data, number, boolean) would produce
  // garbage character-indexed keys via JS spread without throwing.
  const existingPrefs =
    typeof existingCustomData.Preferences === 'object' &&
    existingCustomData.Preferences !== null &&
    !Array.isArray(existingCustomData.Preferences)
      ? (existingCustomData.Preferences as Record<string, unknown>)
      : {};

  const merged: Record<string, unknown> = {
    ...existingCustomData,
    Preferences: {
      ...existingPrefs,
      ...safePrefs,
    },
  };

  await patchMyAccount({ customData: merged }, 'Custom data update failed');
}

export async function updateAvatarUrl(avatarUrl: string): Promise<void> {
  await patchMyAccount({ avatar: avatarUrl || null }, 'Avatar update failed');
}
