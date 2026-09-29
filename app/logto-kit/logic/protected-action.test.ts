import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { ActionConfig, ProtectedAuthContext } from './types';

const mocks = vi.hoisted(() => ({
  getAction: vi.fn(),
  verifyPersonalAccess: vi.fn(),
  verifyOrgAccess: vi.fn(),
  getTokenForServerAction: vi.fn(),
  rateLimitCheck: vi.fn(),
  rateLimitReset: vi.fn(),
  getManagementApiToken: vi.fn(),
  getCleanEndpoint: vi.fn(),
  makeManagementFetch: vi.fn(),
}));

// The authorization core is intentionally not mocked in this file. These
// boundaries stand in for the registry, RBAC Management API verifiers, and
// distributed limiter so the real ordering and bearer branches are exercised.
vi.mock('../action-registry', () => ({
  getAction: mocks.getAction,
}));

vi.mock('./actions', () => ({
  verifyPersonalAccess: mocks.verifyPersonalAccess,
  verifyOrgAccess: mocks.verifyOrgAccess,
}));

vi.mock('./actions/tokens', () => ({
  getTokenForServerAction: mocks.getTokenForServerAction,
}));

vi.mock('../config', () => ({
  getManagementApiToken: mocks.getManagementApiToken,
}));

vi.mock('./utils', () => ({
  getCleanEndpoint: mocks.getCleanEndpoint,
}));

vi.mock('./actions/management-request', () => ({
  makeManagementFetch: mocks.makeManagementFetch,
}));

vi.mock('../../lib/distributed-state', () => ({
  createRateLimiter: vi.fn(() => ({
    check: mocks.rateLimitCheck,
    reset: mocks.rateLimitReset,
  })),
}));

import { PROTECTED_ACTION_MAX_BODY_BYTES, runProtectedAction } from './protected-action';

const successfulAccess = {
  ok: true as const,
  data: {
    roles: [{ id: 'calc-user-role-id', name: 'Calc User' }],
    permissions: ['calc:basic'],
  },
};

function makeContext(overrides: Partial<ProtectedAuthContext> = {}): ProtectedAuthContext {
  return {
    source: 'bearer',
    token: 'bearer-test-credential',
    userId: 'authenticated-user',
    scopes: ['calc:basic'],
    organizationId: 'org-1',
    introspection: { active: true, sub: 'authenticated-user' },
    ...overrides,
  };
}

function makeAction(overrides: Partial<ActionConfig> = {}): ActionConfig {
  return {
    requiredOrgId: 'self',
    requiredRoleId: 'calc-user-role-id',
    requiredPermId: 'calc:basic',
    handler: vi.fn().mockResolvedValue({ answer: 3 }),
    ...overrides,
  };
}

function makeRequest(body: object): NextRequest {
  return new NextRequest('https://dashboard.example.test/api/protected/automation', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.getAction.mockReset();
  mocks.verifyPersonalAccess.mockReset();
  mocks.verifyOrgAccess.mockReset();
  mocks.getTokenForServerAction.mockReset();
  mocks.rateLimitCheck.mockReset().mockResolvedValue(true);
  mocks.rateLimitReset.mockReset();
  mocks.getManagementApiToken.mockReset().mockResolvedValue('management-test-credential');
  mocks.getCleanEndpoint.mockReset().mockReturnValue('https://logto.example.test');
  mocks.makeManagementFetch.mockReset();
  mocks.verifyPersonalAccess.mockResolvedValue(successfulAccess);
  mocks.verifyOrgAccess.mockResolvedValue(successfulAccess);
});

describe('runProtectedAction bearer authorization core', () => {
  it('denies a personal bearer without the required scope before personal verification', async () => {
    const handler = vi.fn().mockResolvedValue({ answer: 3 });
    mocks.getAction.mockResolvedValue(makeAction({ handler }));

    const response = await runProtectedAction(
      makeRequest({ action: 'calc/add', payload: { a: 1, b: 2 } }),
      makeContext({ scopes: [] }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'PERMISSION_DENIED', data: null });
    expect(mocks.verifyPersonalAccess).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('denies a bearer whose organization claim does not match the action', async () => {
    const handler = vi.fn().mockResolvedValue({ answer: 3 });
    mocks.getAction.mockResolvedValue(makeAction({
      requiredOrgId: 'org-1',
      handler,
    }));

    const response = await runProtectedAction(
      makeRequest({ action: 'org/calc', payload: { a: 1, b: 2 } }),
      makeContext({ organizationId: 'org-2' }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'ORG_NOT_MEMBER', data: null });
    expect(mocks.verifyOrgAccess).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('uses the personal bearer verifier context without attempting cookie fallback', async () => {
    const handler = vi.fn().mockResolvedValue({ answer: 3 });
    const context = makeContext();
    mocks.getAction.mockResolvedValue(makeAction({ handler }));
    mocks.getTokenForServerAction.mockRejectedValue(new Error('cookie fallback must not be used'));
    mocks.verifyPersonalAccess.mockImplementation(async (_principal, authenticatedContext) => {
      if (!authenticatedContext) await mocks.getTokenForServerAction();
      return successfulAccess;
    });

    const response = await runProtectedAction(
      makeRequest({ action: 'calc/add', payload: { a: 1, b: 2 } }),
      context,
    );

    expect(response.status).toBe(200);
    expect(mocks.verifyPersonalAccess).toHaveBeenCalledWith(undefined, context);
    expect(mocks.getTokenForServerAction).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith({
      userId: 'authenticated-user',
      orgId: null,
      payload: { a: 1, b: 2 },
    });
  });

  it('uses the organization bearer verifier context without attempting cookie fallback', async () => {
    const handler = vi.fn().mockResolvedValue({ answer: 3 });
    const context = makeContext({ organizationId: 'org-1' });
    mocks.getAction.mockResolvedValue(makeAction({
      requiredOrgId: 'org-1',
      handler,
    }));
    mocks.getTokenForServerAction.mockRejectedValue(new Error('cookie fallback must not be used'));
    mocks.verifyOrgAccess.mockImplementation(async (_orgId, _principal, authenticatedContext) => {
      if (!authenticatedContext) await mocks.getTokenForServerAction();
      return successfulAccess;
    });

    const response = await runProtectedAction(
      makeRequest({ action: 'org/calc', payload: { a: 1, b: 2 } }),
      context,
    );

    expect(response.status).toBe(200);
    expect(mocks.verifyOrgAccess).toHaveBeenCalledWith('org-1', undefined, context);
    expect(mocks.getTokenForServerAction).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith({
      userId: 'authenticated-user',
      orgId: 'org-1',
      payload: { a: 1, b: 2 },
    });
  });

  it('binds handler identity to authenticated context and action configuration', async () => {
    const handler = vi.fn().mockResolvedValue({ answer: 3 });
    mocks.getAction.mockResolvedValue(makeAction({
      requiredOrgId: 'org-1',
      handler,
    }));

    const response = await runProtectedAction(
      makeRequest({
        action: 'org/calc',
        payload: {
          userId: 'attacker-user',
          orgId: 'attacker-org',
          a: 1,
          b: 2,
        },
      }),
      makeContext(),
    );

    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledWith({
      userId: 'authenticated-user',
      orgId: 'org-1',
      payload: {
        userId: 'attacker-user',
        orgId: 'attacker-org',
        a: 1,
        b: 2,
      },
    });
  });

  it('returns the rate-limit response before parsing the request body or resolving an action', async () => {
    const handler = vi.fn().mockResolvedValue({ answer: 3 });
    mocks.getAction.mockResolvedValue(makeAction({ handler }));
    mocks.rateLimitCheck.mockResolvedValue(false);
    const request = makeRequest({
      action: 'calc/add',
      payload: 'x'.repeat(PROTECTED_ACTION_MAX_BODY_BYTES),
    });
    const getReader = vi.spyOn(request.body!, 'getReader');

    const response = await runProtectedAction(request, makeContext());

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: 'RATE_LIMITED', data: null });
    expect(getReader).not.toHaveBeenCalled();
    expect(mocks.getAction).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('sanitizes upstream-looking handler errors', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('upstream secret: management credential leaked'));
    mocks.getAction.mockResolvedValue(makeAction({ handler }));

    const response = await runProtectedAction(
      makeRequest({ action: 'calc/add', payload: { a: 1, b: 2 } }),
      makeContext(),
    );
    const responseText = await response.text();

    expect(response.status).toBe(500);
    expect(responseText).toContain('INTERNAL_ERROR');
    expect(responseText).not.toContain('upstream secret');
    expect(responseText).not.toContain('management credential');
  });

  it('returns a fixed sanitized response when bearer RBAC verification fails', async () => {
    const handler = vi.fn().mockResolvedValue({ answer: 3 });
    mocks.getAction.mockResolvedValue(makeAction({ handler }));
    mocks.verifyPersonalAccess.mockResolvedValue({ ok: false, error: 'upstream secret' });

    const response = await runProtectedAction(
      makeRequest({ action: 'calc/add', payload: { a: 1, b: 2 } }),
      makeContext(),
    );
    const responseText = await response.text();

    expect(response.status).toBe(401);
    expect(responseText).toEqual(JSON.stringify({ error: 'UNAUTHORIZED', data: null }));
    expect(responseText).not.toContain('upstream secret');
    expect(handler).not.toHaveBeenCalled();
  });
});
