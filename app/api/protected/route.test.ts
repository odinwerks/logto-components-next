import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  getTokenForServerAction: vi.fn(),
  introspectToken: vi.fn(),
  getLogtoConfig: vi.fn(),
  runProtectedAction: vi.fn(),
}));

vi.mock('../../logto-kit/logic/actions/tokens', () => ({
  getTokenForServerAction: mocks.getTokenForServerAction,
}));

vi.mock('../../logto-kit/logic/utils', () => ({
  introspectToken: mocks.introspectToken,
}));

vi.mock('../../logto-kit/config', () => ({
  getLogtoConfig: mocks.getLogtoConfig,
}));

vi.mock('../../logto-kit/logic/protected-action', () => ({
  protectedApiError: (code: string, status: number) => {
    const error = code === 'TOKEN_INVALID' ? 'UNAUTHORIZED' : code;
    return NextResponse.json({ error, data: null }, { status });
  },
  runProtectedAction: mocks.runProtectedAction,
}));

function makeRequest(body: object = { action: 'calc/add' }): NextRequest {
  return new NextRequest('http://localhost:3000/api/protected', {
    method: 'POST',
    headers: {
      origin: 'http://localhost:3000',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.BASE_URL = 'http://localhost:3000';
  delete process.env.APP_URL;
  mocks.getTokenForServerAction.mockReset().mockResolvedValue('session-token');
  mocks.introspectToken.mockReset().mockResolvedValue({
    active: true,
    sub: 'mock-user-id',
    client_id: 'test-app-id',
    sid: 'session-id',
    scope: 'openid calc:basic',
    organization_id: 'org-1',
  });
  mocks.getLogtoConfig.mockReset().mockReturnValue({ appId: 'test-app-id' });
  mocks.runProtectedAction.mockReset().mockResolvedValue(
    NextResponse.json({ error: null, data: { answer: 3 } }),
  );
});

describe('POST /api/protected route boundary', () => {
  it.each([
    ['cross-origin', { origin: 'https://evil.example.test' }],
    ['missing Origin', {}],
  ])('rejects %s requests before session authentication', async (_label, headers) => {
    const request = new NextRequest('http://localhost:3000/api/protected', {
      method: 'POST',
      headers,
    });
    const { POST } = await import('./route');
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(mocks.getTokenForServerAction).not.toHaveBeenCalled();
    expect(mocks.runProtectedAction).not.toHaveBeenCalled();
  });

  it('returns unauthorized when session token retrieval fails', async () => {
    mocks.getTokenForServerAction.mockRejectedValue(new Error('missing session'));
    const { POST } = await import('./route');
    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UNAUTHORIZED', data: null });
    expect(mocks.introspectToken).not.toHaveBeenCalled();
    expect(mocks.runProtectedAction).not.toHaveBeenCalled();
  });

  it('returns an authentication error when introspection fails', async () => {
    mocks.introspectToken.mockRejectedValue(new Error('introspection unavailable'));
    const { POST } = await import('./route');
    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'INTROSPECTION_ERROR', data: null });
    expect(mocks.runProtectedAction).not.toHaveBeenCalled();
  });

  it('rejects inactive or subject-less session introspection results', async () => {
    mocks.introspectToken.mockResolvedValue({ active: false, sub: 'mock-user-id' });
    const { POST } = await import('./route');
    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(mocks.runProtectedAction).not.toHaveBeenCalled();

    mocks.introspectToken.mockResolvedValueOnce({ active: true });
    const nextResponse = await POST(makeRequest());
    expect(nextResponse.status).toBe(401);
    expect(mocks.runProtectedAction).not.toHaveBeenCalled();
  });

  it('rejects a client_id that does not match the configured appId', async () => {
    mocks.introspectToken.mockResolvedValue({
      active: true,
      sub: 'mock-user-id',
      client_id: 'wrong-client-id',
    });
    const { POST } = await import('./route');
    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(mocks.runProtectedAction).not.toHaveBeenCalled();
  });

  it('fails closed when introspection omits client_id', async () => {
    mocks.introspectToken.mockResolvedValue({ active: true, sub: 'mock-user-id' });
    const { POST } = await import('./route');
    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(mocks.runProtectedAction).not.toHaveBeenCalled();
  });

  it('rejects an unsafe subject before invoking the route adapter', async () => {
    mocks.introspectToken.mockResolvedValue({
      active: true,
      sub: '../other-user',
      client_id: 'test-app-id',
    });
    const { POST } = await import('./route');
    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(mocks.runProtectedAction).not.toHaveBeenCalled();
  });

  it('constructs a server-derived session transport context and delegates', async () => {
    const request = makeRequest({ action: 'org/calc', payload: { n: 3 } });
    const { POST } = await import('./route');
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ error: null, data: { answer: 3 } });
    expect(mocks.runProtectedAction).toHaveBeenCalledWith(request, {
      source: 'session',
      token: 'session-token',
      userId: 'mock-user-id',
      sid: 'session-id',
      scopes: ['openid', 'calc:basic'],
      organizationId: 'org-1',
      introspection: {
        active: true,
        sub: 'mock-user-id',
        client_id: 'test-app-id',
        sid: 'session-id',
        scope: 'openid calc:basic',
        organization_id: 'org-1',
      },
    });
  });
});
