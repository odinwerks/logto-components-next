'use server';

import { makeRequest } from './request';
import { patchMyAccount } from './shared';
import { throwOnApiError } from '../errors';
import {
  assertNameField,
  assertUsername,
  assertHttpUrl,
  assertSafeUserId,
  pickPreferences,
} from '../guards';
import { safeAction, type ActionResult } from './safe';
import { getLogtoContext } from '@logto/next/server-actions';
import { getManagementApiToken, getLogtoConfig } from '../../config';
import { getCleanEndpoint } from '../utils';
import { warn } from '../log';

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
    await throwOnApiError(res, 'UPDATE_FAILED', 'profile-update', true);
  });
}

// In-flight lock to prevent concurrent GET-PATCH races when
// PreferencesProvider calls updateUserCustomData in rapid succession.
// Per-user Map keyed by user ID to avoid blocking different users.
const customDataUpdateLocks = new Map<string, Promise<void>>();
const MAX_LOCK_ENTRIES = 1000; // Prevent unbounded growth

/**
 * Updates the user's custom data Preferences via the Logto Management API.
 *
 * Only the `Preferences` key is allowed through; all others are dropped
 * (mass-assignment protection). Within Preferences, only whitelisted keys
 * (asOrg, theme, lang) are accepted.
 *
 * Uses PATCH /api/users/{userId}/custom-data (Management API) rather than
 * PATCH /api/my-account (Account API). The Management API performs a
 * top-level shallow merge, so only the `Preferences` key is updated - other
 * top-level customData keys set by other applications are not touched.
 *
 * A GET is still required to read the current inner Preferences sub-object
 * before merging (the sub-object itself is fully replaced on PATCH).
 *
 * An in-memory lock serializes concurrent calls within the same process to
 * prevent the GET-PATCH inner-key race for a single user. Cross-process races
 * on individual Preferences keys (theme, lang, asOrg) are possible in
 * horizontally-scaled deployments but result only in the last write winning on
 * that specific key - other applications' customData is always safe.
 */
export async function updateUserCustomData(customData: Record<string, unknown>): Promise<ActionResult> {
  return safeAction(async () => {
    const rawPrefs = (customData.Preferences ?? {}) as unknown;
    const safePrefs = pickPreferences(rawPrefs);
    if (Object.keys(safePrefs).length === 0) return;

    // Get user ID for per-user locking
    const { claims, isAuthenticated } = await getLogtoContext(getLogtoConfig());
    if (!isAuthenticated || !claims?.sub) {
      throw new Error('Cannot determine user ID for customData update');
    }
    const userId = claims.sub;
    assertSafeUserId(userId);

    // Retrieve existingLock
    const existingLock = customDataUpdateLocks.get(userId);

    // Prevent unbounded growth safely using FIFO eviction
    while (customDataUpdateLocks.size >= MAX_LOCK_ENTRIES) {
      const oldestKey = customDataUpdateLocks.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      customDataUpdateLocks.delete(oldestKey);
    }

    // Create a new lock for this user
    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    customDataUpdateLocks.set(userId, lockPromise);

    try {
      if (existingLock) {
        await existingLock.catch(() => {}); // absorb failures
      }

      const mgmtToken = await getManagementApiToken();
      const endpoint = getCleanEndpoint();

      // GET current Preferences via Management API.
      // Using the Management API's custom-data endpoint avoids the Account API's
      // full-replace PATCH, which would wipe top-level customData keys written by
      // other applications, Logto Console, or other flows.
      const getRes = await fetch(
        `${endpoint}/api/users/${encodeURIComponent(userId)}/custom-data`,
        {
          headers: { Authorization: `Bearer ${mgmtToken}` },
          cache: 'no-store',
        },
      );
      if (!getRes.ok) {
        const errBody = await getRes.text().catch(() => getRes.statusText);
        warn(`[updateUserCustomData] GET custom-data failed ${getRes.status}: ${errBody.substring(0, 200)}`);
        throw new Error('UPDATE_FAILED');
      }
      const existingCustomData = (await getRes.json()) as Record<string, unknown>;
      const existingPrefs = (existingCustomData.Preferences as Record<string, unknown>) ?? {};

      // Merge only the inner Preferences sub-object keys.
      const mergedPrefs = { ...existingPrefs, ...safePrefs };

      // PATCH via Management API - top-level shallow merge.
      // Logto merges { Preferences: mergedPrefs } into the stored customData at the
      // top level, leaving all other top-level keys (other apps, Logto Console, etc.)
      // untouched. The inner Preferences object is fully replaced, hence the GET above.
      const patchRes = await fetch(
        `${endpoint}/api/users/${encodeURIComponent(userId)}/custom-data`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${mgmtToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ customData: { Preferences: mergedPrefs } }),
          cache: 'no-store',
        },
      );

      if (!patchRes.ok) {
        const errBody = await patchRes.text().catch(() => patchRes.statusText);
        warn(`[updateUserCustomData] Management API PATCH failed ${patchRes.status}: ${errBody.substring(0, 200)}`);
        throw new Error('UPDATE_FAILED');
      }
    } finally {
      if (customDataUpdateLocks.get(userId) === lockPromise) {
        customDataUpdateLocks.delete(userId);
      }
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
