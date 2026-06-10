'use server';

import { UAParser } from 'ua-parser-js';
import type { LogtoSession, SessionMeta } from '../types';
import { introspectToken } from '../utils';
import { debugLog } from '../debug';
import { warn } from '../log';
import { assertSafeLogtoId, assertRevokeGrantsTarget } from '../guards';
import { getTokenForServerAction } from './tokens';
import { makeRequest } from './request';
import { throwOnApiError } from '../errors';
import { safeAction, type ActionResult, type DataResult } from './safe';
import { assertVerificationNotExpired } from './helpers';

// ============================================================================
// User Agent Parsing
// ============================================================================

/**
 * Parses a user agent string to extract browser, OS, and device information.
 * @param ua - The user agent string.
 * @returns Object containing parsed browser, OS, and device information.
 */
function parseSignInContext(ua: string): { browser: string | null; browserVersion: string | null; os: string | null; osVersion: string | null; deviceType: string | null } {
  if (!ua) return { browser: null, browserVersion: null, os: null, osVersion: null, deviceType: null };
  const parser = new UAParser(ua);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();
  return {
    browser: browser.name || null,
    browserVersion: browser.version || null,
    os: os.name || null,
    osVersion: os.version || null,
    deviceType: device.type || null,
  };
}

// ============================================================================
// Session Management Actions
// ============================================================================

/**
 * Gets the user's active sessions.
 * @param verificationRecordId - Verification record for identity.
 * @param verificationTimestamp - Verification record creation timestamp.
 * @returns Array of LogtoSession objects.
 */
export async function getUserSessions(
  verificationRecordId: string,
  verificationTimestamp: number,
): Promise<DataResult<LogtoSession[]>> {
  return safeAction(async () => {
    assertSafeLogtoId(verificationRecordId, 'verificationRecordId');
    assertVerificationNotExpired(verificationTimestamp);
    debugLog(`[getUserSessions] Fetching sessions with verification ID: ${verificationRecordId.substring(0, 8)}...`);
    const res = await makeRequest('/api/my-account/sessions', {
      extraHeaders: { 'logto-verification-id': verificationRecordId },
    });
    await throwOnApiError(res, 'FETCH_FAILED', 'get-sessions');
    const data = await res.json();
    const sessions = (data.sessions ?? []) as LogtoSession[];
    debugLog(`[getUserSessions] Received ${sessions.length} sessions from Logto`);
    return sessions;
  });
}

/**
 * Gets the user's sessions with device metadata enriched.
 * @param verificationRecordId - Verification record for identity.
 * @param verificationTimestamp - Verification record creation timestamp.
 * @returns Array of LogtoSession objects with enriched metadata.
 */
export async function getSessionsWithDeviceMeta(
  verificationRecordId: string,
  verificationTimestamp: number,
): Promise<DataResult<LogtoSession[]>> {
  return safeAction(async () => {
    const sessionsResult = await getUserSessions(verificationRecordId, verificationTimestamp);
    if (!sessionsResult.ok) {
      throw new Error(sessionsResult.error);
    }
    const sessions = sessionsResult.data;

    // Introspection is optional - userId is only used for display metadata.
    // If introspection fails (e.g., LOGTO_INTROSPECTION_URL not configured),
    // use empty string as fallback. This prevents the sessions tab from breaking.
    let userId = '';
    try {
      const token = await getTokenForServerAction();
      const introspection = await introspectToken(token);
      userId = introspection.sub || '';
    } catch (err) {
      warn('[getSessionsWithDeviceMeta] Introspection failed, using empty userId:', err instanceof Error ? err.message : String(err));
      // Introspection failed; use empty userId as fallback
    }

    const enrichedSessions: LogtoSession[] = sessions.map(session => {
      const signInContext = session.lastSubmission?.signInContext;
      const deviceInfo = parseSignInContext(signInContext?.userAgent || '');

      const meta: SessionMeta = {
        jti: session.payload.jti,
        userId,
        browser: deviceInfo.browser,
        browserVersion: deviceInfo.browserVersion,
        os: deviceInfo.os,
        osVersion: deviceInfo.osVersion,
        deviceType: deviceInfo.deviceType,
        ip: signInContext?.ip || null,
        lastActive: session.lastActiveAt ?? null,
        // NOTE: Logto returns loginTs in milliseconds. The heuristic below
        // (< 1e12 → seconds) is a safety net in case the unit changes.
        // If Logto ever switches to seconds, update this code and remove the heuristic.
        createdAt: new Date(session.payload.loginTs < 1e12 ? session.payload.loginTs * 1000 : session.payload.loginTs).toISOString(),
        // TODO(logto#8728-8731): replace false with `session.isCurrent ?? false`
        // once the isCurrent field lands in the Logto Account API sessions response.
        isCurrent: session.isCurrent ?? false,
      };

      return { ...session, meta };
    });

    return enrichedSessions;
  });
}

/**
 * Revokes a user session.
 * @param sessionId - The session ID to revoke.
 * @param identityVerificationRecordId - Required verification record for identity.
 * @param verificationTimestamp - Verification record creation timestamp.
 * @param revokeGrantsTarget - Optional target for grant revocation.
 */
export async function revokeUserSession(
  sessionId: string,
  identityVerificationRecordId: string,
  verificationTimestamp: number,
  revokeGrantsTarget?: 'all' | 'firstParty',
  signal?: AbortSignal,
): Promise<ActionResult> {
  return safeAction(async () => {
    assertSafeLogtoId(sessionId, 'sessionId');
    assertRevokeGrantsTarget(revokeGrantsTarget);
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');
    assertVerificationNotExpired(verificationTimestamp);

    debugLog(`[revokeUserSession] Starting revocation for session ${sessionId}`);
    debugLog(`[revokeUserSession] revokeGrantsTarget=${revokeGrantsTarget}, verificationId=${identityVerificationRecordId.substring(0, 8)}...`);

    const extraHeaders: Record<string, string> = {
      'logto-verification-id': identityVerificationRecordId,
    };

    const safePath = `/api/my-account/sessions/${encodeURIComponent(sessionId)}`;

    debugLog(`[revokeUserSession] Calling DELETE ${safePath}${revokeGrantsTarget ? `?revokeGrantsTarget=${revokeGrantsTarget}` : ''}`);
    const res = await makeRequest(safePath, {
      method: 'DELETE',
      extraHeaders,
      ...(revokeGrantsTarget && { query: { revokeGrantsTarget } }),
      signal,
    });

    debugLog(`[revokeUserSession] Logto responded with status ${res.status}`);
    await throwOnApiError(res, 'SESSION_REVOKE_FAILED', 'session-revoke');

    debugLog(`[revokeUserSession] Successfully revoked session ${sessionId}`);
  }) as Promise<ActionResult>;
}

/**
 * Revokes all sessions except the caller's current session.
 *
 * Safety guard: identifies the current session via session UID matching from
 * token introspection (`sid` claim = OIDC session UID = payload.uid).
 * Falls back to `isCurrent` field if `sid` is unavailable.
 * Throws if neither method can identify the current session.
 *
 * @param verificationRecordId - Verification record obtained via password challenge.
 * @param verificationTimestamp - Verification record creation timestamp.
 */
export async function revokeAllOtherSessions(
  verificationRecordId: string,
  verificationTimestamp: number,
): Promise<ActionResult> {
  return safeAction(async () => {
    assertSafeLogtoId(verificationRecordId, 'verificationRecordId');
    assertVerificationNotExpired(verificationTimestamp);
    debugLog('[revokeAllOtherSessions] Fetching sessions');

    const sessionsResult = await getUserSessions(verificationRecordId, verificationTimestamp);
    if (!sessionsResult.ok) {
      throw new Error(sessionsResult.error);
    }
    const sessions = sessionsResult.data;

    // Identify current session via token introspection.
    // The introspection `sid` claim is the OIDC session UID - matches payload.uid.
    // Fall back to isCurrent flag if sid is absent.
    const token = await getTokenForServerAction();
    const introspection = await introspectToken(token);
    const currentSid = introspection.sid;  // session UID, matches payload.uid

    const currentSession = currentSid
      ? sessions.find(s => s.payload.uid === currentSid)
      : sessions.find(s => s.isCurrent === true);

    if (!currentSession) {
      throw new Error('Cannot identify current session - session UID mismatch.');
    }

    // Filter by uid (the session identifier, not the JWT id)
    const othersToRevoke = sessions.filter(s => s.payload.uid !== currentSession.payload.uid);
    debugLog(`[revokeAllOtherSessions] Revoking ${othersToRevoke.length} session(s)`);

    // Revoke sessions sequentially with a small delay to avoid hitting
    // Logto API rate limits (429) when many sessions are revoked at once.
    const results: PromiseSettledResult<void>[] = [];
    for (let i = 0; i < othersToRevoke.length; i++) {
      const s = othersToRevoke[i];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      try {
        const r = await revokeUserSession(s.payload.uid, verificationRecordId, verificationTimestamp, 'firstParty', controller.signal);
        if (!r.ok) throw new Error(r.error);
        results.push({ status: 'fulfilled', value: undefined });
      } catch (reason) {
        results.push({ status: 'rejected', reason });
      } finally {
        clearTimeout(timeoutId);
      }
      // Small delay between revocations to avoid rate limiting
      if (i < othersToRevoke.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      const count = failures.length;
      const total = othersToRevoke.length;
      throw new Error(
        `Failed to revoke ${count} of ${total} session(s). The remaining sessions may still be active.`
      );
    }

    debugLog('[revokeAllOtherSessions] All other sessions revoked');
  }) as Promise<ActionResult>;
}

// ============================================================================
// Grant Management Actions
// ============================================================================

/**
 * Gets the user's grants.
 * @param identityVerificationRecordId - Verification record from a prior identity check.
 * @param verificationTimestamp - Verification record creation timestamp.
 * @returns Array of grants.
 */
export async function getUserGrants(
  identityVerificationRecordId: string,
  verificationTimestamp: number,
): Promise<DataResult<unknown[]>> {
  return safeAction(async () => {
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');
    assertVerificationNotExpired(verificationTimestamp);
    const res = await makeRequest('/api/my-account/grants', {
      extraHeaders: { 'logto-verification-id': identityVerificationRecordId },
    });
    await throwOnApiError(res, 'FETCH_FAILED', 'get-grants');
    const data = await res.json();
    return data.grants ?? [];
  });
}

/**
 * Revokes a user grant.
 * @param grantId - The grant ID to revoke.
 * @param identityVerificationRecordId - Required verification record for identity.
 * @param verificationTimestamp - Verification record creation timestamp.
 */
export async function revokeUserGrant(
  grantId: string,
  identityVerificationRecordId: string,
  verificationTimestamp: number,
): Promise<ActionResult> {
  return safeAction(async () => {
    assertSafeLogtoId(grantId, 'grantId');
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');
    assertVerificationNotExpired(verificationTimestamp);

    const extraHeaders: Record<string, string> = {
      'logto-verification-id': identityVerificationRecordId,
    };

    const res = await makeRequest(`/api/my-account/grants/${encodeURIComponent(grantId)}`, {
      method: 'DELETE',
      extraHeaders,
    });
    await throwOnApiError(res, 'GRANT_REVOKE_FAILED', 'grant-revoke');
  }) as Promise<ActionResult>;
}
