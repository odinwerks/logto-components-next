import { NextRequest, NextResponse } from 'next/server';
import { getAction } from '../../logto-kit/custom-actions';
import { fetchUserRbacData, validateOrgMembership, checkPermissionInOrg } from '../../logto-kit/custom-actions/validation';
import type { OidcIntrospectionResponse } from '../../logto-kit/logic/types';
import { introspectToken, assertSafeUserId } from '../../logto-kit/logic/utils';

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
      return NextResponse.json(
        { ok: false, error: 'MISSING_FIELDS', message: 'token, id, and action are required' },
        { status: 400 }
      );
    }

    try {
      assertSafeUserId(id);
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: 'TOKEN_INVALID', message: 'Invalid userId format' },
        { status: 400 }
      );
    }

    let introspection: OidcIntrospectionResponse;
    try {
      introspection = await introspectToken(token);
    } catch (error) {
      console.error('[Protected API] Introspection error:', error);
      return NextResponse.json(
        { ok: false, error: 'INTROSPECTION_ERROR', message: 'Failed to validate token' },
        { status: 401 }
      );
    }

    if (!introspection.active) {
      return NextResponse.json(
        { ok: false, error: 'TOKEN_INVALID', message: 'Token is not active or has been revoked' },
        { status: 401 }
      );
    }

    if (introspection.sub !== id) {
      return NextResponse.json(
        { ok: false, error: 'TOKEN_INVALID', message: 'Token subject does not match the provided userId' },
        { status: 401 }
      );
    }

    let userData;
    try {
      userData = await fetchUserRbacData(token);
    } catch (error) {
      console.error('[Protected API] User data fetch error:', error);
      return NextResponse.json(
        { ok: false, error: 'USER_DATA_ERROR', message: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    const orgValidation = await validateOrgMembership(userData.organizations, userData.asOrg);
    if (!orgValidation.ok) {
      return NextResponse.json(
        { ok: false, error: orgValidation.error, message: orgValidation.detail },
        { status: 403 }
      );
    }

    const actionConfig = await getAction(action);

    if (!actionConfig) {
      return NextResponse.json(
        { ok: false, error: 'ACTION_NOT_FOUND', message: `Action "${action}" not found` },
        { status: 404 }
      );
    }

    const hasPermission = await checkPermissionInOrg(id, userData.asOrg!, actionConfig.requiredPermission);

    if (!hasPermission) {
      return NextResponse.json(
        {
          ok: false,
          error: 'PERMISSION_DENIED',
          message: `User lacks required permission: ${actionConfig.requiredPermission}`,
        },
        { status: 403 }
      );
    }

    const result = await actionConfig.handler({
      userId: id,
      orgId: userData.asOrg!,
      payload: payload || {},
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    console.error('[Protected API] Unexpected error:', error);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
