'use server';

import { UAParser } from 'ua-parser-js';
import type { LogtoSession, SessionMeta } from '../types';
import { introspectToken } from '../utils';
import { debugLog } from '../debug';
import { getTokenForServerAction } from './tokens';
import { makeRequest } from './request';
import { throwOnApiError } from './shared';

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
  debugLog(`[getUserSessions] Fetching sessions with verification ID: ${verificationRecordId.substring(0, 8)}...`);
  const res = await makeRequest('/api/my-account/sessions', {
    extraHeaders: { 'logto-verification-id': verificationRecordId },
  });
  await throwOnApiError(res, 'Get sessions failed');
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
      lastActive: null,
      createdAt: new Date(session.payload.loginTs * 1000).toISOString(),
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
  debugLog(`[revokeUserSession] Starting revocation for session ${sessionId}`);
  debugLog(`[revokeUserSession] revokeGrantsTarget=${revokeGrantsTarget}, verificationId=${identityVerificationRecordId?.substring(0, 8)}...`);

  const extraHeaders: Record<string, string> = {};
  if (identityVerificationRecordId) {
    extraHeaders['logto-verification-id'] = identityVerificationRecordId;
  }

  const path = `/api/my-account/sessions/${sessionId}`
    + (revokeGrantsTarget ? `?revokeGrantsTarget=${revokeGrantsTarget}` : '');

  debugLog(`[revokeUserSession] Calling DELETE ${path}`);
  const res = await makeRequest(path, {
    method: 'DELETE',
    extraHeaders,
  });

  debugLog(`[revokeUserSession] Logto responded with status ${res.status}`);
  await throwOnApiError(res, 'Session revocation failed');

  debugLog(`[revokeUserSession] Successfully revoked session ${sessionId}`);
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
  await throwOnApiError(res, 'Get grants failed');
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
  const extraHeaders: Record<string, string> = {};
  if (identityVerificationRecordId) {
    extraHeaders['logto-verification-id'] = identityVerificationRecordId;
  }

  const res = await makeRequest(`/api/my-account/grants/${grantId}`, {
    method: 'DELETE',
    extraHeaders,
  });
  await throwOnApiError(res, 'Grant revocation failed');
}
