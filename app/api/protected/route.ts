import { NextRequest, NextResponse } from 'next/server';
import { getAction } from '../../logto-kit/custom-actions';
import { fetchUserRbacData, validateOrgMembership } from '../../logto-kit/custom-actions/validation';
import type { OidcIntrospectionResponse } from '../../logto-kit/logic/types';
import { introspectToken, assertSafeUserId } from '../../logto-kit/logic/utils';

function apiError(error: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error, message }, { status });
}

interface ProtectedRequestBody {
  token: string;
  id: string;
  action: string;
  payload?: unknown;
}





export async function POST(request: NextRequest) {
  try {
    const body: ProtectedRequestBody = await request.json();

    const { token, id, action, payload } = body;

    if (!token || !id || !action) {
      return apiError('MISSING_FIELDS', 'token, id, and action are required', 400);
    }

    try {
      assertSafeUserId(id);
    } catch (error) {
      return apiError('TOKEN_INVALID', 'Invalid userId format', 400);
    }

    let introspection: OidcIntrospectionResponse;
    try {
      console.log('[Protected API] Introspecting token:', token.substring(0, 20) + '...');
      introspection = await introspectToken(token);
      console.log('[Protected API] Introspection result:', introspection);
    } catch (error) {
      console.error('[Protected API] Introspection error:', error);
      return apiError('INTROSPECTION_ERROR', 'Failed to validate token', 401);
    }

    if (!introspection.active) {
      console.log('[Protected API] Token not active:', introspection);
      return apiError('TOKEN_INVALID', 'Token is not active or has been revoked', 401);
    }

    if (introspection.sub !== id) {
      return apiError('TOKEN_INVALID', 'Token subject does not match the provided userId', 401);
    }

    let userData;
    try {
      userData = await fetchUserRbacData(token);
    } catch (error) {
      console.error('[Protected API] User data fetch error:', error);
      return apiError('USER_DATA_ERROR', 'Failed to fetch user data', 500);
    }

    const actionConfig = await getAction(action);

    if (!actionConfig) {
      return apiError('ACTION_NOT_FOUND', `Action "${action}" not found`, 404);
    }

    const orgValidation = await validateOrgMembership(userData.organizations, userData.asOrg);
    if (!orgValidation.ok) {
      return apiError(orgValidation.error!, orgValidation.detail ?? 'Org validation failed', 403);
    }

    const { getOrganizationUserPermissions } = await import('../../logto-kit/logic/actions');
    const userPermissions = await getOrganizationUserPermissions(userData.asOrg!);

    const requiredPerms = Array.isArray(actionConfig.requiredPerm)
      ? actionConfig.requiredPerm
      : [actionConfig.requiredPerm];

    const hasPermission = requiredPerms.every(perm => userPermissions.includes(perm));

    if (!hasPermission) {
      return apiError('PERMISSION_DENIED', `User lacks required permission: ${requiredPerms.join(', ')}`, 403);
    }

    const result = await actionConfig.handler({
      userId: id,
      orgId: userData.asOrg!,
      payload: payload || {},
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error('[Protected API] Unexpected error:', error);
    return apiError('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
