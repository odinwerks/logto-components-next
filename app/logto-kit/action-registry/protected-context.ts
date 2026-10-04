import 'server-only';

import type { ProtectedContextMode } from '../logic/types';

/**
 * Credential-free contract for the protected action executor.
 *
 * The context describes an ALREADY-authenticated principal. It contains no
 * token, PAT, access token, refresh token, cookie, headers, claims blob,
 * client-selected organization, role, or permission. Token retrieval and
 * session introspection are performed by request adapters (the protected
 * route's session chain / the SSR session provider) BEFORE this contract is
 * constructed — the executor never sees credentials.
 *
 * `ProtectedContextMode` is declared in `app/logto-kit/logic/types.ts` (a
 * client-safe module, because types.ts is imported by client components) and
 * re-exported here so this server-only module stays the canonical import for
 * executor consumers.
 */
export type { ProtectedContextMode } from '../logic/types';

/** A server-derived principal: identity subject + context mode. */
export type ProtectedPrincipal = Readonly<{
  sub: string;
  mode: ProtectedContextMode;
}>;

/**
 * Credential-free executor input.
 *
 * `requestId` is optional tracer metadata for server-side correlation; it is
 * never echoed into results, DTOs, or logs that cross the client boundary.
 */
export type ProtectedActionContext = Readonly<{
  principal: ProtectedPrincipal;
  requestId?: string;
}>;

/**
 * Provider that yields an already-authenticated context.
 *
 * SSR loaders accept this as an injectable dependency so external callers
 * (tests, future external SSR) can supply an `external` context without the
 * facade baking a session-only `getTokenForServerAction` path. The default
 * provider is `getSessionCatalogContext` (session mode). No credential parsing
 * or PAT exchange is implemented here — the provider is the injection point.
 */
export type ProtectedContextProvider = () => Promise<ProtectedActionContext>;

/**
 * Discriminated result of `executeProtectedAction`.
 *
 * Error results carry ONLY a fixed sanitized code and an HTTP-style status.
 * They never contain context, credentials, upstream messages, raw DB rows, or
 * audit internals.
 *
 * Status mapping (pinned in execute.test.ts):
 * - ACTION_NOT_FOUND     → 404
 * - IMPROPER_SETUP_ERROR → 500
 * - UNAUTHORIZED         → 401
 * - ORG_NOT_MEMBER       → 403
 * - ROLE_DENIED          → 403
 * - PERMISSION_DENIED    → 403
 * - INVALID_PAYLOAD      → 400
 * - NOT_FOUND            → 404
 * - RATE_LIMITED         → 429 (rate/admission failure)
 * - SERVICE_UNAVAILABLE  → 503 (shared-state failure)
 * - INTERNAL_ERROR       → 500
 */
export type ProtectedActionResult =
  | { ok: true; data: unknown }
  | {
      ok: false;
      error:
        | 'ACTION_NOT_FOUND'
        | 'IMPROPER_SETUP_ERROR'
        | 'UNAUTHORIZED'
        | 'ORG_NOT_MEMBER'
        | 'ROLE_DENIED'
        | 'PERMISSION_DENIED'
        | 'INVALID_PAYLOAD'
        | 'NOT_FOUND'
        | 'RATE_LIMITED'
        | 'SERVICE_UNAVAILABLE'
        | 'INTERNAL_ERROR';
      status: 400 | 401 | 403 | 404 | 429 | 500 | 503;
    };
