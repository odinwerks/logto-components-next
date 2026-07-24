'use server';

import { makeRequest } from './request';
import { patchMyAccount } from './shared';
import { throwOnApiError, plainCode } from '../errors';
import {
  assertNameField,
  assertUsername,
  assertHttpUrl,
  assertSafeLogtoId,
  pickPreferences,
} from '../guards';
import { safeAction, type ActionResult } from './safe';
import { getManagementApiToken } from '../../config';
import { getCleanEndpoint, introspectToken } from '../utils';
import { warn, logEvent } from '../log';
import { auditSafe } from './helpers';
import { requireVerifiedIdentity } from './verification-cookie';
import { LOG_EVENTS } from '../../../lib/log-events';
import { createLockManager } from '../../../lib/distributed-state';
import { getTokenForServerAction } from './tokens';

export async function updateUserBasicInfo(
  updates: { name?: string; username?: string; avatar?: string },
  identityVerificationRecordId?: string,
): Promise<ActionResult> {
  return safeAction(async () => {
    // ── Explicit auth check ───────────────────────────────────────────────
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken);
    if (!introspection.active || !introspection.sub) {
      throw plainCode('UNAUTHENTICATED');
    }

    assertNameField(updates.name, 'name');
    assertUsername(updates.username);
    assertHttpUrl(updates.avatar, 'avatar');

    // MCP-001c / BUG-010: Logto requires the `logto-verification-id` header
    // for username changes (PATCH /api/my-account with a `username` field).
    // Mirror the webauthn.ts:72-78 two-step defense: require the record ID,
    // format-validate it via assertSafeLogtoId, then read the server-sealed
    // verification cookie (HMAC-bound + staleness-checked) via
    // requireVerifiedIdentity. profile.ts was the sole outlier skipping this
    // check — now aligned with all other verification-gated action files
    // (webauthn, mfa, password, account, sessions).
    const hasUsernameUpdate = updates.username !== undefined;
    if (hasUsernameUpdate) {
      if (!identityVerificationRecordId) {
        throw plainCode('VERIFICATION_REQUIRED');
      }
      assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');
      await requireVerifiedIdentity(identityVerificationRecordId);
    }

    // BUG-001: Explicitly pick only the three declared keys before filtering.
    // The previous value-only filter (`Object.entries(updates).filter(...)`)
    // let clients inject arbitrary keys (e.g. `customData`) that flowed
    // straight to PATCH /api/my-account, full-replacing customData and
    // bypassing pickPreferences(). Picking declared keys closes the hole.
    //
    // BUG-H01: `''` is a valid "clear" sentinel for name/username on Logto's
    // Account API — it MUST flow through to PATCH /api/my-account so that
    // clearing a name field actually persists. The previous filter also
    // dropped `''`, so a clear returned { ok: true } without ever calling
    // Logto. Only `undefined` (field omitted by the caller) is dropped now.
    // Avatar is the exception: clearing the avatar uses `null` via the
    // dedicated `updateAvatarUrl` path, so an empty avatar string is still
    // stripped to avoid an unintended write.
    const cleanUpdates = Object.fromEntries(
      Object.entries({
        name: updates.name,
        username: updates.username,
        avatar: updates.avatar,
      }).filter(([k, v]) => v !== undefined && !(k === 'avatar' && v === ''))
    );
    if (Object.keys(cleanUpdates).length === 0) return;
    const extraHeaders = hasUsernameUpdate && identityVerificationRecordId
      ? { 'logto-verification-id': identityVerificationRecordId }
      : undefined;
    await patchMyAccount(cleanUpdates, 'Basic info update failed', extraHeaders);

    // Audit + structured log (after upstream success).
    const userId = introspection.sub;
    auditSafe(userId, 'basic_info.update', undefined, { fields: Object.keys(cleanUpdates) });
    logEvent.info(LOG_EVENTS.USER_PROFILE_UPDATE, 'Basic info updated', { fields: Object.keys(cleanUpdates) });
  });
}

export async function updateUserProfile(profile: {
  givenName?: string;
  familyName?: string;
}): Promise<ActionResult> {
  return safeAction(async () => {
    // ── Explicit auth check ───────────────────────────────────────────────
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken);
    if (!introspection.active || !introspection.sub) {
      throw plainCode('UNAUTHENTICATED');
    }

    assertNameField(profile.givenName, 'givenName');
    assertNameField(profile.familyName, 'familyName');

    // BUG-009: Explicitly pick only the two declared keys before filtering.
    // The previous value-only filter (`Object.entries(profile).filter(...)`)
    // let clients inject arbitrary keys (e.g. `profilePicture:
    // 'javascript:alert(1)'`) that flowed straight to
    // PATCH /api/my-account/profile. Picking declared keys closes the hole.
    //
    // BUG-H01: `''` is a valid "clear" sentinel for givenName/familyName on
    // Logto's Account API — it MUST flow through to PATCH
    // /api/my-account/profile so that clearing a name field actually
    // persists. The previous filter also dropped `''`, so a clear returned
    // { ok: true } without ever calling Logto. Only `undefined` (field
    // omitted by the caller) is dropped now.
    const cleanProfile = Object.fromEntries(
      Object.entries({
        givenName: profile.givenName,
        familyName: profile.familyName,
      }).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(cleanProfile).length === 0) return;

    const res = await makeRequest('/api/my-account/profile', {
      method: 'PATCH',
      body: cleanProfile,
    });
    await throwOnApiError(res, 'UPDATE_FAILED', 'profile-update', true);

    // Audit + structured log (after upstream success).
    const userId = introspection.sub;
    auditSafe(userId, 'profile.update', undefined, { fields: Object.keys(cleanProfile) });
    logEvent.info(LOG_EVENTS.USER_PROFILE_UPDATE, 'Profile updated', { fields: Object.keys(cleanProfile) });
  });
}

// In-flight lock to prevent concurrent GET-PATCH races when
// PreferencesProvider calls updateUserCustomData in rapid succession.
// Per-user Map keyed by user ID to avoid blocking different users.
const customDataLockManager = createLockManager('profile-custom-data');

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

    // BUG-M04: Use live token introspection (same pattern as updateUserBasicInfo)
    // instead of stale getLogtoContext, to prevent IDOR via stale session claims.
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken);
    if (!introspection.active || !introspection.sub) {
      throw plainCode('UNAUTHENTICATED');
    }
    const userId = introspection.sub;
    assertSafeLogtoId(userId, 'userId');

    // Fetch M2M token and endpoint BEFORE acquiring the lock to avoid
    // holding the lock during network I/O (BUG-010).
    const mgmtToken = await getManagementApiToken();
    const endpoint = getCleanEndpoint();

    const releaseLock = await customDataLockManager.acquire(userId);

    try {
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
        throw plainCode('UPDATE_FAILED');
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
        throw plainCode('UPDATE_FAILED');
      }

      // Audit + structured log (after successful PATCH, before releaseLock).
      auditSafe(userId, 'custom_data.update', userId, { keys: Object.keys(safePrefs) });
      logEvent.info(LOG_EVENTS.USER_CUSTOM_DATA_UPDATE, 'Custom data updated', { keys: Object.keys(safePrefs) });
    } finally {
      await releaseLock();
    }
  });
}

export async function updateAvatarUrl(avatarUrl: string): Promise<ActionResult> {
  return safeAction(async () => {
    // ── Explicit auth check ───────────────────────────────────────────────
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken);
    if (!introspection.active || !introspection.sub) {
      throw plainCode('UNAUTHENTICATED');
    }
    const userId = introspection.sub;

    if (avatarUrl) assertHttpUrl(avatarUrl, 'avatar');
    await patchMyAccount({ avatar: avatarUrl || null }, 'Avatar update failed');

    // BUG-063: Audit + structured log after success. This was the only
    // profile-modifying action that omitted auditSafe()/logEvent, leaving
    // avatar URL changes unaudited. `userId` is derived from introspection.sub
    // (IDOR-safe); `cleared` flags a null/empty avatar (removal vs. update).
    auditSafe(userId, 'avatar.url_update', userId, { cleared: !avatarUrl });
    logEvent.info(LOG_EVENTS.USER_PROFILE_UPDATE, 'Avatar URL updated', { cleared: !avatarUrl });
  });
}
