import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { ActionConfig, ProtectedTransportContext } from './types';

const mocks = vi.hoisted(() => ({
  getAction: vi.fn(),
  executeProtectedAction: vi.fn(),
  rateLimitCheck: vi.fn(),
  getManagementApiToken: vi.fn(),
  getCleanEndpoint: vi.fn(),
  makeManagementFetch: vi.fn(),
}));

vi.mock('../action-registry', () => ({
  getAction: mocks.getAction,
}));

vi.mock('../action-registry/execute', () => ({
  executeProtectedAction: mocks.executeProtectedAction,
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
  createRateLimiter: vi.fn(() => ({ check: mocks.rateLimitCheck })),
}));

import { PROTECTED_ACTION_MAX_BODY_BYTES, runProtectedAction } from './protected-action';

function makeContext(source: ProtectedTransportContext['source'] = 'bearer'): ProtectedTransportContext {
  return {
    source,
    token: 'transport-secret',
    userId: 'authenticated-user',
    scopes: ['calc:basic'],
    organizationId: 'org-1',
    introspection: { active: true, sub: 'authenticated-user' },
  };
}

function makeAction(overrides: Partial<ActionConfig> = {}): ActionConfig {
  return {
    requiredOrgId: 'self',
    requiredRoleId: 'any',
    requiredPermId: 'any',
    executorHandled: true,
    handler: vi.fn().mockResolvedValue({ answer: 3 }),
    ...overrides,
  };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('https://dashboard.example.test/api/protected/automation', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mocks.getAction.mockReset();
  mocks.executeProtectedAction.mockReset().mockResolvedValue({ ok: true, data: { answer: 3 } });
  mocks.rateLimitCheck.mockReset().mockResolvedValue(true);
  mocks.getManagementApiToken.mockReset().mockResolvedValue('management-secret');
  mocks.getCleanEndpoint.mockReset().mockReturnValue('https://logto.example.test');
  mocks.makeManagementFetch.mockReset().mockResolvedValue({
    ok: true,
    json: async () => ({ customData: { Preferences: { asOrg: 'org-1' } } }),
  });
  mocks.getAction.mockResolvedValue(makeAction());
});

describe('runProtectedAction route adapter', () => {
  it('delegates bearer requests with only the authenticated principal and external mode', async () => {
    const response = await runProtectedAction(
      makeRequest({ action: 'calc/add', payload: { a: 1, b: 2 } }),
      makeContext('bearer'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ error: null, data: { answer: 3 } });
    expect(mocks.executeProtectedAction).toHaveBeenCalledWith({
      action: 'calc/add',
      payload: { a: 1, b: 2 },
      context: { principal: { sub: 'authenticated-user', mode: 'external' } },
    });
    expect(JSON.stringify(mocks.executeProtectedAction.mock.calls)).not.toContain('transport-secret');
    expect(JSON.stringify(mocks.executeProtectedAction.mock.calls)).not.toContain('management-secret');
  });

  it('delegates session requests with session mode after the active-org gate passes', async () => {
    mocks.getAction.mockResolvedValue(makeAction({ requiredOrgId: 'org-1' }));

    const response = await runProtectedAction(
      makeRequest({ action: 'org/calc', payload: { n: 3 } }),
      makeContext('session'),
    );

    expect(response.status).toBe(200);
    expect(mocks.makeManagementFetch).toHaveBeenCalledWith(
      'https://logto.example.test/api/users/authenticated-user',
      { method: 'GET', token: 'management-secret' },
    );
    expect(mocks.executeProtectedAction).toHaveBeenCalledWith({
      action: 'org/calc',
      payload: { n: 3 },
      context: { principal: { sub: 'authenticated-user', mode: 'session' } },
    });
  });

  it('leaves bearer organization membership checks to the executor', async () => {
    mocks.getAction.mockResolvedValue(makeAction({ requiredOrgId: 'org-1' }));

    const response = await runProtectedAction(
      makeRequest({ action: 'org/calc' }),
      makeContext('bearer'),
    );

    expect(response.status).toBe(200);
    expect(mocks.makeManagementFetch).not.toHaveBeenCalled();
    expect(mocks.executeProtectedAction).toHaveBeenCalledWith({
      action: 'org/calc',
      payload: {},
      context: { principal: { sub: 'authenticated-user', mode: 'external' } },
    });
  });

  it('rejects session org actions when customData.Preferences.asOrg does not match', async () => {
    mocks.getAction.mockResolvedValue(makeAction({ requiredOrgId: 'org-required' }));
    mocks.makeManagementFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ customData: { Preferences: { asOrg: 'other-org' } } }),
    });

    const response = await runProtectedAction(
      makeRequest({ action: 'org/calc' }),
      makeContext('session'),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'ORG_NOT_MEMBER', data: null });
    expect(mocks.executeProtectedAction).not.toHaveBeenCalled();
  });

  it('fails closed when an action is not explicitly handled by the executor', async () => {
    mocks.getAction.mockResolvedValue(makeAction({ executorHandled: false }));

    const response = await runProtectedAction(
      makeRequest({ action: 'calc/add' }),
      makeContext(),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'INTERNAL_ERROR', data: null });
    expect(mocks.executeProtectedAction).not.toHaveBeenCalled();
  });

  it('maps executor errors to the existing response envelope and status', async () => {
    mocks.executeProtectedAction.mockResolvedValue({ ok: false, error: 'PERMISSION_DENIED', status: 403 });

    const response = await runProtectedAction(
      makeRequest({ action: 'calc/add' }),
      makeContext(),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'PERMISSION_DENIED', data: null });
  });

  it('adds Retry-After to executor 429 responses', async () => {
    mocks.executeProtectedAction.mockResolvedValue({ ok: false, error: 'RATE_LIMITED', status: 429 });

    const response = await runProtectedAction(
      makeRequest({ action: 'calc/add' }),
      makeContext(),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
  });

  it('rate-limits before reading or resolving the body', async () => {
    mocks.rateLimitCheck.mockResolvedValue(false);
    const request = makeRequest({ action: 'calc/add', payload: 'x'.repeat(PROTECTED_ACTION_MAX_BODY_BYTES) });
    const getReader = vi.spyOn(request.body!, 'getReader');

    const response = await runProtectedAction(request, makeContext());

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(getReader).not.toHaveBeenCalled();
    expect(mocks.getAction).not.toHaveBeenCalled();
    expect(mocks.executeProtectedAction).not.toHaveBeenCalled();
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a JSON string', 'hello'],
    ['a JSON number', 1],
    ['a missing action', {}],
    ['an empty action', { action: '' }],
    ['an oversized action name', { action: 'a'.repeat(129) }],
  ])('rejects %s before executor delegation', async (_description, body) => {
    const response = await runProtectedAction(makeRequest(body), makeContext());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'MISSING_FIELDS', data: null });
    expect(mocks.executeProtectedAction).not.toHaveBeenCalled();
  });

  it('accepts an action name at the 128-character limit', async () => {
    const action = 'a'.repeat(128);
    const response = await runProtectedAction(makeRequest({ action }), makeContext());

    expect(response.status).toBe(200);
    expect(mocks.executeProtectedAction).toHaveBeenCalledWith({
      action,
      payload: {},
      context: { principal: { sub: 'authenticated-user', mode: 'external' } },
    });
  });

  it('enforces the 1 MiB stream byte cap', async () => {
    const request = new NextRequest('https://dashboard.example.test/api/protected/automation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'calc/add', payload: 'x'.repeat(PROTECTED_ACTION_MAX_BODY_BYTES) }),
    });

    const response = await runProtectedAction(request, makeContext());

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'PAYLOAD_TOO_LARGE', data: null });
    expect(mocks.executeProtectedAction).not.toHaveBeenCalled();
  });
});
