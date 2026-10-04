import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionConfig, ProtectedContextMode } from '../logic/types';
import type { ProtectedActionContext, ProtectedActionResult } from './protected-context';

vi.mock('./index', () => ({
  getAction: vi.fn(),
}));

vi.mock('../logic/actions/rbac-core', () => ({
  fetchOrgRolePermissions: vi.fn(),
}));

import { getAction } from './index';
import { fetchOrgRolePermissions } from '../logic/actions/rbac-core';

const USER_ID = 'user-test-123';
const REQUEST_ID = 'request-test-456';

const makeContext = (
  mode: ProtectedContextMode = 'session',
  sub = USER_ID,
  requestId?: string,
): ProtectedActionContext => ({
  principal: { sub, mode },
  ...(requestId ? { requestId } : {}),
});

const makeHandler = (impl?: ActionConfig['handler']) => {
  const handler = vi.fn<ActionConfig['handler']>();
  if (impl) handler.mockImplementation(impl);
  return handler;
};

const selfConfig = (handler: ActionConfig['handler']): ActionConfig => ({
  requiredOrgId: 'self',
  requiredRoleId: 'any',
  requiredPermId: 'any',
  handler,
});

const unionConfig = (handler: ActionConfig['handler']): ActionConfig => ({
  requiredOrgId: 'org-123',
  requiredRoleId: ['role-1'],
  requiredPermId: ['perm:a', 'perm:b'],
  handler,
});

const requiredRoleConfig = (handler: ActionConfig['handler']): ActionConfig => ({
  requiredOrgId: 'org-123',
  requiredRoleId: 'role-1',
  requiredPermId: ['perm:a', 'perm:b'],
  permissionBinding: 'required-role',
  handler,
});

const expectFailure = (
  result: ProtectedActionResult,
  error: Extract<ProtectedActionResult, { ok: false }>['error'],
  status: number,
) => {
  expect(result).toEqual({ ok: false, error, status });
};

describe('executeProtectedAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 for missing and prototype action names without invoking handlers', async () => {
    const handler = makeHandler();
    const registry: Record<string, ActionConfig> = {};
    vi.mocked(getAction).mockImplementation(async (name) =>
      Object.prototype.hasOwnProperty.call(registry, name) ? registry[name] : undefined,
    );

    const { executeProtectedAction } = await import('./execute');
    for (const action of [
      'missing/action',
      'constructor',
      '__proto__',
      'toString',
      'hasOwnProperty',
    ]) {
      const result = await executeProtectedAction({
        action,
        payload: {},
        context: makeContext(),
      });
      expectFailure(result, 'ACTION_NOT_FOUND', 404);
    }

    expect(handler).not.toHaveBeenCalled();
    expect(fetchOrgRolePermissions).not.toHaveBeenCalled();
  });

  it('rejects malformed action names before registry lookup', async () => {
    vi.mocked(getAction).mockResolvedValue(undefined);
    const { executeProtectedAction } = await import('./execute');

    for (const action of [42, null, 'x'.repeat(129)]) {
      const result = await executeProtectedAction({
        action: action as unknown as string,
        payload: {},
        context: makeContext(),
      });
      expectFailure(result, 'ACTION_NOT_FOUND', 404);
    }

    expect(getAction).not.toHaveBeenCalled();
  });

  it('returns 401 for missing or malformed context', async () => {
    const handler = makeHandler();
    vi.mocked(getAction).mockResolvedValue(selfConfig(handler));
    const { executeProtectedAction } = await import('./execute');

    const invalidContexts = [
      undefined,
      { principal: undefined },
      { principal: { sub: '../other-user', mode: 'session' } },
      { principal: { sub: USER_ID, mode: 'invalid' } },
    ];
    for (const context of invalidContexts) {
      const result = await executeProtectedAction({
        action: 'demo/read',
        payload: {},
        context: context as unknown as ProtectedActionContext,
      });
      expectFailure(result, 'UNAUTHORIZED', 401);
    }

    expect(handler).not.toHaveBeenCalled();
  });

  it('denies a context mode that the action does not allow', async () => {
    const handler = makeHandler();
    vi.mocked(getAction).mockResolvedValue(selfConfig(handler));
    const { executeProtectedAction } = await import('./execute');

    const result = await executeProtectedAction({
      action: 'demo/read',
      payload: {},
      context: makeContext('external'),
    });

    expectFailure(result, 'PERMISSION_DENIED', 403);
    expect(handler).not.toHaveBeenCalled();
    expect(fetchOrgRolePermissions).not.toHaveBeenCalled();
  });

  it('allows self any/any actions without an organization lookup', async () => {
    const handler = makeHandler(async (data) => ({ actor: data.userId, org: data.orgId }));
    vi.mocked(getAction).mockResolvedValue(selfConfig(handler));
    const { executeProtectedAction } = await import('./execute');

    const result = await executeProtectedAction({
      action: 'demo/read',
      payload: {},
      context: makeContext(),
    });

    expect(result).toEqual({ ok: true, data: { actor: USER_ID, org: null } });
    expect(fetchOrgRolePermissions).not.toHaveBeenCalled();
  });

  it('checks union permissions across roles and requires required-role permissions on that exact role', async () => {
    const unionHandler = makeHandler(async () => ({ permitted: true }));
    const exactRoleHandler = makeHandler(async () => ({ permitted: true }));
    const rbacResult = {
      roles: [
        { id: 'role-1', name: 'Reader' },
        { id: 'role-2', name: 'Writer' },
      ],
      permissions: ['perm:a', 'perm:b'],
      rolePermissions: { 'role-1': ['perm:a'], 'role-2': ['perm:b'] },
    };
    vi.mocked(fetchOrgRolePermissions).mockResolvedValue(rbacResult);
    vi.mocked(getAction).mockResolvedValue(unionConfig(unionHandler));
    const { executeProtectedAction } = await import('./execute');

    const unionResult = await executeProtectedAction({
      action: 'demo/union',
      payload: {},
      context: makeContext(),
    });
    expect(unionResult).toEqual({ ok: true, data: { permitted: true } });
    expect(unionHandler).toHaveBeenCalledWith({
      userId: USER_ID,
      orgId: 'org-123',
      payload: {},
    });

    vi.mocked(getAction).mockResolvedValue(requiredRoleConfig(exactRoleHandler));
    const exactRoleResult = await executeProtectedAction({
      action: 'demo/required-role',
      payload: {},
      context: makeContext(),
    });
    expectFailure(exactRoleResult, 'PERMISSION_DENIED', 403);
    expect(exactRoleHandler).not.toHaveBeenCalled();
  });

  it('maps handler failures to fixed codes without exposing the error message', async () => {
    const handler = makeHandler(async () => {
      throw new Error('Management API error: bearer secret-token');
    });
    vi.mocked(getAction).mockResolvedValue(selfConfig(handler));
    const { executeProtectedAction } = await import('./execute');

    const result = await executeProtectedAction({
      action: 'demo/read',
      payload: {},
      context: makeContext('session', USER_ID, REQUEST_ID),
    });

    expectFailure(result, 'INTERNAL_ERROR', 500);
    expect(Object.keys(result).sort()).toEqual(['error', 'ok', 'status']);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(USER_ID);
    expect(serialized).not.toContain(REQUEST_ID);
    expect(serialized).not.toContain('Management API');
    expect(serialized).not.toContain('secret-token');
  });

  it('keeps response envelopes free of context metadata and resists payload identity spoofing', async () => {
    const handler = makeHandler(async (data) => ({
      userId: data.userId,
      orgId: data.orgId,
      payload: data.payload,
    }));
    vi.mocked(getAction).mockResolvedValue(unionConfig(handler));
    vi.mocked(fetchOrgRolePermissions).mockResolvedValue({
      roles: [{ id: 'role-1', name: 'Reader' }],
      permissions: ['perm:a', 'perm:b'],
      rolePermissions: { 'role-1': ['perm:a', 'perm:b'] },
    });
    const { executeProtectedAction } = await import('./execute');
    const result = await executeProtectedAction({
      action: 'demo/update',
      payload: {
        userId: 'attacker-user',
        orgId: 'attacker-org',
        roleId: 'attacker-role',
        permission: 'attacker-permission',
      },
      context: makeContext('session', USER_ID, REQUEST_ID),
    });

    expect(handler).toHaveBeenCalledWith({
      userId: USER_ID,
      orgId: 'org-123',
      payload: {
        userId: 'attacker-user',
        orgId: 'attacker-org',
        roleId: 'attacker-role',
        permission: 'attacker-permission',
      },
    });
    expect(result).toEqual({
      ok: true,
      data: {
        userId: USER_ID,
        orgId: 'org-123',
        payload: {
          userId: 'attacker-user',
          orgId: 'attacker-org',
          roleId: 'attacker-role',
          permission: 'attacker-permission',
        },
      },
    });
    expect(Object.keys(result).sort()).toEqual(['data', 'ok']);
    expect(JSON.stringify(result)).not.toContain(REQUEST_ID);
  });
});
