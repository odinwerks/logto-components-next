import { NextRequest, NextResponse } from 'next/server';
import { getAction } from '../../logto-kit/action-registry';
import { introspectToken, getCleanEndpoint } from '../../logto-kit/logic/utils';
import { assertSafeUserId } from '../../logto-kit/logic/guards';
import { debugLog, debugError } from '../../logto-kit/logic/debug';
import { checkSameOrigin } from '../../logto-kit/logic/origin-guard';
import { getTokenForServerAction } from '../../logto-kit/logic/actions/tokens';
import { getManagementApiToken } from '../../logto-kit/config';
import { verifyPersonalAccess, verifyOrgAccess } from '../../logto-kit/logic/actions';

async function fetchUserAsOrg(userId: string): Promise<string | null> {
  try {
    const mgmtToken = await getManagementApiToken();
    const endpoint = getCleanEndpoint();
    const url = `${endpoint}/api/users/${encodeURIComponent(userId)}`;

    debugLog(`[Protected API] Fetching user ${userId} details from Management API`);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${mgmtToken}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      debugError(`[Protected API] Failed to fetch user details for ${userId}: status ${res.status}`);
      return null;
    }

    const user = (await res.json()) as {
      custom_data?: { Preferences?: { asOrg?: string } };
      customData?: { Preferences?: { asOrg?: string } };
    };

    return user.custom_data?.Preferences?.asOrg || user.customData?.Preferences?.asOrg || null;
  } catch (error) {
    debugError(
      '[Protected API] Error in fetchUserAsOrg:',
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

function apiError(error: string, status: number) {
  return NextResponse.json(
    { error, data: null },
    { status }
  );
}

interface ProtectedRequestBody {
  action: string;
  payload?: unknown;
}

export async function POST(request: NextRequest) {
  // Block cross-origin requests (CSRF protection).
  const originError = checkSameOrigin(request);
  if (originError) return originError;

  try {
    const body: ProtectedRequestBody = await request.json();

    const { action, payload } = body;

    if (!action) {
      return apiError('MISSING_FIELDS', 400);
    }

    // ── Step 0: verify session token ─────────────────────────────────────────
    let token: string;
    try {
      token = await getTokenForServerAction();
    } catch {
      // Fallback: check Authorization header
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        return apiError('UNAUTHORIZED', 401);
      }
    }

    let introspection;
    try {
      debugLog('[Protected API] Introspecting token');
      introspection = await introspectToken(token);
    } catch (error) {
      debugError('[Protected API] Introspection error:', error instanceof Error ? error.message : String(error));
      return apiError('INTROSPECTION_ERROR', 401);
    }

    if (!introspection.active) {
      debugLog('[Protected API] Token not active');
      return apiError('TOKEN_INVALID', 401);
    }

    const id = introspection.sub;
    if (!id) {
      return apiError('TOKEN_INVALID', 401);
    }

    try {
      assertSafeUserId(id);
    } catch {
      return apiError('TOKEN_INVALID', 400);
    }

    // ── Resolve action ────────────────────────────────────────────────────────
    const actionConfig = await getAction(action);

    if (!actionConfig) {
      return apiError('ACTION_NOT_FOUND', 404);
    }

    // ── Validate action configuration ─────────────────────────────────────────
    // Every protected action MUST define all three check categories.
    const missingFields: string[] = [];
    if (!actionConfig.requiredOrgId || typeof actionConfig.requiredOrgId !== 'string' || actionConfig.requiredOrgId.length === 0) {
      missingFields.push('requiredOrgId');
    }
    const hasRole = Array.isArray(actionConfig.requiredRoleId)
      ? actionConfig.requiredRoleId.length > 0
      : typeof actionConfig.requiredRoleId === 'string' && actionConfig.requiredRoleId.length > 0;
    if (!hasRole) {
      missingFields.push('requiredRoleId');
    }
    const hasPerm = Array.isArray(actionConfig.requiredPermId)
      ? actionConfig.requiredPermId.length > 0
      : typeof actionConfig.requiredPermId === 'string' && actionConfig.requiredPermId.length > 0;
    if (!hasPerm) {
      missingFields.push('requiredPermId');
    }
    if (missingFields.length > 0) {
      debugError(`[Protected API] IMPROPER_SETUP_ERROR for action "${action}": missing ${missingFields.join(', ')}`);
      return apiError('IMPROPER_SETUP_ERROR', 500);
    }

    // ── Step 1: RBAC verification ─────────────────────────────────────────────
    // Branch: "self" bypass checks personal roles.
    // Otherwise, check custom data asOrg first, then load org roles/permissions and verify both.
    if (actionConfig.requiredOrgId === 'self') {
      const personalAccessResult = await verifyPersonalAccess();
      if (!personalAccessResult.ok) {
        debugLog('[Protected API] Personal access verification failed:', personalAccessResult.error);
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
        debugLog('[Protected API] Required role not present. Required:', requiredRoles, 'Has:', roles.map(r => r.id));
        return apiError('ROLE_DENIED', 403);
      }

      // ── Step 3: Permission check ──────────────────────────────────────────────
      const requiredPerms = Array.isArray(actionConfig.requiredPermId)
        ? actionConfig.requiredPermId
        : [actionConfig.requiredPermId];

      const hasPermission = requiredPerms.every(perm => permissions.includes(perm));

      if (!hasPermission) {
        debugLog('[Protected API] Required personal permissions not present. Required:', requiredPerms, 'Has:', permissions);
        return apiError('PERMISSION_DENIED', 403);
      }
    } else {
      const orgId = actionConfig.requiredOrgId;
      const asOrg = await fetchUserAsOrg(id);

      if (asOrg !== orgId) {
        debugLog(`[Protected API] active org (${asOrg}) does not match required org (${orgId})`);
        return apiError('ORG_NOT_MEMBER', 403);
      }

      const result = await verifyOrgAccess(orgId);
      if (!result.ok) {
        debugLog('[Protected API] Org access verification failed:', result.error);
        return apiError('ORG_NOT_MEMBER', 403);
      }
      const roles = result.data.roles;
      const permissions = result.data.permissions;

      // ── Step 2: Role check ────────────────────────────────────────────────────
      const requiredRoles = Array.isArray(actionConfig.requiredRoleId)
        ? actionConfig.requiredRoleId
        : [actionConfig.requiredRoleId];

      const hasRequiredRole = requiredRoles.every(reqId => roles.some(r => r.id === reqId));
      if (!hasRequiredRole) {
        debugLog('[Protected API] Required role not present. Required:', requiredRoles, 'Has:', roles.map(r => r.id));
        return apiError('ROLE_DENIED', 403);
      }

      // ── Step 3: Permission check ──────────────────────────────────────────────
      const requiredPerms = Array.isArray(actionConfig.requiredPermId)
        ? actionConfig.requiredPermId
        : [actionConfig.requiredPermId];

      const hasPermission = requiredPerms.every(perm => permissions.includes(perm));

      if (!hasPermission) {
        debugLog('[Protected API] Required permissions not present. Required:', requiredPerms, 'Has:', permissions);
        return apiError('PERMISSION_DENIED', 403);
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
    debugError('[Protected API] Unexpected error:', error instanceof Error ? error.message : String(error));
    return apiError('INTERNAL_ERROR', 500);
  }
}
