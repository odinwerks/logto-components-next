import { NextRequest, NextResponse } from 'next/server';
import { getLogtoContext } from '@logto/next/server-actions';
import { getAction } from '../../logto-kit/action-registry';
import { validateOrgMembership } from '../../logto-kit/action-registry/validation';
import { introspectToken } from '../../logto-kit/logic/utils';
import { assertSafeUserId, assertSafeLogtoId } from '../../logto-kit/logic/guards';
import { debugLog, debugError } from '../../logto-kit/logic/debug';
import { checkSameOrigin } from '../../logto-kit/logic/origin-guard';
import { getTokenForServerAction } from '../../logto-kit/logic/actions/tokens';
import { getLogtoConfig } from '../../logto-kit/config';

function apiError(error: string, message: string, status: number) {
  return NextResponse.json(
    { ok: false, error, message },
    { status }
  );
}

interface ProtectedRequestBody {
  action: string;
  payload?: unknown;
  orgId?: string;
}

export async function POST(request: NextRequest) {
  // Block cross-origin requests (CSRF protection).
  const originError = checkSameOrigin(request);
  if (originError) return originError;

  try {
    const body: ProtectedRequestBody = await request.json();

    const { action, payload, orgId: clientOrgId } = body;

    if (!action) {
      return apiError('MISSING_FIELDS', 'action is required', 400);
    }

    // Derive token and user ID server-side from session cookie
    let token: string;
    try {
      token = await getTokenForServerAction();
    } catch {
      return apiError('UNAUTHORIZED', 'No valid session', 401);
    }

    let introspection;
    try {
      debugLog('[Protected API] Introspecting token');
      introspection = await introspectToken(token);
    } catch (error) {
      debugError('[Protected API] Introspection error:', error instanceof Error ? error.message : String(error));
      return apiError('INTROSPECTION_ERROR', 'Failed to validate token', 401);
    }

    if (!introspection.active) {
      debugLog('[Protected API] Token not active');
      return apiError('TOKEN_INVALID', 'Token is not active or has been revoked', 401);
    }

    const id = introspection.sub;
    if (!id) {
      return apiError('TOKEN_INVALID', 'Token has no subject', 401);
    }

    try {
      assertSafeUserId(id);
    } catch {
      return apiError('TOKEN_INVALID', 'Invalid userId format', 400);
    }

    // Fetch user info via Logto context (includes live org membership and preferences)
    let userOrgs: string[] = [];
    let asOrg: string | null = null;
    try {
      const { userInfo } = await getLogtoContext(getLogtoConfig(), { fetchUserInfo: true });
      userOrgs = (userInfo?.organizations as string[]) || [];

      // Primary: use the org declared by the caller (validated against real membership below).
      // This lets the client forward its active org context without requiring
      // custom_data.Preferences.asOrg to be written first.
      if (clientOrgId && typeof clientOrgId === 'string') {
        try {
          assertSafeLogtoId(clientOrgId, 'orgId');
          asOrg = clientOrgId;
        } catch {
          // Malformed orgId from client — fall through to custom_data fallback
        }
      }

      // Fallback: read from persisted user preference (written by PreferencesProvider)
      if (!asOrg) {
        const customData = (userInfo?.custom_data as Record<string, unknown>) || {};
        const prefs = (customData?.Preferences as { asOrg?: string | null }) || {};
        asOrg = prefs.asOrg ?? null;
      }
    } catch (error) {
      debugError('[Protected API] User data fetch error:', error instanceof Error ? error.message : String(error));
      return apiError('USER_DATA_ERROR', 'Failed to fetch user data', 500);
    }

    const actionConfig = await getAction(action);

    if (!actionConfig) {
      return apiError('ACTION_NOT_FOUND', `Action "${action}" not found`, 404);
    }

    const orgValidation = await validateOrgMembership(userOrgs, asOrg);
    if (!orgValidation.ok) {
      return apiError(orgValidation.error!, orgValidation.detail ?? 'Org validation failed', 403);
    }

    // Defensive guard: ensure asOrg is a non-empty string even if validation passes
    if (!asOrg) {
      return apiError('PERMISSION_DENIED', 'Active organization is required', 403);
    }

    const { getOrganizationUserPermissions } = await import('../../logto-kit/logic/actions');
    const permResult = await getOrganizationUserPermissions(asOrg);
    const userPermissions = permResult.ok ? permResult.data : [];

    const requiredPerms = Array.isArray(actionConfig.requiredPerm)
      ? actionConfig.requiredPerm
      : [actionConfig.requiredPerm];

    const hasPermission = requiredPerms.every(perm => userPermissions.includes(perm));

    if (!hasPermission) {
      return apiError('PERMISSION_DENIED', 'Insufficient permissions for this action', 403);
    }

    try {
      const result = await actionConfig.handler({
        userId: id,
        orgId: asOrg,
        payload: payload ?? {},
      });

      return NextResponse.json({ ok: true, data: result });
    } catch (handlerError) {
      return apiError('VALIDATION_ERROR', handlerError instanceof Error ? handlerError.message : 'Invalid input', 400);
    }
  } catch (error) {
    debugError('[Protected API] Unexpected error:', error instanceof Error ? error.message : String(error));
    return apiError('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
