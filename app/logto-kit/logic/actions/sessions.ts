'use server';

import { UAParser } from 'ua-parser-js';
import type { LogtoSession, SessionMeta } from '../types';
import { introspectToken } from '../utils';
import { debugLog } from '../debug';
import { assertSafeLogtoId, assertRevokeGrantsTarget } from '../guards';
import { getTokenForServerAction } from './tokens';
import { makeRequest } from './request';
import { throwOnApiError } from '../errors';

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
 * @returns Array of LogtoSession objects.
 */
export async function getUserSessions(verificationRecordId: string): Promise<LogtoSession[]> {
  assertSafeLogtoId(verificationRecordId, 'verificationRecordId');
  debugLog(`[getUserSessions] Fetching sessions with verification ID: ${verificationRecordId.substring(0, 8)}...`);
  const res = await makeRequest('/api/my-account/sessions', {
    extraHeaders: { 'logto-verification-id': verificationRecordId },
  });
  await throwOnApiError(res, 'FETCH_FAILED', 'get-sessions');
  const data = await res.json();
  const sessions = (data.sessions ?? []) as LogtoSession[];
  debugLog(`[getUserSessions] Received ${sessions.length} sessions from Logto`);
  return sessions;
}

/**
 * Gets the user's sessions with device metadata enriched.
 * @param verificationRecordId - Verification record for identity.
 * @returns Array of LogtoSession objects with enriched metadata.
 */
export async function getSessionsWithDeviceMeta(verificationRecordId: string): Promise<LogtoSession[]> {
  const sessions = await getUserSessions(verificationRecordId);

  const token = await getTokenForServerAction();
  const introspection = await introspectToken(token);
  const userId = introspection.sub || '';

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
      createdAt: new Date(session.payload.loginTs * 1000).toISOString(),
      // TODO(logto#8728-8731): replace false with `session.isCurrent ?? false`
      // once the isCurrent field lands in the Logto Account API sessions response.
      isCurrent: session.isCurrent ?? false,
    };

    return { ...session, meta };
  });

  return enrichedSessions;
}

/**
 * Revokes a user session.
 * @param sessionId - The session ID to revoke.
 * @param revokeGrantsTarget - Optional target for grant revocation.
 * @param identityVerificationRecordId - Optional verification record for identity.
 */
export async function revokeUserSession(
  sessionId: string,
  revokeGrantsTarget?: 'all' | 'firstParty',
  identityVerificationRecordId?: string,
): Promise<void> {
  assertSafeLogtoId(sessionId, 'sessionId');
  assertRevokeGrantsTarget(revokeGrantsTarget);
  if (identityVerificationRecordId !== undefined) assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

  debugLog(`[revokeUserSession] Starting revocation for session ${sessionId}`);
  debugLog(`[revokeUserSession] revokeGrantsTarget=${revokeGrantsTarget}, verificationId=${identityVerificationRecordId?.substring(0, 8)}...`);

  const extraHeaders: Record<string, string> = {};
  if (identityVerificationRecordId) {
    extraHeaders['logto-verification-id'] = identityVerificationRecordId;
  }

  const qs = revokeGrantsTarget ? `?revokeGrantsTarget=${encodeURIComponent(revokeGrantsTarget)}` : '';
  const safePath = `/api/my-account/sessions/${encodeURIComponent(sessionId)}${qs}`;

  debugLog(`[revokeUserSession] Calling DELETE ${safePath}`);
  const res = await makeRequest(safePath, {
    method: 'DELETE',
    extraHeaders,
  });

  debugLog(`[revokeUserSession] Logto responded with status ${res.status}`);
  await throwOnApiError(res, 'SESSION_REVOKE_FAILED', 'session-revoke');

  debugLog(`[revokeUserSession] Successfully revoked session ${sessionId}`);
}

/**
 * Revokes all sessions except the caller's current session.
 *
 * Safety guard: throws if no session is tagged `isCurrent: true` in the
 * API response. This prevents accidentally revoking every session
 * (including the active one) before Logto ships the isCurrent field
 * (PRs logto-io/logto#8728–8731). When isCurrent is unavailable, every
 * session would appear non-current and this guard aborts with an error.
 *
 * @param verificationRecordId - Verification record obtained via password challenge.
 */
export async function revokeAllOtherSessions(verificationRecordId: string): Promise<void> {
  assertSafeLogtoId(verificationRecordId, 'verificationRecordId');
  debugLog('[revokeAllOtherSessions] Fetching sessions');

  const sessions = await getUserSessions(verificationRecordId);

  const currentSession = sessions.find(s => s.isCurrent === true);
  if (!currentSession) {
    throw new Error('Cannot identify current session — isCurrent not yet available from Logto.');
  }

  const othersToRevoke = sessions.filter(s => s.isCurrent !== true);
  debugLog(`[revokeAllOtherSessions] Revoking ${othersToRevoke.length} session(s)`);

  const results = await Promise.allSettled(
    othersToRevoke.map(s =>
      revokeUserSession(s.payload.uid, 'firstParty', verificationRecordId)
    )
  );

  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    const count = failures.length;
    const total = othersToRevoke.length;
    throw new Error(
      `Failed to revoke ${count} of ${total} session(s). The remaining sessions may still be active.`
    );
  }

  debugLog('[revokeAllOtherSessions] All other sessions revoked');
}

// ============================================================================
// Grant Management Actions
// ============================================================================

/**
 * Gets the user's grants.
 * @returns Array of grants.
 */
export async function getUserGrants(): Promise<unknown[]> {
  const res = await makeRequest('/api/my-account/grants');
  await throwOnApiError(res, 'FETCH_FAILED', 'get-grants');
  const data = await res.json();
  return data.grants ?? [];
}

/**
 * Revokes a user grant.
 * @param grantId - The grant ID to revoke.
 * @param identityVerificationRecordId - Optional verification record for identity.
 */
export async function revokeUserGrant(
  grantId: string,
  identityVerificationRecordId?: string,
): Promise<void> {
  assertSafeLogtoId(grantId, 'grantId');
  if (identityVerificationRecordId !== undefined) assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');

  const extraHeaders: Record<string, string> = {};
  if (identityVerificationRecordId) {
    extraHeaders['logto-verification-id'] = identityVerificationRecordId;
  }

  const res = await makeRequest(`/api/my-account/grants/${encodeURIComponent(grantId)}`, {
    method: 'DELETE',
    extraHeaders,
  });
  await throwOnApiError(res, 'GRANT_REVOKE_FAILED', 'grant-revoke');
}
