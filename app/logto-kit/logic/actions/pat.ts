'use server';

import { getManagementApiToken } from '../../config';
import { getCleanEndpoint, introspectToken } from '../utils';
import { debugLog } from '../debug';
import { assertSafeLogtoId } from '../guards';
import { safeAction, type ActionResult, type DataResult } from './safe';
import { warn, logEvent } from '../log';
import { getTokenForServerAction } from './tokens';
import { plainCode } from '../errors';
import { makeManagementFetch } from './management-request';
import { requireVerifiedIdentity } from './verification-cookie';
import { auditSafe } from './helpers';
import { createLockManager, createRateLimiter } from '../../../lib/distributed-state';
import { ValidationError } from '../validation';
import { LOG_EVENTS } from '../../../lib/log-events';
import type { PatToken } from '../types';
import { isPatEnabled } from '../tabs';

// ============================================================================
// Personal Access Token (PAT) Management — Logto Management API
//
// Logto's Account API (`/api/my-account`) has NO personal-access-token
// endpoints (verified against packages/core/src/routes/account/index.openapi.json
// in logto-io/logto). PAT management is Management-API-only:
//
//   GET    /api/users/{userId}/personal-access-tokens          - list
//   POST   /api/users/{userId}/personal-access-tokens          - create
//   PATCH  /api/users/{userId}/personal-access-tokens          - rename
//   POST   /api/users/{userId}/personal-access-tokens/delete   - delete by name
//
// All requests use the M2M Management API token (client_credentials). The
// `userId` is ALWAYS derived from session token introspection, never from
// client input (IDOR prevention). The token `value` is returned only once by
// the create endpoint; list responses mask it server-side and it never
// reaches the client outside the one-time create result.
//
// ── Purpose-scoped single-use verification seals ─────────────────────────
// Every PAT action is gated by `requireVerifiedIdentity` with a strict
// purpose scope (`view` / `pat.create` / `pat.rename` / `pat.delete`). A seal
// minted for one purpose cannot authorize another, and mutating actions
// CONSUME their seal (the cookie is rewritten without it), so a single
// password verification can only ever perform the one operation it was
// obtained for. The `verificationRecordId` is additionally forwarded to Logto
// in the `logto-verification-id` header — Logto's server-side record TTL is
// the authoritative gate.
//
// ── Lock-before-verify ordering ──────────────────────────────────────────
// Mutations acquire the per-user `patLockManager` lock BEFORE checking the
// rate limiter and consuming the verification seal. Consuming a single-use
// seal inside the lock prevents two racing requests from burning the same
// seal on work that would then serialize behind the other's lock.
//
// ── No quota reset on failure ────────────────────────────────────────────
// The creation rate limiter is charged BEFORE the upstream POST and is never
// reset when the POST fails. A failed attempt stays charged: a hostile client
// cannot probe name availability (422s) or hammer an upstream outage without
// also exhausting its own minting quota.
//
// ── Exact-name semantics ─────────────────────────────────────────────────
// ONLY newly-entered names (create's `name`, rename's target `name`) are
// trimmed. `currentName` (rename) and delete's `name` reference tokens
// already stored upstream and are forwarded VERBATIM — including any
// surrounding whitespace — so a token stored as ` deploy ` can be renamed or
// deleted without a silent mismatch.
//
// ── Value never lost ─────────────────────────────────────────────────────
// The create response's token `value` is shown exactly once. If the upstream
// returns the value with malformed metadata, the token shape is SYNTHESIZED
// (name from the request, createdAt from the server clock, expiresAt from the
// request) rather than failing — failing after a successful mint would orphan
// a live credential the user can never see or copy.
//
// Audit logging is best-effort and post-commit: it runs AFTER the upstream
// mutation succeeded and is wrapped so it can never mask a committed success.
// ============================================================================

const PAT_NAME_MAX_LENGTH = 256;

// Name-addressed mutations (create/rename/delete by name) race against each
// other. Serialize per user. Single-instance safe by default; Redis-backed
// when REDIS_URL is set; fail-closed on Redis outage (distributed-state.ts).
const patLockManager = createLockManager('pat-mutations', {
  leaseDurationMs: 30_000,
});

// Minting programmatic credentials is rate-limited per user, mirroring the
// TOTP-secret (mfa.ts) and avatar-upload (avatar.ts) limiters. Redis-backed
// when REDIS_URL is set; in-memory otherwise. Charged before the upstream
// POST and NEVER reset on failure (see module JSDoc).
const patCreationRateLimiter = createRateLimiter({
  name: 'pat-create-cooldown',
  windowMs: 10 * 60_000,
  max: 5,
});

/** Logto Management API PAT endpoints base path for a given userId. */
function patBaseUrl(endpoint: string, userId: string): string {
  return `${endpoint}/api/users/${encodeURIComponent(userId)}/personal-access-tokens`;
}

/**
 * Validates the SHAPE of a client-supplied PAT name against Logto's contract
 * (string, trimmed length 1..256). Shape only — trimming is the caller's
 * decision: newly-entered names are trimmed before use, stored names are
 * forwarded verbatim. The name travels in a JSON body only — it is never
 * interpolated into a URL — so no ID regex is required.
 */
function assertPatNameShape(name: unknown, field = 'name'): asserts name is string {
  if (typeof name !== 'string') {
    throw new ValidationError('INVALID_PAT_NAME', field);
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new ValidationError('INVALID_PAT_NAME', field);
  }
  if (trimmed.length > PAT_NAME_MAX_LENGTH) {
    throw new ValidationError('PAT_NAME_TOO_LONG', field);
  }
}

/**
 * Validates `expiresAt` against Logto's contract: either `null` (never
 * expires) or an integer epoch-milliseconds timestamp strictly in the future.
 * `undefined` is REJECTED — the caller must explicitly opt into a
 * never-expiring token with `null`.
 */
function assertPatExpiry(expiresAt: unknown): asserts expiresAt is number | null {
  if (expiresAt === null) return;
  if (
    typeof expiresAt !== 'number' ||
    !Number.isInteger(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    throw new ValidationError('INVALID_PAT_EXPIRY', 'expiresAt');
  }
}

interface UpstreamPat {
  tenantId?: string;
  userId?: string;
  name?: string;
  value?: string;
  createdAt?: number;
  expiresAt?: number | null;
}

/** Strips the upstream token value so only create responses ever expose it. */
function toPatToken(raw: UpstreamPat): PatToken | null {
  if (
    typeof raw?.name !== 'string' ||
    typeof raw?.createdAt !== 'number' ||
    !Number.isFinite(raw.createdAt) ||
    !Number.isInteger(raw.createdAt) ||
    !(raw.expiresAt === null || (
      typeof raw.expiresAt === 'number' &&
      Number.isFinite(raw.expiresAt) &&
      Number.isInteger(raw.expiresAt)
    ))
  ) {
    return null;
  }
  return {
    name: raw.name,
    createdAt: raw.createdAt,
    expiresAt: raw.expiresAt,
  };
}

/**
 * Shared auth preamble for every PAT action: session introspection (userId
 * derivation) plus the M2M Management API token. Verification-gate checks
 * (`requireVerifiedIdentity`) are performed by each action separately with
 * its own purpose scope.
 */
async function patActionContext(verificationRecordId: string): Promise<{
  userId: string;
  token: string;
  endpoint: string;
}> {
  assertSafeLogtoId(verificationRecordId, 'verificationRecordId');

  const sessionToken = await getTokenForServerAction();
  const introspection = await introspectToken(sessionToken, { assertAudience: true });
  if (!introspection.active || !introspection.sub) {
    throw plainCode('UNAUTHENTICATED');
  }
  const userId = introspection.sub;
  // Defense in depth: reject if the subject has an unexpected shape.
  assertSafeLogtoId(userId, 'userId');

  const token = await getManagementApiToken();
  const endpoint = getCleanEndpoint();
  return { userId, token, endpoint };
}

/**
 * Gets the user's personal access tokens (values masked server-side).
 * @param verificationRecordId - Verification record from a prior identity check.
 */
export async function getPatTokens(
  verificationRecordId: string,
): Promise<DataResult<PatToken[]>> {
  return safeAction(async () => {
    if (!isPatEnabled()) throw plainCode('PAT_DISABLED');

    // Non-consuming, read-only purpose scope: listing does not burn the seal.
    await requireVerifiedIdentity(verificationRecordId, { purpose: 'view' });

    const { userId, token, endpoint } = await patActionContext(verificationRecordId);
    const url = patBaseUrl(endpoint, userId);

    debugLog(`[getPatTokens] Fetching PATs for user ${userId}`);

    const res = await makeManagementFetch(url, {
      method: 'GET',
      token,
      extraHeaders: { 'logto-verification-id': verificationRecordId },
    });
    if (!res.ok) {
      warn(`[getPatTokens] Management API returned ${res.status}`);
      if (res.status === 401 || res.status === 403) throw plainCode('UNAUTHORIZED');
      throw plainCode('PAT_FETCH_FAILED');
    }

    let raw: unknown;
    try {
      raw = await res.json();
    } catch {
      warn('[getPatTokens] Malformed JSON in list response');
      throw plainCode('PAT_FETCH_FAILED');
    }
    if (!Array.isArray(raw)) {
      warn('[getPatTokens] Unexpected non-array response shape');
      throw plainCode('PAT_FETCH_FAILED');
    }

    // Mask token values server-side: Logto's list endpoint returns the stored
    // value for every token, but Logto Console never surfaces it after
    // creation. The client only receives name/createdAt/expiresAt.
    //
    // Fail closed on malformed entries: silently skipping one would hide a
    // token from the list the user manages (rename/delete target) — the user
    // would lose visibility of a live credential.
    const tokens: PatToken[] = [];
    for (const item of raw as UpstreamPat[]) {
      const pat = toPatToken(item);
      if (!pat) {
        warn('[getPatTokens] Malformed PAT entry — failing closed');
        throw plainCode('PAT_FETCH_FAILED');
      }
      tokens.push(pat);
    }

    debugLog(`[getPatTokens] Received ${tokens.length} PAT(s) for user ${userId}`);
    return tokens;
  });
}

/**
 * Creates a personal access token for the authenticated user.
 * @param name - Token name (unique within the user, 1-256 chars; trimmed).
 * @param expiresAt - Epoch ms expiry, or `null` for a token that never expires.
 * @param verificationRecordId - Verification record from a prior identity check.
 * @returns The created token, including its one-time `value` (`pat_...`).
 */
export async function createPatToken(
  name: string,
  expiresAt: number | null,
  verificationRecordId: string,
): Promise<DataResult<{ token: PatToken; value: string }>> {
  return safeAction(async () => {
    if (!isPatEnabled()) throw plainCode('PAT_DISABLED');

    assertPatNameShape(name);
    const trimmedName = name.trim();
    assertPatExpiry(expiresAt);

    const { userId, token, endpoint } = await patActionContext(verificationRecordId);
    const url = patBaseUrl(endpoint, userId);

    // Lock before limiter/verification: the single-use seal is consumed only
    // once the mutation actually holds the per-user lock (see module JSDoc).
    const releaseLock = await patLockManager.acquire(userId);
    let upstreamCommitted = false;
    try {
      // Rate limit: credential minting is throttled per user (5 per 10
      // minutes). Charged up front and NEVER reset on failure — failed
      // attempts stay charged.
      if (!(await patCreationRateLimiter.check(userId))) {
        throw plainCode('RATE_LIMITED');
      }

      // Single-use, purpose-scoped seal: consumed on read, and the record ID
      // is forwarded to Logto (authoritative server-side TTL gate).
      await requireVerifiedIdentity(verificationRecordId, {
        purpose: 'pat.create',
        consume: true,
      });

      debugLog(`[createPatToken] Creating PAT "${trimmedName}" for user ${userId}`);

      const res = await makeManagementFetch(url, {
        method: 'POST',
        token,
        body: { name: trimmedName, expiresAt },
        extraHeaders: { 'logto-verification-id': verificationRecordId },
      });

      if (!res.ok) {
        // Failed attempts stay charged — no limiter reset (see module JSDoc).
        warn(`[createPatToken] Management API returned ${res.status}`);
        if (res.status === 401 || res.status === 403) throw plainCode('UNAUTHORIZED');
        // Logto rejects duplicate names within a user with 422.
        if (res.status === 422) throw plainCode('PAT_NAME_IN_USE');
        throw plainCode('PAT_CREATE_FAILED');
      }
      upstreamCommitted = true;

      let raw: UpstreamPat;
      try {
        raw = (await res.json()) as UpstreamPat;
      } catch {
        warn('[createPatToken] Malformed JSON in create response');
        throw plainCode('PAT_CREATE_FAILED');
      }

      // The value is everything — it is shown exactly once. Missing/empty
      // value means the credential is unrecoverable, so fail loudly. A
      // present value with malformed metadata is salvaged by synthesizing
      // the token shape rather than dropping a live credential.
      if (typeof raw?.value !== 'string' || raw.value.length === 0) {
        warn('[createPatToken] Create response missing token value');
        throw plainCode('PAT_CREATE_FAILED');
      }
      let created = toPatToken(raw);
      if (!created) {
        warn('[createPatToken] Malformed create metadata — synthesizing token shape');
        created = {
          name: trimmedName,
          createdAt: Date.now(),
          expiresAt: expiresAt ?? null,
        };
      }

      // Post-commit, best-effort: the credential is already minted upstream.
      // Audit/log failures must never mask the committed success (the value
      // is one-time — losing it to a logging error would orphan it).
      try {
        auditSafe(userId, 'pat.create', created.name);
        logEvent.info(LOG_EVENTS.PAT_CREATE, 'PAT created', { name: created.name });
      } catch {
        // Intentionally swallowed (best-effort audit contract).
      }

      return { token: created, value: raw.value };
    } finally {
      try {
        await releaseLock();
      } catch {
        // Once Logto accepted the POST, cleanup failure must not hide either
        // the one-time value or the deliberate response-validation result.
        warn('[createPatToken] Lock release failed');
        if (!upstreamCommitted) throw plainCode('PAT_CREATE_FAILED');
      }
    }
  });
}

/**
 * Renames a personal access token.
 * @param currentName - The current name of the token to update (forwarded
 *   verbatim — it must match the exact stored name, whitespace included).
 * @param name - The new token name (unique within the user; trimmed).
 * @param verificationRecordId - Verification record from a prior identity check.
 */
export async function renamePatToken(
  currentName: string,
  name: string,
  verificationRecordId: string,
): Promise<ActionResult> {
  return safeAction(async () => {
    if (!isPatEnabled()) throw plainCode('PAT_DISABLED');

    assertPatNameShape(currentName, 'currentName');
    assertPatNameShape(name);
    const trimmedNewName = name.trim();

    const { userId, token, endpoint } = await patActionContext(verificationRecordId);
    const url = patBaseUrl(endpoint, userId);

    const releaseLock = await patLockManager.acquire(userId);
    let upstreamCommitted = false;
    try {
      await requireVerifiedIdentity(verificationRecordId, {
        purpose: 'pat.rename',
        consume: true,
      });

      debugLog(`[renamePatToken] Renaming PAT "${currentName}" -> "${trimmedNewName}" for user ${userId}`);

      // The PATCH body variant is the canonical endpoint. Logto also keeps a
      // legacy path-based PATCH, but the body variant avoids URL-encoding
      // concerns for arbitrary PAT names. `currentName` is verbatim: the
      // stored name (including any surrounding whitespace) must match exactly.
      const res = await makeManagementFetch(url, {
        method: 'PATCH',
        token,
        body: { currentName, name: trimmedNewName },
        extraHeaders: { 'logto-verification-id': verificationRecordId },
      });

      if (!res.ok) {
        warn(`[renamePatToken] Management API returned ${res.status}`);
        if (res.status === 401 || res.status === 403) throw plainCode('UNAUTHORIZED');
        if (res.status === 422) throw plainCode('PAT_NAME_IN_USE');
        throw plainCode('PAT_RENAME_FAILED');
      }
      upstreamCommitted = true;

      // Post-commit, best-effort — never mask the committed rename.
      try {
        auditSafe(userId, 'pat.rename', currentName);
        logEvent.info(LOG_EVENTS.PAT_RENAME, 'PAT renamed', {
          from: currentName,
          to: trimmedNewName,
        });
      } catch {
        // Intentionally swallowed (best-effort audit contract).
      }
    } finally {
      try {
        await releaseLock();
      } catch {
        warn('[renamePatToken] Lock release failed');
        if (!upstreamCommitted) throw plainCode('PAT_RENAME_FAILED');
      }
    }
  }) as Promise<ActionResult>;
}

/**
 * Deletes a personal access token by name.
 *
 * Uses the POST body variant (`/personal-access-tokens/delete`) — Logto's own
 * source documents it as the preferred endpoint: "Here we use POST method to
 * avoid potential issues with sending body in DELETE requests." This also
 * keeps arbitrary PAT names out of the URL entirely.
 *
 * @param name - The name of the token to delete (forwarded verbatim — it must
 *   match the exact stored name, whitespace included).
 * @param verificationRecordId - Verification record from a prior identity check.
 */
export async function deletePatToken(
  name: string,
  verificationRecordId: string,
): Promise<ActionResult> {
  return safeAction(async () => {
    if (!isPatEnabled()) throw plainCode('PAT_DISABLED');

    assertPatNameShape(name);

    const { userId, token, endpoint } = await patActionContext(verificationRecordId);
    const url = `${patBaseUrl(endpoint, userId)}/delete`;

    const releaseLock = await patLockManager.acquire(userId);
    let upstreamCommitted = false;
    try {
      await requireVerifiedIdentity(verificationRecordId, {
        purpose: 'pat.delete',
        consume: true,
      });

      debugLog(`[deletePatToken] Deleting PAT "${name}" for user ${userId}`);

      // Verbatim name: the stored name (including any surrounding
      // whitespace) must match exactly.
      const res = await makeManagementFetch(url, {
        method: 'POST',
        token,
        body: { name },
        extraHeaders: { 'logto-verification-id': verificationRecordId },
      });

      if (!res.ok) {
        warn(`[deletePatToken] Management API returned ${res.status}`);
        if (res.status === 401 || res.status === 403) throw plainCode('UNAUTHORIZED');
        throw plainCode('PAT_DELETE_FAILED');
      }
      upstreamCommitted = true;

      // Post-commit, best-effort — never mask the committed deletion.
      try {
        auditSafe(userId, 'pat.delete', name);
        logEvent.info(LOG_EVENTS.PAT_DELETE, 'PAT deleted', { name });
      } catch {
        // Intentionally swallowed (best-effort audit contract).
      }
    } finally {
      try {
        await releaseLock();
      } catch {
        warn('[deletePatToken] Lock release failed');
        if (!upstreamCommitted) throw plainCode('PAT_DELETE_FAILED');
      }
    }
  }) as Promise<ActionResult>;
}
