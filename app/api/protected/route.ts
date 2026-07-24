import { NextRequest, NextResponse } from 'next/server';
import { getAction } from '../../logto-kit/action-registry';
import { validateActionConfig } from '../../logto-kit/action-registry/validate-action-config';
import { introspectToken, getCleanEndpoint } from '../../logto-kit/logic/utils';
import { assertSafeLogtoId } from '../../logto-kit/logic/guards';
import { checkSameOrigin } from '../../logto-kit/logic/origin-guard';
import { getTokenForServerAction } from '../../logto-kit/logic/actions/tokens';
import { getManagementApiToken, getLogtoConfig } from '../../logto-kit/config';
import { verifyPersonalAccess, verifyOrgAccess } from '../../logto-kit/logic/actions';
import { createRateLimiter } from '../../lib/distributed-state';
import { makeManagementFetch } from '../../logto-kit/logic/actions/management-request';
import { logEvent } from '../../logto-kit/logic/log';
import { LOG_EVENTS, type LogEvent } from '../../lib/log-events';
import { resolveClientCode } from '../../logto-kit/logic/verbosity';
import type { ErrorCode, ErrorCategory } from '../../logto-kit/logic/error-codes';
import { ERROR_CODES } from '../../logto-kit/logic/error-codes';
import { withLogger } from '../../lib/with-logger';

// ── Per-user rate limiting ────────────────────────────────────────────────────
// Protects Logto API quotas from exhaustion by a single user.
// Uses centralized distributed-state module (Redis-backed when REDIS_URL is set,
// in-memory otherwise). See app/lib/distributed-state.ts.
const protectedRouteRateLimiter = createRateLimiter({
  name: 'protected-route',
  windowMs: 60_000,
  max: 60,
});

async function fetchUserAsOrg(userId: string): Promise<string | null> {
  try {
    const mgmtToken = await getManagementApiToken();
    const endpoint = getCleanEndpoint();
    // NOTE: Logto Management API GET /api/users/{id} does not support ?fields=
    // parameter. The full user object is always returned. The parameter is removed.
    const url = `${endpoint}/api/users/${encodeURIComponent(userId)}`;

    logEvent.debug(LOG_EVENTS.API_PROTECTED_ACTION, 'Fetching user details from Management API', { userId });
    const res = await makeManagementFetch(url, { method: 'GET', token: mgmtToken });

    if (!res.ok) {
      logEvent.warn(LOG_EVENTS.API_ERROR, 'fetchUserAsOrg failed', { userId, status: res.status });
      return null;
    }

    const user = (await res.json()) as {
      customData?: { Preferences?: { asOrg?: string } };
    };

    return user.customData?.Preferences?.asOrg ?? null;
  } catch (error) {
    logEvent.warn(LOG_EVENTS.API_ERROR, 'fetchUserAsOrg error', { userId });
    void error;
    return null;
  }
}

/**
 * Maps an error code's category to the LOG_EVENTS event used for the denial log.
 * See plan §3.5 `pickEventForCode` mapping table.
 */
function pickEventForCode(code: ErrorCode): LogEvent {
  const entry = ERROR_CODES[code];
  const category: ErrorCategory = entry.category;
  switch (category) {
    case 'auth':
      return LOG_EVENTS.AUTH_TOKEN_ERROR;
    case 'rbac':
      return LOG_EVENTS.RBAC_PERMISSION_DENIED;
    case 'validation':
      return LOG_EVENTS.API_PROTECTED_ACTION;
    case 'server':
      return LOG_EVENTS.API_ERROR;
    case 'rate-limit':
      return LOG_EVENTS.API_THROTTLED;
    case 'upload':
      return LOG_EVENTS.API_ERROR;
    case 'oauth':
      return LOG_EVENTS.AUTH_TOKEN_ERROR;
    default:
      return LOG_EVENTS.API_ERROR;
  }
}

/**
 * Logs the precise code via `logEvent` (server-side, with requestId) and
 * returns a NextResponse with the verbosity-resolved code in the `error` field.
 * The server ALWAYS logs the precise code; the client sees the resolved code.
 */
function apiError(code: ErrorCode, status: number, context: Record<string, unknown> = {}): NextResponse {
  const event = pickEventForCode(code);
  const level: 'warn' | 'error' = status >= 500 ? 'error' : 'warn';
  logEvent[level](event, `Protected API denied: ${code}`, { code, status, ...context });
  return NextResponse.json(
    { error: resolveClientCode(code, code), data: null },
    { status },
  );
}

interface ProtectedRequestBody {
  action: string;
  payload?: unknown;
}

// Maximum request body size (1 MiB). Enforced by reading the actual stream
// bytes (BUG-011) rather than trusting the Content-Length header, which is
// trivially spoofable and absent for chunked transfers.
const MAX_BODY_BYTES = 1_048_576;

/**
 * Reads and JSON-parses the request body, enforcing a real byte cap on the
 * streamed content (BUG-011). Replaces the previous header-only Content-Length
 * check, which was bypassable via chunked requests without a Content-Length
 * header.
 *
 * Throws an Error with message 'PAYLOAD_TOO_LARGE' when the body exceeds
 * `maxBytes`; the caller maps this to a 413 response.
 */
async function readBodyWithByteCap(request: NextRequest, maxBytes: number): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) {
    // No stream available (e.g. edge runtime quirk) — fall back to request.json().
    // Auth has already succeeded at this point, so the DoS surface is bounded.
    return request.json();
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error('PAYLOAD_TOO_LARGE');
      }
      chunks.push(value);
    }
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const text = new TextDecoder().decode(merged);
  return JSON.parse(text);
}

export const POST = withLogger(async (request: NextRequest) => {
  // Block cross-origin requests (CSRF protection).
  const originError = checkSameOrigin(request);
  if (originError) return originError;

  try {
    // ── Step 0: verify session token (BEFORE body parse) ───────────────────
    // BUG-011: Authenticate before buffering the request body. The session
    // token comes from the SDK cookie (not the request body), so auth CAN run
    // before body parse. This prevents unauthenticated same-origin requests
    // from consuming memory and bypassing the rate limiter (which is keyed on
    // introspection.sub and therefore only runs after successful auth).
    let token: string;
    try {
      token = await getTokenForServerAction();
    } catch (error) {
      logEvent.warn(LOG_EVENTS.AUTH_TOKEN_ERROR, 'Session token error', { code: 'UNAUTHORIZED' });
      void error;
      return apiError('UNAUTHORIZED', 401);
    }

    let introspection;
    try {
      logEvent.debug(LOG_EVENTS.API_PROTECTED_ACTION, 'Introspecting token');
      introspection = await introspectToken(token);
    } catch (error) {
      logEvent.warn(LOG_EVENTS.AUTH_TOKEN_ERROR, 'Introspection error', { code: 'INTROSPECTION_ERROR' });
      void error;
      return apiError('INTROSPECTION_ERROR', 401);
    }

    if (!introspection.active) {
      logEvent.debug(LOG_EVENTS.API_PROTECTED_ACTION, 'Token not active');
      return apiError('TOKEN_INVALID', 401);
    }

    const id = introspection.sub;
    if (!id) {
      return apiError('TOKEN_INVALID', 401);
    }

    // BUG-009: Verify token audience matches this application's client_id.
    // Fail-closed: reject tokens without client_id (BUG-H02).
    const logtoConfig = getLogtoConfig();
    if (!introspection.client_id || introspection.client_id !== logtoConfig.appId) {
      return apiError('TOKEN_INVALID', 401);
    }

    const expectedPrincipal = introspection.sid
      ? { sub: id, sid: introspection.sid }
      : { sub: id };

    try {
      assertSafeLogtoId(id, 'userId');
    } catch {
      return apiError('TOKEN_INVALID', 400);
    }

    // ── Per-user rate limit (BEFORE body parse, keyed on introspection.sub) ──
    if (!(await protectedRouteRateLimiter.check(id))) {
      logEvent.warn(LOG_EVENTS.API_THROTTLED, 'Rate limit exceeded', { userId: id, code: 'RATE_LIMITED' });
      // RFC 7231: 429 SHOULD include Retry-After. We use a fixed window of 60s.
      return NextResponse.json(
        { error: resolveClientCode('RATE_LIMITED', 'RATE_LIMITED'), data: null },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // ── Parse body with a real byte cap ──────────────────────────────────────
    // BUG-011: Replaces the previous header-only Content-Length check, which
    // was bypassable (chunked requests without Content-Length were allowed
    // through). This reads the actual body bytes from the stream and rejects
    // anything exceeding 1 MiB. Runs AFTER auth + rate limit so unauthenticated
    // requests never buffer a body.
    let body: ProtectedRequestBody;
    try {
      body = (await readBodyWithByteCap(request, MAX_BODY_BYTES)) as ProtectedRequestBody;
    } catch (err) {
      if (err instanceof Error && err.message === 'PAYLOAD_TOO_LARGE') {
        return apiError('PAYLOAD_TOO_LARGE', 413);
      }
      logEvent.warn(LOG_EVENTS.API_PROTECTED_ACTION, 'Body parse error', { code: 'MISSING_FIELDS' });
      return apiError('MISSING_FIELDS', 400);
    }

    // BUG-106: Reject null or non-object bodies (e.g. JSON `null`) instead
    // of letting the destructuring below throw an unhandled TypeError 500.
    if (!body || typeof body !== 'object') {
      logEvent.warn(LOG_EVENTS.API_PROTECTED_ACTION, 'Body is null or not an object', { code: 'MISSING_FIELDS' });
      return apiError('MISSING_FIELDS', 400);
    }

    const { action, payload } = body;

    if (!action) {
      return apiError('MISSING_FIELDS', 400);
    }

    // BUG-008: Validate action name format and length.
    if (typeof action !== 'string' || action.length === 0 || action.length > 128) {
      return apiError('MISSING_FIELDS', 400);
    }

    // ── Resolve action ────────────────────────────────────────────────────────
    const actionConfig = await getAction(action);

    if (!actionConfig) {
      return apiError('ACTION_NOT_FOUND', 404);
    }

    // ── Validate action configuration ─────────────────────────────────────────
    // Every protected action MUST define all three check categories.
    try {
      validateActionConfig(actionConfig, action);
    } catch (validationError) {
      logEvent.error(LOG_EVENTS.CONFIG_ERROR, `IMPROPER_SETUP_ERROR for action "${action}"`, {
        action,
        code: 'IMPROPER_SETUP_ERROR',
        detail: validationError instanceof Error ? validationError.message : String(validationError),
      });
      return apiError('IMPROPER_SETUP_ERROR', 500, { action });
    }

    // ── Step 1: RBAC verification ─────────────────────────────────────────────
    // Branch: "self" bypass checks personal roles.
    // Otherwise, check custom data asOrg first, then load org roles/permissions and verify both.
    if (actionConfig.requiredOrgId === 'self') {
      const personalAccessResult = await verifyPersonalAccess(expectedPrincipal);
      if (!personalAccessResult.ok) {
        logEvent.warn(LOG_EVENTS.RBAC_PERMISSION_DENIED, 'Personal access verification failed', {
          code: 'UNAUTHORIZED',
          error: personalAccessResult.error,
        });
        return apiError('UNAUTHORIZED', 401);
      }
      const roles = personalAccessResult.data.roles;
      const permissions = personalAccessResult.data.permissions;

      // ── Step 2: Role check ────────────────────────────────────────────────────
      const requiredRoles = Array.isArray(actionConfig.requiredRoleId)
        ? actionConfig.requiredRoleId
        : [actionConfig.requiredRoleId];

      const hasRequiredRole = requiredRoles.every(reqId => roles.some(r => r.id === reqId));
      if (!hasRequiredRole) {
        return apiError('ROLE_DENIED', 403, {
          userId: id,
          action,
          required: requiredRoles,
          has: roles.map(r => r.id),
        });
      }

      // ── Step 3: Permission check ──────────────────────────────────────────────
      const requiredPerms = Array.isArray(actionConfig.requiredPermId)
        ? actionConfig.requiredPermId
        : [actionConfig.requiredPermId];

      const hasPermission = requiredPerms.every(perm => permissions.includes(perm));

      if (!hasPermission) {
        return apiError('PERMISSION_DENIED', 403, {
          userId: id,
          action,
          required: requiredPerms,
          has: permissions,
        });
      }
    } else {
      const orgId = actionConfig.requiredOrgId;
      const asOrg = await fetchUserAsOrg(id);

      if (asOrg !== orgId) {
        return apiError('ORG_NOT_MEMBER', 403, {
          userId: id,
          action,
          asOrg,
          required: orgId,
        });
      }

      const result = await verifyOrgAccess(orgId, expectedPrincipal);
      if (!result.ok) {
        logEvent.warn(LOG_EVENTS.RBAC_ORG_VALIDATION, 'Org access failed', {
          code: result.error,
          action,
        });
        if (result.error === 'UNAUTHORIZED') {
          return apiError('UNAUTHORIZED', 401);
        }
        return apiError('ORG_NOT_MEMBER', 403, { userId: id, action });
      }
      const roles = result.data.roles;
      const permissions = result.data.permissions;

      // ── Step 2: Role check ────────────────────────────────────────────────────
      const requiredRoles = Array.isArray(actionConfig.requiredRoleId)
        ? actionConfig.requiredRoleId
        : [actionConfig.requiredRoleId];

      const hasRequiredRole = requiredRoles.every(reqId => roles.some(r => r.id === reqId));
      if (!hasRequiredRole) {
        return apiError('ROLE_DENIED', 403, {
          userId: id,
          action,
          required: requiredRoles,
          has: roles.map(r => r.id),
        });
      }

      // ── Step 3: Permission check ──────────────────────────────────────────────
      const requiredPerms = Array.isArray(actionConfig.requiredPermId)
        ? actionConfig.requiredPermId
        : [actionConfig.requiredPermId];

      const hasPermission = requiredPerms.every(perm => permissions.includes(perm));

      if (!hasPermission) {
        return apiError('PERMISSION_DENIED', 403, {
          userId: id,
          action,
          required: requiredPerms,
          has: permissions,
        });
      }
    }

    // ── Invoke handler ────────────────────────────────────────────────────────
    try {
      const result = await actionConfig.handler({
        userId: id,
        orgId: actionConfig.requiredOrgId === 'self' ? null : actionConfig.requiredOrgId,
        payload: payload ?? {},
      });

      return NextResponse.json({ error: null, data: result });
    } catch (handlerError) {
      const msg = handlerError instanceof Error ? handlerError.message : 'Invalid input';
      if (msg.includes('INVALID_PAYLOAD')) {
        return apiError('INVALID_PAYLOAD', 400);
      }
      return apiError('INTERNAL_ERROR', 500);
    }
  } catch (error) {
    logEvent.error(LOG_EVENTS.API_ERROR, 'Unexpected error', {
      code: 'INTERNAL_ERROR',
      error: error instanceof Error ? error.message : String(error),
    });
    return apiError('INTERNAL_ERROR', 500);
  }
});
