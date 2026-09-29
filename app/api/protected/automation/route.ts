import { NextRequest, NextResponse } from 'next/server';
import {
  applyProtectedAutomationCors,
  AUTOMATION_CORS_MAX_AGE,
  authenticateProtectedAutomationBearer,
  evaluateProtectedAutomationCors,
  extractProtectedAutomationBearer,
  parseProtectedAutomationAllowedOrigins,
} from '../../../logto-kit/logic/protected-automation';
import { protectedApiError, runProtectedAction } from '../../../logto-kit/logic/protected-action';
import { withLogger } from '../../../lib/with-logger';

function corsResponse(
  response: NextResponse,
  policy: Parameters<typeof applyProtectedAutomationCors>[1],
  decision: Parameters<typeof applyProtectedAutomationCors>[2],
): NextResponse {
  return applyProtectedAutomationCors(response, policy, decision) as NextResponse;
}

function configErrorResponse(): NextResponse {
  const response = protectedApiError('INTERNAL_ERROR', 500);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function forbiddenOriginResponse(): NextResponse {
  // This is intentionally fixed rather than verbosity-resolved: callers need
  // a stable way to distinguish an origin-policy denial, and the body contains
  // no request or configuration detail.
  const response = NextResponse.json({ error: 'FORBIDDEN_ORIGIN', data: null }, { status: 403 });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const OPTIONS = withLogger(async (request: NextRequest) => {
  let policy;
  try {
    policy = parseProtectedAutomationAllowedOrigins();
  } catch {
    return configErrorResponse();
  }

  const decision = evaluateProtectedAutomationCors(request.headers.get('origin'), policy);
  if (!decision.allowed) {
    return forbiddenOriginResponse();
  }

  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.headers.set('Access-Control-Max-Age', AUTOMATION_CORS_MAX_AGE);
  return corsResponse(response, policy, decision);
});

export const POST = withLogger(async (request: NextRequest) => {
  let policy;
  try {
    policy = parseProtectedAutomationAllowedOrigins();
  } catch {
    return configErrorResponse();
  }

  const decision = evaluateProtectedAutomationCors(request.headers.get('origin'), policy);
  if (!decision.allowed) {
    // Do not reflect or otherwise add CORS headers for an origin that did not
    // match the configured policy. Body buffering has not started yet.
    return forbiddenOriginResponse();
  }

  const bearer = extractProtectedAutomationBearer(request);
  if (!bearer) {
    return corsResponse(protectedApiError('UNAUTHORIZED', 401), policy, decision);
  }

  const authentication = await authenticateProtectedAutomationBearer(bearer);
  if (!authentication.ok) {
    const status = authentication.code === 'INTERNAL_ERROR' ? 500 : 401;
    return corsResponse(protectedApiError(authentication.code, status), policy, decision);
  }

  const response = await runProtectedAction(request, authentication.context);
  return corsResponse(response, policy, decision);
});
