import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const authenticateMock = vi.fn();
const runProtectedActionMock = vi.fn();

vi.mock('../../../logto-kit/logic/protected-automation', () => ({
  AUTOMATION_CORS_MAX_AGE: '600',
  applyProtectedAutomationCors: (
    response: Response,
    policy: { mode: 'wildcard' | 'exact' },
    decision: { allowOrigin?: string },
  ) => {
    if (decision.allowOrigin) response.headers.set('Access-Control-Allow-Origin', decision.allowOrigin);
    if (policy.mode === 'exact') response.headers.set('Vary', 'Origin');
    response.headers.set('Cache-Control', 'no-store');
    return response;
  },
  authenticateProtectedAutomationBearer: authenticateMock,
  evaluateProtectedAutomationCors: (origin: string | null, policy: { mode: 'wildcard' | 'exact'; origins: Set<string> }) => {
    if (!origin) return { allowed: true };
    if (policy.mode === 'wildcard') return { allowed: true, allowOrigin: '*' };
    return policy.origins.has(origin)
      ? { allowed: true, allowOrigin: origin }
      : { allowed: false };
  },
  extractProtectedAutomationBearer: (request: Request) => {
    const value = request.headers.get('authorization');
    return value?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;
  },
  parseProtectedAutomationAllowedOrigins: (rawValue = process.env.PROTECTED_AUTOMATION_ALLOWED_ORIGINS) => {
    const value = rawValue?.trim() || '*';
    if (value === '*') return { mode: 'wildcard', origins: new Set<string>() } as const;
    return { mode: 'exact', origins: new Set(value.split(',').map(item => item.trim())) } as const;
  },
}));

vi.mock('../../../logto-kit/logic/protected-action', () => ({
  protectedApiError: (code: string, status: number) => NextResponse.json({ error: code, data: null }, { status }),
  runProtectedAction: runProtectedActionMock,
}));

const validContext = {
  source: 'bearer' as const,
  token: 'opaque-to-test',
  userId: 'automation-user',
  scopes: ['calc:basic'],
  introspection: { active: true, sub: 'automation-user' },
};

function makePost(headers: Record<string, string> = {}) {
  return new NextRequest('https://dash.example.test/api/protected/automation', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ action: 'calc/add', payload: { a: 1, b: 2 } }),
  });
}

beforeEach(() => {
  process.env.PROTECTED_AUTOMATION_ALLOWED_ORIGINS = '*';
  authenticateMock.mockReset();
  runProtectedActionMock.mockReset();
  runProtectedActionMock.mockResolvedValue(NextResponse.json({ error: null, data: { answer: 3 } }));
});

describe('/api/protected/automation CORS and bearer boundary', () => {
  it('returns a wildcard 204 preflight with the required headers', async () => {
    const { OPTIONS } = await import('./route');
    const response = await OPTIONS(new NextRequest('https://dash.example.test/api/protected/automation', {
      method: 'OPTIONS',
      headers: { Origin: 'https://opnform.example.test' },
    }));

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Authorization, Content-Type');
    expect(response.headers.get('Access-Control-Max-Age')).toBe('600');
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull();
  });

  it('allows an exact configured preflight origin and varies by Origin', async () => {
    process.env.PROTECTED_AUTOMATION_ALLOWED_ORIGINS = 'https://opnform.example.test';
    const { OPTIONS } = await import('./route');
    const response = await OPTIONS(new NextRequest('https://dash.example.test/api/protected/automation', {
      method: 'OPTIONS',
      headers: { Origin: 'https://opnform.example.test' },
    }));

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://opnform.example.test');
    expect(response.headers.get('Vary')).toBe('Origin');
  });

  it('rejects a nonmatching preflight with the fixed origin error', async () => {
    process.env.PROTECTED_AUTOMATION_ALLOWED_ORIGINS = 'https://opnform.example.test';
    const { OPTIONS } = await import('./route');
    const response = await OPTIONS(new NextRequest('https://dash.example.test/api/protected/automation', {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example.test' },
    }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'FORBIDDEN_ORIGIN', data: null });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('does not reflect a nonmatching origin on an actual response', async () => {
    process.env.PROTECTED_AUTOMATION_ALLOWED_ORIGINS = 'https://opnform.example.test';
    const { POST } = await import('./route');
    const response = await POST(makePost({ Origin: 'https://evil.example.test' }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'FORBIDDEN_ORIGIN', data: null });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('adds CORS headers to sanitized bearer errors and never falls back to cookies', async () => {
    authenticateMock.mockResolvedValue({ ok: false, code: 'UNAUTHORIZED' });
    const { POST } = await import('./route');
    const response = await POST(makePost({ Origin: 'https://opnform.example.test' }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UNAUTHORIZED', data: null });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(runProtectedActionMock).not.toHaveBeenCalled();
  });

  it('rejects malformed bearer syntax with a fixed 401 without consulting cookies', async () => {
    const { POST } = await import('./route');
    const response = await POST(makePost({
      Origin: 'https://opnform.example.test',
      Authorization: 'Basic not-a-bearer',
    }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UNAUTHORIZED', data: null });
    expect(authenticateMock).not.toHaveBeenCalled();
  });

  it('does not use a session cookie when the Authorization header is absent', async () => {
    const { POST } = await import('./route');
    const response = await POST(makePost({ Cookie: 'logto_session=valid-session-cookie' }));

    expect(response.status).toBe(401);
    expect(authenticateMock).not.toHaveBeenCalled();
    expect(runProtectedActionMock).not.toHaveBeenCalled();
  });

  it('accepts a validated bearer context and reaches the shared action core', async () => {
    authenticateMock.mockResolvedValue({ ok: true, context: validContext });
    const { POST } = await import('./route');
    const response = await POST(makePost({
      Origin: 'https://opnform.example.test',
      Authorization: 'Bearer exchanged-access-token',
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(runProtectedActionMock).toHaveBeenCalledWith(expect.any(NextRequest), validContext);
    expect(authenticateMock).toHaveBeenCalledWith('exchanged-access-token');
  });

  it('allows a no-Origin CLI request to reach bearer authentication', async () => {
    authenticateMock.mockResolvedValue({ ok: false, code: 'UNAUTHORIZED' });
    const { POST } = await import('./route');
    const response = await POST(makePost({ Authorization: 'Bearer exchanged-access-token' }));

    expect(response.status).toBe(401);
    expect(authenticateMock).toHaveBeenCalledWith('exchanged-access-token');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
