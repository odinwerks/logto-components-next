import { NextRequest, NextResponse } from 'next/server';
import { getAction } from '../action-registry';
import { validateActionConfig } from '../action-registry/validate-action-config';
import { getCleanEndpoint } from './utils';
import { getManagementApiToken } from '../config';
import { verifyPersonalAccess, verifyOrgAccess } from './actions';
import { createRateLimiter } from '../../lib/distributed-state';
import { makeManagementFetch } from './actions/management-request';
import { logEvent } from './log';
import { LOG_EVENTS, type LogEvent } from '../../lib/log-events';
import { resolveClientCode } from './verbosity';
import type { ErrorCode, ErrorCategory } from './error-codes';
import { ERROR_CODES } from './error-codes';
import type { ProtectedAuthContext } from './types';

// Protects Logto API quotas from exhaustion by a single authenticated user.
// This limiter is shared by the cookie and bearer endpoints so moving a caller
// between transports cannot create a second per-user budget.
const protectedRouteRateLimiter = createRateLimiter({
  name: 'protected-route',
  windowMs: 60_000,
  max: 60,
});

const MAX_BODY_BYTES = 1_048_576;

interface ProtectedRequestBody {
  action: string;
  payload?: unknown;
}

async function fetchUserAsOrg(userId: string): Promise<string | null> {
  try {
    const mgmtToken = await getManagementApiToken();
    const endpoint = getCleanEndpoint();
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

/** Logs a precise server code and returns the existing sanitized API shape. */
export function protectedApiError(
  code: ErrorCode,
  status: number,
  context: Record<string, unknown> = {},
): NextResponse {
  const event = pickEventForCode(code);
  const level: 'warn' | 'error' = status >= 500 ? 'error' : 'warn';
  logEvent[level](event, `Protected API denied: ${code}`, { code, status, ...context });
  return NextResponse.json(
    { error: resolveClientCode(code, code), data: null },
    { status },
  );
}

/** Reads the stream and enforces the actual byte limit before parsing JSON. */
export async function readProtectedBodyWithByteCap(
  request: NextRequest,
  maxBytes = MAX_BODY_BYTES,
): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) {
    // arrayBuffer() is still checked after reading, unlike trusting
    // Content-Length. This path is only for runtimes without a stream reader.
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error('PAYLOAD_TOO_LARGE');
    return JSON.parse(new TextDecoder().decode(bytes));
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
  return JSON.parse(new TextDecoder().decode(merged));
}

function requiredValues(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

function hasAllRequiredScopes(context: ProtectedAuthContext, required: string[]): boolean {
  const scopes = new Set(context.scopes);
  return required.every(permission => scopes.has(permission));
}

/**
 * Runs the common protected action pipeline after the route-specific auth
 * boundary has established a server-derived context.
 */
export async function runProtectedAction(
  request: NextRequest,
  authContext: ProtectedAuthContext,
): Promise<NextResponse> {
  const { userId } = authContext;
  const expectedPrincipal = authContext.sid
    ? { sub: userId, sid: authContext.sid }
    : { sub: userId };

  try {
    // Authenticate and rate-limit before buffering any request body.
    if (!(await protectedRouteRateLimiter.check(userId))) {
      logEvent.warn(LOG_EVENTS.API_THROTTLED, 'Rate limit exceeded', { userId, code: 'RATE_LIMITED' });
      return NextResponse.json(
        { error: resolveClientCode('RATE_LIMITED', 'RATE_LIMITED'), data: null },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }

    let body: ProtectedRequestBody;
    try {
      body = (await readProtectedBodyWithByteCap(request)) as ProtectedRequestBody;
    } catch (error) {
      if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
        return protectedApiError('PAYLOAD_TOO_LARGE', 413);
      }
      logEvent.warn(LOG_EVENTS.API_PROTECTED_ACTION, 'Body parse error', { code: 'MISSING_FIELDS' });
      return protectedApiError('MISSING_FIELDS', 400);
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      logEvent.warn(LOG_EVENTS.API_PROTECTED_ACTION, 'Body is null or not an object', { code: 'MISSING_FIELDS' });
      return protectedApiError('MISSING_FIELDS', 400);
    }

    const { action, payload } = body;
    if (!action || typeof action !== 'string' || action.length === 0 || action.length > 128) {
      return protectedApiError('MISSING_FIELDS', 400);
    }

    const actionConfig = await getAction(action);
    if (!actionConfig) return protectedApiError('ACTION_NOT_FOUND', 404);

    try {
      validateActionConfig(actionConfig, action);
    } catch (validationError) {
      logEvent.error(LOG_EVENTS.CONFIG_ERROR, `IMPROPER_SETUP_ERROR for action "${action}"`, {
        action,
        code: 'IMPROPER_SETUP_ERROR',
        detail: validationError instanceof Error ? validationError.message : String(validationError),
      });
      return protectedApiError('IMPROPER_SETUP_ERROR', 500, { action });
    }

    const requiredRoles = requiredValues(actionConfig.requiredRoleId);
    const requiredPerms = requiredValues(actionConfig.requiredPermId);

    if (authContext.source === 'bearer' && !hasAllRequiredScopes(authContext, requiredPerms)) {
      return protectedApiError('PERMISSION_DENIED', 403, {
        userId,
        action,
        required: requiredPerms,
      });
    }

    let roles: Array<{ id: string; name: string }>;
    let permissions: string[];

    if (actionConfig.requiredOrgId === 'self') {
      const personalAccessResult = authContext.source === 'bearer'
        ? await verifyPersonalAccess(undefined, authContext)
        : await verifyPersonalAccess(expectedPrincipal);
      if (!personalAccessResult.ok) {
        logEvent.warn(LOG_EVENTS.RBAC_PERMISSION_DENIED, 'Personal access verification failed', {
          code: 'UNAUTHORIZED',
          error: personalAccessResult.error,
        });
        return protectedApiError('UNAUTHORIZED', 401);
      }
      roles = personalAccessResult.data.roles;
      permissions = personalAccessResult.data.permissions;
    } else {
      const orgId = actionConfig.requiredOrgId;
      if (authContext.source === 'bearer') {
        // Bearer organization context comes only from the verified token. The
        // browser's customData.Preferences.asOrg is intentionally ignored.
        if (!authContext.organizationId || authContext.organizationId !== orgId) {
          return protectedApiError('ORG_NOT_MEMBER', 403, { userId, action, required: orgId });
        }
      } else {
        const asOrg = await fetchUserAsOrg(userId);
        if (asOrg !== orgId) {
          return protectedApiError('ORG_NOT_MEMBER', 403, {
            userId,
            action,
            asOrg,
            required: orgId,
          });
        }
      }

      const result = authContext.source === 'bearer'
        ? await verifyOrgAccess(orgId, undefined, authContext)
        : await verifyOrgAccess(orgId, expectedPrincipal);
      if (!result.ok) {
        logEvent.warn(LOG_EVENTS.RBAC_ORG_VALIDATION, 'Org access failed', {
          code: result.error,
          action,
        });
        if (result.error === 'UNAUTHORIZED') return protectedApiError('UNAUTHORIZED', 401);
        return protectedApiError('ORG_NOT_MEMBER', 403, { userId, action });
      }
      roles = result.data.roles;
      permissions = result.data.permissions;
    }

    if (!requiredRoles.every(required => roles.some(role => role.id === required))) {
      return protectedApiError('ROLE_DENIED', 403, {
        userId,
        action,
        required: requiredRoles,
        has: roles.map(role => role.id),
      });
    }

    if (!requiredPerms.every(permission => permissions.includes(permission))) {
      return protectedApiError('PERMISSION_DENIED', 403, {
        userId,
        action,
        required: requiredPerms,
        has: permissions,
      });
    }

    try {
      const result = await actionConfig.handler({
        userId,
        orgId: actionConfig.requiredOrgId === 'self' ? null : actionConfig.requiredOrgId,
        payload: payload ?? {},
      });
      return NextResponse.json({ error: null, data: result });
    } catch (handlerError) {
      const message = handlerError instanceof Error ? handlerError.message : 'Invalid input';
      if (message.includes('INVALID_PAYLOAD')) return protectedApiError('INVALID_PAYLOAD', 400);
      return protectedApiError('INTERNAL_ERROR', 500);
    }
  } catch (error) {
    logEvent.error(LOG_EVENTS.API_ERROR, 'Unexpected error', {
      code: 'INTERNAL_ERROR',
      error: error instanceof Error ? error.message : String(error),
    });
    return protectedApiError('INTERNAL_ERROR', 500);
  }
}

export const PROTECTED_ACTION_MAX_BODY_BYTES = MAX_BODY_BYTES;
