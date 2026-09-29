'use server';

import { UAParser } from 'ua-parser-js';
import type { LogtoSession, SessionMeta } from '../types';
import { introspectToken } from '../utils';
import { debugLog } from '../debug';
import { assertSafeLogtoId, assertRevokeGrantsTarget } from '../guards';
import { getTokenForServerAction } from './tokens';
import { makeRequest } from './request';
import { throwOnApiError, plainCode } from '../errors';
import { safeAction, type ActionResult, type DataResult } from './safe';
import { requireVerifiedIdentity } from './verification-cookie';
import { warn, logEvent } from '../log';
import { auditSafe } from './helpers';
import { LOG_EVENTS } from '../../../lib/log-events';

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
 * Internal non-wrapped function to get user sessions.
 * Prevents double-wrapping error code swallowing (BUG-014).
 *
 * NOT exported (BUG-002): a non-exported async function in a `'use server'`
 * file is not callable via RPC, so a malicious client cannot invoke it with a
 * crafted `skipVerificationCheck`/`verificationRecordId`. Same-file callers
 * (`getUserSessions`, `getSessionsWithDeviceMeta`, `revokeAllOtherSessions`)
 * invoke it directly. Use the public `getUserSessions` wrapper from outside.
 */
async function getUserSessionsInternal(
  verificationRecordId: string,
): Promise<LogtoSession[]> {
  assertSafeLogtoId(verificationRecordId, 'verificationRecordId');
  // ── Staleness check (defense in depth) ────────────────────────────────
  // BUG-001 fix: expiry is read from the server-sealed httpOnly cookie
  // (set by verifyPasswordForIdentity), not a client-supplied timestamp.
  await requireVerifiedIdentity(verificationRecordId);
  debugLog(`[getUserSessions] Fetching sessions with verification ID: ${verificationRecordId.substring(0, 8)}...`);
  const res = await makeRequest('/api/my-account/sessions', {
    extraHeaders: { 'logto-verification-id': verificationRecordId },
  });
  await throwOnApiError(res, 'FETCH_FAILED', 'get-sessions');
  const data = await res.json();
  let sessions: LogtoSession[];
  if (Array.isArray(data)) {
    sessions = data as LogtoSession[];
  } else if (data && typeof data === 'object' && Array.isArray(data.sessions)) {
    sessions = data.sessions as LogtoSession[];
  } else {
    warn('Unexpected getUserSessions response shape:', data);
    sessions = [];
  }
  debugLog(`[getUserSessions] Received ${sessions.length} sessions from Logto`);
  return sessions;
}

/**
 * Gets the user's active sessions.
 * @param verificationRecordId - Verification record for identity.
 * @returns Array of LogtoSession objects.
 */
export async function getUserSessions(
  verificationRecordId: string,
): Promise<DataResult<LogtoSession[]>> {
  return safeAction(async () => {
    // ── Explicit auth check ───────────────────────────────────────────────
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken, { assertAudience: true });
    if (!introspection.active || !introspection.sub) {
      throw plainCode('UNAUTHENTICATED');
    }

    return getUserSessionsInternal(verificationRecordId);
  });
}

/**
 * Gets the user's sessions with device metadata enriched.
 * @param verificationRecordId - Verification record for identity.
 * @returns Array of LogtoSession objects with enriched metadata.
 */
export async function getSessionsWithDeviceMeta(
  verificationRecordId: string,
): Promise<DataResult<LogtoSession[]>> {
  return safeAction(async () => {
    // ── Explicit auth check ───────────────────────────────────────────────
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken, { assertAudience: true });
    if (!introspection.active || !introspection.sub) {
      throw plainCode('UNAUTHENTICATED');
    }

    const sessions = await getUserSessionsInternal(verificationRecordId);

    // userId is a display-only metadata field in SessionMeta and is not rendered.
    // Reuse the auth-guard introspection result to identify the current session
    // without adding another network round-trip.
    const userId = '';
    const resolution = resolveCurrentSessionUid(sessions, {
      sid: introspection.sid,
      client_id: introspection.client_id,
      sub: introspection.sub,
    });
    const currentSessionUnidentified = resolution.status === 'unidentified';
    const resolvedUid = resolution.status === 'resolved' ? resolution.uid : null;

    const enrichedSessions: LogtoSession[] = sessions.map((session) => {
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
        // A uniquely resolved current row is authoritative. If the signals are
        // ambiguous or conflicting, mark every row current so none is revocable.
        isCurrent: currentSessionUnidentified
          ? true
          : resolvedUid === null
            ? (session.isCurrent ?? true)   // 'none-required' (empty list) — unreachable in practice, kept for shape safety
            : session.payload.uid === resolvedUid,
      };

      return { ...session, meta };
    });

    return enrichedSessions;
  });
}

/**
 * Resolves which session row belongs to the caller's current token.
 *
 * NOT exported (BUG-002 pattern): a non-exported function in a
 * 'use server' file is not callable via RPC. Keep it private — exporting
 * would create a client-callable identity-resolution oracle.
 *
 * Namespace note (post-R1): `introspection.sid` is the PER-CLIENT OIDC
 * session id emitted since the shared app enabled
 * `backchannelLogoutSessionRequired`. It is NOT `payload.uid` (the
 * OP-internal sessionUid). The durable association lives at
 * `payload.authorizations[clientId].sid` — the same join the OP's own
 * `findExactSessionActivity` uses.
 *
 * Fail-closed contract: returns `{ status: 'unidentified' }` for ANY
 * ambiguous or hostile shape. Callers must treat 'unidentified' as
 * "mark every row current / refuse bulk revoke", never as "pick a guess".
 *
 * @returns One of:
 *   `{ status:'resolved', uid }`   — exactly one row resolved; `uid` is the
 *                                   row's `payload.uid` (canonical for DELETE).
 *   `{ status:'none-required' }`   — sessions list is empty.
 *   `{ status:'unidentified' }`    — cannot safely identify the current row.
 */
type CurrentSessionResolution =
  | { status: 'resolved'; uid: string }
  | { status: 'none-required' }
  | { status: 'unidentified' };

function resolveCurrentSessionUid(
  sessions: LogtoSession[],
  introspection: { sid?: string; client_id?: string; sub?: string },
): CurrentSessionResolution {
  if (sessions.length === 0) return { status: 'none-required' };

  const upstreamIndexes = sessions.flatMap((s, i) => (s.isCurrent === true ? [i] : []));
  const upstreamCount = upstreamIndexes.length;

  // An upstream list that explicitly marks ≥2 rows current is internally
  // inconsistent; zero explicit markers is handled per-path below.
  if (upstreamCount > 1) return { status: 'unidentified' };

  const sid = introspection.sid;

  if (sid) {
    // ── sid-present path (post-R1 wire) ─────────────────────────────────
    // client_id is already audience-validated by assertAudience before this
    // runs — keying authorizations[client_id] cannot be redirected by a
    // forged client claim. A sid matching only a DIFFERENT client's map
    // yields zero matches → unidentified. Never iterate other clients.
    const clientId = introspection.client_id;
    if (!clientId) return { status: 'unidentified' };

    const sidMatchIndexes = sessions.flatMap((s, i) =>
      s.payload.authorizations?.[clientId]?.sid === sid ? [i] : []
    );
    if (sidMatchIndexes.length !== 1) return { status: 'unidentified' };

    const matchIndex = sidMatchIndexes[0];
    const row = sessions[matchIndex];

    // Same-subject guard (defense-in-depth): the sessions list is already
    // user-scoped by the Account API and `sub` is asserted non-null upstream,
    // but a mismatched accountId on a sid-matching row is a shape we must not
    // honor. Skip rather than fail when either field is absent — old wire
    // rows may lack accountId.
    if (
      row.payload.accountId !== undefined &&
      introspection.sub !== undefined &&
      row.payload.accountId !== introspection.sub
    ) {
      return { status: 'unidentified' };
    }

    // Stale-sid hazard: a sid persists in payload.authorizations even after
    // the row is revoked/expired. If upstream actively reports a DIFFERENT
    // single current row, or reports zero current while the matched row is
    // provably dead, do NOT resurrect the dead row as current.
    if (upstreamCount === 1 && upstreamIndexes[0] !== matchIndex) {
      return { status: 'unidentified' }; // sid/upstream conflict
    }
    if (upstreamCount === 1 && upstreamIndexes[0] === matchIndex) {
      return { status: 'resolved', uid: row.payload.uid }; // corroborated
    }
    // upstreamCount === 0: upstream shipped no marker (legacy shape) OR
    // explicitly reports zero current. We may only resolve from the
    // authorizations map when the row itself is not provably dead.
    // expiresAt on the live wire is epoch milliseconds; the < 1e12 heuristic
    // is a seconds-unit safety net. A non-numeric/un-parseable expiresAt is
    // treated as NOT expired (absence of evidence must not demote).
    const expiresAtMs =
      typeof row.expiresAt === 'number'
        ? row.expiresAt * (row.expiresAt < 1e12 ? 1000 : 1)
        : Number.POSITIVE_INFINITY;
    const expired = expiresAtMs <= Date.now();
    const inactive = row.isCurrent === false; // explicit false on the ONLY matched row
    if (expired || inactive) return { status: 'unidentified' };
    return { status: 'resolved', uid: row.payload.uid };
  }

  // ── sid-absent path (pre-R1 wire) ──────────────────────────────────────
  // Exactly one upstream marker is required; all-false/absent cannot identify.
  if (upstreamCount === 1) {
    return { status: 'resolved', uid: sessions[upstreamIndexes[0]].payload.uid };
  }
  return { status: 'unidentified' };
}

/**
 * Internal non-wrapped function to revoke a user session.
 * Supports skipping the verification check to prevent mid-loop timeouts (BUG-004).
 *
 * NOT exported (BUG-002): this function accepts a client-controllable
 * `skipVerificationCheck` param that bypasses `requireVerifiedIdentity` +
 * `auditSafe`. Exporting it from a `'use server'` file would make it a
 * client-callable Server Action, letting a malicious RPC client revoke
 * arbitrary sessions without identity verification. It is a same-file helper
 * only — external callers must use the public `revokeUserSession` wrapper,
 * which always enforces verification and writes an audit record.
 */
async function revokeUserSessionInternal(
  sessionId: string,
  identityVerificationRecordId: string,
  revokeGrantsTarget: 'all' | 'firstParty' = 'all',
  signal?: AbortSignal,
  skipVerificationCheck = false,
): Promise<void> {
  assertSafeLogtoId(sessionId, 'sessionId');
  assertRevokeGrantsTarget(revokeGrantsTarget);
  assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');
  if (!skipVerificationCheck) {
    // BUG-001 fix: expiry is read from the server-sealed httpOnly cookie,
    // not a client-supplied timestamp.
    await requireVerifiedIdentity(identityVerificationRecordId);
  }

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
}

/**
 * Revokes a user session.
 *
 * Security default (LOW-2): `revokeGrantsTarget` defaults to `'all'` to ensure
 * that when a user revokes a single session (a deliberate security action), all
 * OAuth grants associated with that session are also revoked. Callers that need
 * to preserve third-party grants may pass `'firstParty'` explicitly.
 *
 * Note: `revokeAllOtherSessions` uses `'firstParty'` intentionally — bulk
 * revocation with 'all' could revoke third-party grants the user did not intend.
 * Only single-session UI actions use the 'all' default.
 *
 * @param sessionId - The session ID to revoke.
 * @param identityVerificationRecordId - Required verification record for identity.
 * @param revokeGrantsTarget - Target for grant revocation. Defaults to 'all'.
 */
export async function revokeUserSession(
  sessionId: string,
  identityVerificationRecordId: string,
  revokeGrantsTarget: 'all' | 'firstParty' = 'all',
  signal?: AbortSignal,
): Promise<ActionResult> {
  return safeAction(async () => {
    // ── Explicit auth check ───────────────────────────────────────────────
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken, { assertAudience: true });
    if (!introspection.active || !introspection.sub) {
      throw plainCode('UNAUTHENTICATED');
    }
    const userId = introspection.sub;

    await revokeUserSessionInternal(
      sessionId,
      identityVerificationRecordId,
      revokeGrantsTarget,
      signal,
    );

    // Audit + structured log (after upstream success, mirroring mfa.ts pattern).
    auditSafe(userId, 'session.revoke', sessionId, { revokeGrantsTarget });
    logEvent.info(LOG_EVENTS.SESSION_REVOKE, 'Session revoked', { sessionId, revokeGrantsTarget });
  }) as Promise<ActionResult>;
}

/**
 * Revokes all sessions except the caller's current session.
 *
 * Safety guard: identifies the current session via the shared
 * `resolveCurrentSessionUid` resolver — the token's per-client `sid` is
 * matched against each row's `payload.authorizations[clientId].sid`, and the
 * resolved row's canonical `payload.uid` is kept. Falls back to a unique
 * upstream `isCurrent` marker when `sid` is absent.
 * Throws `SESSION_REVOKE_FAILED` when resolution is ambiguous or the current
 * row cannot be identified — before any DELETE.
 *
 * @param verificationRecordId - Verification record obtained via password challenge.
 */
export async function revokeAllOtherSessions(
  verificationRecordId: string,
): Promise<ActionResult> {
  return safeAction(async () => {
    // ── Explicit auth check ───────────────────────────────────────────────
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken, { assertAudience: true });
    if (!introspection.active || !introspection.sub) {
      throw plainCode('UNAUTHENTICATED');
    }

    assertSafeLogtoId(verificationRecordId, 'verificationRecordId');
    // BUG-001 fix: expiry is read from the server-sealed httpOnly cookie,
    // not a client-supplied timestamp.
    await requireVerifiedIdentity(verificationRecordId);
    debugLog('[revokeAllOtherSessions] Fetching sessions');

    const sessions = await getUserSessionsInternal(verificationRecordId);

    // Identify the current session via the SAME private resolver the list
    // action uses. `sessions` was just re-fetched above — resolution is
    // computed on this FRESH list, never on a previously rendered list.
    const resolution = resolveCurrentSessionUid(sessions, {
      sid: introspection.sid,
      client_id: introspection.client_id,
      sub: introspection.sub,
    });

    if (resolution.status !== 'resolved') {
      // 'unidentified' (ambiguous/hostile wire) or 'none-required' (empty
      // list): refuse the bulk op before any DELETE.
      throw plainCode('SESSION_REVOKE_FAILED');
    }

    const currentSessionUid = resolution.uid;
    // Filter by uid (the session identifier, not the JWT id)
    const othersToRevoke = sessions.filter(s => s.payload.uid !== currentSessionUid);
    debugLog(`[revokeAllOtherSessions] Revoking ${othersToRevoke.length} session(s)`);

    // userId is derived from session introspection (never client-supplied) and
    // is needed up-front for the per-session audit records written inside the
    // loop (BUG-016).
    const userId = introspection.sub;

    // Revoke sessions sequentially with a small delay to avoid hitting
    // Logto API rate limits (429) when many sessions are revoked at once.
    const results: PromiseSettledResult<void>[] = [];
    for (let i = 0; i < othersToRevoke.length; i++) {
      const s = othersToRevoke[i];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      try {
        await revokeUserSessionInternal(
          s.payload.uid,
          verificationRecordId,
          'firstParty',
          controller.signal,
          true, // skipVerificationCheck (BUG-004)
        );
        results.push({ status: 'fulfilled', value: undefined });
        // BUG-016: Audit each successful revocation inside the loop so a
        // partial failure never leaves revoked sessions with zero audit
        // records. auditSafe is best-effort and never throws.
        auditSafe(userId, 'session.revoke', s.payload.uid, { revokeGrantsTarget: 'firstParty' });
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
      // BUG-016: Throw a sanitized code instead of a raw Error so upstream
      // detail (count/total) is not leaked to the client. Per-session audit
      // records for the sessions that DID revoke were already written inside
      // the loop above, so a partial failure no longer leaves zero records.
      throw plainCode('SESSION_REVOKE_PARTIAL');
    }

    debugLog('[revokeAllOtherSessions] All other sessions revoked');

    // Audit + structured log (after full upstream success).
    auditSafe(userId, 'session.revoke.all', undefined, { count: othersToRevoke.length });
    logEvent.info(LOG_EVENTS.SESSION_REVOKE, 'Bulk session revoke', { count: othersToRevoke.length });
  }) as Promise<ActionResult>;
}

// ============================================================================
// Grant Management Actions
// ============================================================================

/**
 * Gets the user's grants.
 * @param identityVerificationRecordId - Verification record from a prior identity check.
 * @returns Array of grants.
 */
export async function getUserGrants(
  identityVerificationRecordId: string,
): Promise<DataResult<unknown[]>> {
  return safeAction(async () => {
    // ── Explicit auth check ───────────────────────────────────────────────
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken, { assertAudience: true });
    if (!introspection.active || !introspection.sub) {
      throw plainCode('UNAUTHENTICATED');
    }

    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');
    // BUG-001 fix: expiry is read from the server-sealed httpOnly cookie.
    await requireVerifiedIdentity(identityVerificationRecordId);
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
 */
export async function revokeUserGrant(
  grantId: string,
  identityVerificationRecordId: string,
): Promise<ActionResult> {
  return safeAction(async () => {
    // ── Explicit auth check ───────────────────────────────────────────────
    const sessionToken = await getTokenForServerAction();
    const introspection = await introspectToken(sessionToken, { assertAudience: true });
    if (!introspection.active || !introspection.sub) {
      throw plainCode('UNAUTHENTICATED');
    }
    const userId = introspection.sub;

    assertSafeLogtoId(grantId, 'grantId');
    assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');
    // BUG-001 fix: expiry is read from the server-sealed httpOnly cookie.
    await requireVerifiedIdentity(identityVerificationRecordId);

    const extraHeaders: Record<string, string> = {
      'logto-verification-id': identityVerificationRecordId,
    };

    const res = await makeRequest(`/api/my-account/grants/${encodeURIComponent(grantId)}`, {
      method: 'DELETE',
      extraHeaders,
    });
    await throwOnApiError(res, 'GRANT_REVOKE_FAILED', 'grant-revoke');

    // Audit + structured log (after upstream success).
    auditSafe(userId, 'grant.revoke', grantId);
    logEvent.info(LOG_EVENTS.SESSION_REVOKE, 'Grant revoked', { grantId });
  }) as Promise<ActionResult>;
}
