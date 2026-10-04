import { NextRequest } from 'next/server';
import { checkSameOrigin } from '../../logto-kit/logic/origin-guard';
import { getTokenForServerAction } from '../../logto-kit/logic/actions/tokens';
import { getLogtoConfig } from '../../logto-kit/config';
import { introspectToken } from '../../logto-kit/logic/utils';
import { assertSafeLogtoId } from '../../logto-kit/logic/guards';
import { protectedApiError, runProtectedAction } from '../../logto-kit/logic/protected-action';
import type { ProtectedTransportContext } from '../../logto-kit/logic/types';
import { withLogger } from '../../lib/with-logger';

/**
 * Browser/session endpoint. CSRF validation and cookie retrieval deliberately
 * remain route-local; action parsing, rate limiting, RBAC, and handler
 * invocation are shared with the explicit-bearer automation endpoint.
 */
export const POST = withLogger(async (request: NextRequest) => {
  // Preserve the existing same-origin boundary before any session work.
  const originError = checkSameOrigin(request);
  if (originError) return originError;

  let token: string;
  try {
    token = await getTokenForServerAction();
  } catch (error) {
    void error;
    return protectedApiError('UNAUTHORIZED', 401);
  }

  let introspection;
  try {
    introspection = await introspectToken(token);
  } catch (error) {
    void error;
    return protectedApiError('INTROSPECTION_ERROR', 401);
  }

  if (!introspection.active || !introspection.sub) {
    return protectedApiError('TOKEN_INVALID', 401);
  }

  // Browser sessions retain the existing app client_id audience check. The
  // automation route intentionally uses its configured API-resource audience.
  let logtoConfig;
  try {
    logtoConfig = getLogtoConfig();
  } catch (error) {
    void error;
    return protectedApiError('INTERNAL_ERROR', 500);
  }
  if (!introspection.client_id || introspection.client_id !== logtoConfig.appId) {
    return protectedApiError('TOKEN_INVALID', 401);
  }

  try {
    assertSafeLogtoId(introspection.sub, 'userId');
  } catch {
    return protectedApiError('TOKEN_INVALID', 400);
  }

  const authContext: ProtectedTransportContext = {
    source: 'session',
    token,
    userId: introspection.sub,
    ...(introspection.sid ? { sid: introspection.sid } : {}),
    scopes: typeof introspection.scope === 'string'
      ? introspection.scope.split(' ').filter(Boolean)
      : [],
    ...(introspection.organization_id ? { organizationId: introspection.organization_id } : {}),
    introspection,
  };

  return runProtectedAction(request, authContext);
});
