import { NextRequest, NextResponse } from 'next/server';
import { getAction } from '../action-registry';
import { executeProtectedAction } from '../action-registry/execute';
import { getCleanEndpoint } from './utils';
import { getManagementApiToken } from '../config';
import { createRateLimiter } from '../../lib/distributed-state';
import { makeManagementFetch } from './actions/management-request';
import { logEvent } from './log';
import { LOG_EVENTS, type LogEvent } from '../../lib/log-events';
import { resolveClientCode } from './verbosity';
import type { ErrorCode, ErrorCategory } from './error-codes';
import { ERROR_CODES } from './error-codes';
import type { ProtectedTransportContext } from './types';

// This limiter shares a per-user budget across the session and bearer routes.
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

/**
 * Adapts an authenticated route context to the credential-free executor.
 * Authentication stays route-specific, while authorization and execution
 * stay inside executeProtectedAction.
 */
export async function runProtectedAction(
  request: NextRequest,
  authContext: ProtectedTransportContext,
): Promise<NextResponse> {
  const { userId } = authContext;

  try {
    // Do not buffer attacker-controlled bodies until the shared user budget passes.
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
    if (actionConfig.executorHandled !== true) {
      logEvent.error(LOG_EVENTS.CONFIG_ERROR, `Action "${action}" is not enabled for the protected executor`, {
        action,
        code: 'IMPROPER_SETUP_ERROR',
      });
      return protectedApiError('IMPROPER_SETUP_ERROR', 500, { action });
    }

    if (authContext.source === 'session' && actionConfig.requiredOrgId !== 'self') {
      const asOrg = await fetchUserAsOrg(userId);
      if (asOrg !== actionConfig.requiredOrgId) {
        return protectedApiError('ORG_NOT_MEMBER', 403, {
          userId,
          action,
          asOrg,
          required: actionConfig.requiredOrgId,
        });
      }
    }

    const mode = authContext.source === 'session' ? 'session' : 'external';
    const result = await executeProtectedAction({
      action,
      payload: payload ?? {},
      context: { principal: { sub: userId, mode } },
    });

    if (result.ok) {
      return NextResponse.json({ error: null, data: result.data });
    }

    const response = protectedApiError(result.error, result.status, { userId, action });
    if (result.status === 429) response.headers.set('Retry-After', '60');
    return response;
  } catch (error) {
    logEvent.error(LOG_EVENTS.API_ERROR, 'Unexpected error', {
      code: 'INTERNAL_ERROR',
      error: error instanceof Error ? error.message : String(error),
    });
    return protectedApiError('INTERNAL_ERROR', 500);
  }
}

export const PROTECTED_ACTION_MAX_BODY_BYTES = MAX_BODY_BYTES;
