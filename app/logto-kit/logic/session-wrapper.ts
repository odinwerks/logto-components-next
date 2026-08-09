import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { unwrapSession, type SessionData, type SessionWrapper } from '@logto/node';
import { sessionStore } from '../../lib/distributed-state';
import { warn } from './log';

/**
 * logto-kit/logic/session-wrapper.ts
 *
 * External session storage for the Logto SDK (SessionWrapper contract).
 *
 * WHY THIS EXISTS — the root cause of the "network error, never recovers"
 * crash:
 *
 * The default Logto session storage encrypts ALL session data (idToken,
 * refreshToken, accessTokenMap) into a single browser cookie. React Server
 * Components cannot write cookies (Next.js limitation), so when a token
 * refresh happens inside an RSC (the root layout's `getLogtoContext`), the
 * refreshed tokens are computed in memory and silently DISCARDED —
 * `setCookie` is a no-op there. Logto's own docs call this out and recommend
 * external session storage as the fix.
 *
 * With this wrapper, the cookie holds only an opaque session ID and the actual
 * session data lives in Redis (or the in-memory backend when REDIS_URL is
 * unset — single-process workaround). Both the middleware/proxy AND RSC
 * contexts can now persist refreshed tokens, because writes go to external
 * storage instead of the cookie.
 *
 * CONTRACT NOTES:
 * - createLogtoSessionWrapper() MUST be called once per request (per
 *   getLogtoConfig() call). The returned instance carries the session ID it
 *   read in unwrap() so that wrap() reuses it. Sharing one instance across
 *   requests would leak session IDs across users.
 * - Session ID stability is REQUIRED: RSC contexts cannot write the cookie,
 *   so wrap() must return the SAME session ID that unwrap() read. Generating
 *   a fresh ID per wrap would orphan the Redis data (the cookie would still
 *   point at the old ID).
 * - Legacy migration: cookies written before this change hold the encrypted
 *   `ciphertext.iv` blob. unwrap() detects that format (contains '.'),
 *   decrypts it with the legacy `unwrapSession`, and derives a DETERMINISTIC
 *   session ID (sha256 of the blob) so repeated migratory reads hit the same
 *   Redis key. The first wrap() in a cookie-writable context then rewrites
 *   the cookie with the plain session ID, completing migration.
 */

/** Matches the SDK's CookieStorage cookie maxAge (14 * 24 * 3600). */
export const LOGTO_SESSION_TTL_SECONDS = 14 * 24 * 3600;

// New-format session IDs: dashed UUIDs (fresh sessions) OR 64-char sha256 hex
// (legacy-migrated sessions, derived from the encrypted cookie blob). Both are
// valid cookie values; anything else falls through to legacy/garbage handling.
const SESSION_ID_REGEX =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{64})$/i;

/** Derives a stable session ID for a legacy encrypted cookie blob. */
function legacySessionId(cookieValue: string): string {
  return createHash('sha256').update(cookieValue).digest('hex');
}

function parseSessionJson(raw: string | null): SessionData {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === 'object' ? (parsed as SessionData) : {};
  } catch {
    return {};
  }
}

/** A session is considered destroyed when every value is null/empty. */
function hasSessionData(data: SessionData): boolean {
  return Object.values(data).some((value) => value != null && value !== '');
}

export function createLogtoSessionWrapper(): SessionWrapper {
  // Per-request instance state: the session ID this request is operating on.
  // Set by unwrap() (from the incoming cookie) and reused by wrap().
  let sessionId: string | null = null;

  return {
    async wrap(data: SessionData, _key: string): Promise<string> {
      const id = sessionId ?? randomUUID();
      sessionId = id;

      if (hasSessionData(data)) {
        await sessionStore.set(id, JSON.stringify(data), LOGTO_SESSION_TTL_SECONDS);
      } else {
        // Destroyed session (sign-out) — remove the server-side data. The
        // cookie value returned below is irrelevant: the caller clears it.
        await sessionStore.clear(id);
      }

      return id;
    },

    async unwrap(value: string, key: string): Promise<SessionData> {
      if (!value) return {};

      // New format: the cookie value IS the session ID.
      if (SESSION_ID_REGEX.test(value)) {
        sessionId = value;
        return parseSessionJson(await sessionStore.get(value));
      }

      // Legacy format: encrypted `ciphertext.iv` blob (pre-external-storage).
      // Pin a deterministic session ID so every migratory request maps to the
      // same Redis key.
      if (value.includes('.')) {
        sessionId = legacySessionId(value);

        // Redis-first: a previous request may have already migrated this
        // session (e.g. a refresh wrapped in an RSC context where the cookie
        // could not be rewritten). Fresh Redis data is authoritative over the
        // stale legacy blob, which may contain a rotated-out refresh token.
        const stored = parseSessionJson(await sessionStore.get(sessionId));
        if (hasSessionData(stored)) {
          return stored;
        }

        try {
          const legacy = await unwrapSession(value, key);
          // Populate the store eagerly so the very first migratory read
          // completes the server-side migration: from here on, Redis is the
          // source of truth even if the cookie is never rewritten (the RSC
          // no-cookie-write path cannot strand refreshed tokens).
          if (hasSessionData(legacy)) {
            await sessionStore.set(sessionId, JSON.stringify(legacy), LOGTO_SESSION_TTL_SECONDS);
          }
          return legacy;
        } catch (err) {
          warn(
            '[SessionWrapper] Legacy session decryption failed; treating as signed out:',
            err instanceof Error ? err.message : err,
          );
          return {};
        }
      }

      // Unrecognized cookie value — treat as no session.
      return {};
    },
  };
}

/**
 * Deletes the server-side session data for a raw `logto_<appId>` cookie value,
 * regardless of format (UUID, legacy-migrated sha256 ID, or legacy blob).
 *
 * Used by `app/api/wipe/route.ts`: clearing the cookie alone no longer
 * destroys the session, because the data now lives server-side. Without this,
 * a non-force wipe would orphan a live refresh token in the store for up to
 * the session TTL.
 */
export async function deleteSessionByCookieValue(value: string | undefined): Promise<void> {
  if (!value) return;
  if (SESSION_ID_REGEX.test(value)) {
    await sessionStore.clear(value);
    return;
  }
  if (value.includes('.')) {
    await sessionStore.clear(legacySessionId(value));
  }
}
