'use server';

import { makeRequest } from './request';
import { throwOnApiError, patchMyAccount } from './shared';

/**
 * Updates the user's basic info (name, username, avatar).
 * @param updates - Object containing fields to update.
 */
export async function updateUserBasicInfo(updates: {
  name?: string;
  username?: string;
  avatar?: string;
}): Promise<void> {
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined && v !== '')
  );

  if (Object.keys(cleanUpdates).length === 0) return;
  await patchMyAccount(cleanUpdates, 'Basic info update failed');
}

/**
 * Updates the user's profile (given name, family name).
 * @param profile - Object containing profile fields.
 */
export async function updateUserProfile(profile: {
  givenName?: string;
  familyName?: string;
}): Promise<void> {
  const res = await makeRequest('/api/my-account/profile', {
    method: 'PATCH',
    body: profile,
  });
  
  await throwOnApiError(res, 'Profile update failed');
}

/**
 * Updates the user's custom data.
 * @param customData - The custom data object.
 */
export async function updateUserCustomData(customData: Record<string, unknown>): Promise<void> {
  await patchMyAccount({ customData }, 'Custom data update failed');
}

/**
 * Updates the user's avatar URL.
 * @param avatarUrl - The new avatar URL.
 */
export async function updateAvatarUrl(avatarUrl: string): Promise<void> {
  await patchMyAccount({ avatar: avatarUrl || null }, 'Avatar update failed');
}
