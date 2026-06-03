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
import { safeAction, type ActionResult, type DataResult } from './safe';
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
    await throwOnApiError(res, 'UPDATE_FAILED', 'profile-update');
  });
}

// Rate limiter to prevent concurrent GET-PATCH races when
// PreferencesProvider calls updateUserCustomData in rapid succession.
// Per-user Map keyed by user ID to avoid blocking different users.
const customDataLastUpdate = new Map<string, number>();
const CUSTOM_DATA_RATE_LIMIT_MS = 1000; // 1 second between updates

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
 * Rate limits updates to 1 per second per user to prevent concurrent GET-PATCH
 * races. At 1 req/sec, the last write wins on individual Preference keys,
 * which is the documented behavior for cross-process races.
 */
export async function updateUserCustomData(customData: Record<string, unknown>): Promise<ActionResult> {
  return safeAction(async () => {
    const rawPrefs = (customData.Preferences ?? {}) as unknown;
    const safePrefs = pickPreferences(rawPrefs);
    if (Object.keys(safePrefs).length === 0) return;

    // Get user ID for per-user rate limiting
    const { claims, isAuthenticated } = await getLogtoContext(getLogtoConfig());
    if (!isAuthenticated || !claims?.sub) {
      throw new Error('Cannot determine user ID for customData update');
    }
    const userId = claims.sub;
    assertSafeUserId(userId);

    // Clean up stale entries (older than 60 seconds) to prevent unbounded growth
    const now = Date.now();
    for (const [uid, timestamp] of customDataLastUpdate.entries()) {
      if (now - timestamp > 60000) {
        customDataLastUpdate.delete(uid);
      }
    }

    // Rate limit: reject if last update was less than CUSTOM_DATA_RATE_LIMIT_MS ago
    const lastUpdate = customDataLastUpdate.get(userId);
    if (lastUpdate !== undefined && now - lastUpdate < CUSTOM_DATA_RATE_LIMIT_MS) {
      throw new Error('UPDATE_RATE_LIMITED');
    }

    // Set timestamp before the update starts (not after) to prevent race conditions
    customDataLastUpdate.set(userId, now);

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
    let existingPrefs: Record<string, unknown> = {};
    if (getRes.ok) {
      const existingCustomData = (await getRes.json()) as Record<string, unknown>;
      existingPrefs = (existingCustomData.Preferences as Record<string, unknown>) ?? {};
    }

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
  });
}

export async function updateAvatarUrl(avatarUrl: string): Promise<ActionResult> {
  return safeAction(async () => {
    if (avatarUrl) assertHttpUrl(avatarUrl, 'avatar');
    await patchMyAccount({ avatar: avatarUrl || null }, 'Avatar update failed');
  });
}
