import 'server-only';

import type { ActionConfig } from '../logic/types';
import type {
  ProtectedActionContext,
  ProtectedActionResult,
  ProtectedContextMode,
} from './protected-context';
import { getAction } from './index';
import { validateActionConfig } from './validate-action-config';
import { assertSafeLogtoId } from '../logic/guards';
import { fetchOrgRolePermissions } from '../logic/actions/rbac-core';
import { ValidationError } from '../logic/validation';

/** Maximum length of an action name (mirrors the protected route contract). */
const MAX_ACTION_NAME_LENGTH = 128;

const ALLOWED_MODES: readonly ProtectedContextMode[] = ['session', 'external'];

type ProtectedActionError = Extract<ProtectedActionResult, { ok: false }>['error'];

function failure(
  error: ProtectedActionError,
  status: 400 | 401 | 403 | 404 | 429 | 500 | 503,
): ProtectedActionResult {
  return { ok: false, error, status };
}

/**
 * Credential-free protected action executor.
 *
 * Consumes an already-authenticated context and executes the protected action
 * pipeline without retrieving or parsing credentials.
 */
export async function executeProtectedAction(params: {
  action: string;
  payload: unknown;
  context: ProtectedActionContext;
}): Promise<ProtectedActionResult> {
  const { action, payload, context } = params;

  // Step 1: reject malformed names before registry lookup. getAction performs
  // an own-property lookup, so prototype names resolve to ACTION_NOT_FOUND.
  if (typeof action !== 'string' || action.length > MAX_ACTION_NAME_LENGTH) {
    return failure('ACTION_NOT_FOUND', 404);
  }

  const config: ActionConfig | undefined = await getAction(action);
  if (!config) {
    return failure('ACTION_NOT_FOUND', 404);
  }

  // Step 2: validate configuration before any repository or RBAC access.
  try {
    validateActionConfig(config, action);
  } catch {
    return failure('IMPROPER_SETUP_ERROR', 500);
  }

  // Step 3: validate the server-derived principal and context mode.
  const principal = context?.principal;
  if (!principal || typeof principal !== 'object') {
    return failure('UNAUTHORIZED', 401);
  }
  try {
    assertSafeLogtoId(principal.sub, 'userId');
  } catch {
    return failure('UNAUTHORIZED', 401);
  }
  if (!(ALLOWED_MODES as readonly string[]).includes(principal.mode)) {
    return failure('UNAUTHORIZED', 401);
  }

  // Step 4: enforce the action's context-mode policy.
  const allowedModes: readonly ProtectedContextMode[] = config.credentialModes ?? ['session'];
  if (!allowedModes.includes(principal.mode)) {
    return failure('PERMISSION_DENIED', 403);
  }

  const requiredOrgId = config.requiredOrgId;
  const requiredRoleIds = Array.isArray(config.requiredRoleId)
    ? config.requiredRoleId
    : [config.requiredRoleId];
  const requiredPermIds = Array.isArray(config.requiredPermId)
    ? config.requiredPermId
    : [config.requiredPermId];

  // Step 5: apply self access or live organization RBAC.
  if (requiredOrgId === 'self') {
    if (!(config.requiredRoleId === 'any' && config.requiredPermId === 'any')) {
      return failure('IMPROPER_SETUP_ERROR', 500);
    }
  } else {
    let rbac: Awaited<ReturnType<typeof fetchOrgRolePermissions>>;
    try {
      rbac = await fetchOrgRolePermissions(requiredOrgId, principal.sub);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code = (err as { code?: string })?.code;
      if (message === 'ORG_NOT_MEMBER' || code === 'ORG_NOT_MEMBER') {
        return failure('ORG_NOT_MEMBER', 403);
      }
      if (message === 'FETCH_FAILED' || code === 'FETCH_FAILED') {
        return failure('INTERNAL_ERROR', 500);
      }
      if (err instanceof ValidationError) {
        return failure('IMPROPER_SETUP_ERROR', 500);
      }
      return failure('INTERNAL_ERROR', 500);
    }

    const roleOk = requiredRoleIds.every((reqId) =>
      rbac.roles.some((role) => role.id === reqId),
    );
    if (!roleOk) {
      return failure('ROLE_DENIED', 403);
    }

    const binding = config.permissionBinding ?? 'union';
    const permOk = binding === 'required-role'
      ? requiredPermIds.every((perm) =>
          (rbac.rolePermissions[requiredRoleIds[0]] ?? []).includes(perm),
        )
      : requiredPermIds.every((perm) => rbac.permissions.includes(perm));
    if (!permOk) {
      return failure('PERMISSION_DENIED', 403);
    }
  }

  // Step 6: derive actor and organization from trusted context/config only.
  try {
    const data = await config.handler({
      userId: principal.sub,
      orgId: requiredOrgId === 'self' ? null : requiredOrgId,
      payload,
    });
    return { ok: true, data };
  } catch (err) {
    // Step 7: map handler failures to fixed public codes only.
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'NOT_FOUND') {
      return failure('NOT_FOUND', 404);
    }
    if (message === 'RATE_LIMITED') {
      return failure('RATE_LIMITED', 429);
    }
    if (message === 'SERVICE_UNAVAILABLE') {
      return failure('SERVICE_UNAVAILABLE', 503);
    }
    if (
      message.startsWith('INVALID_') ||
      message === 'CATEGORY_PERMANENT' ||
      message === 'CATEGORY_NOT_EMPTY'
    ) {
      return failure('INVALID_PAYLOAD', 400);
    }
    if (message === 'PERMISSION_DENIED' || message === 'FORBIDDEN') {
      return failure('PERMISSION_DENIED', 403);
    }
    return failure('INTERNAL_ERROR', 500);
  }
}
