import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Module Mocks - hoisted above all imports
// ============================================================================

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    const err = new Error('NEXT_REDIRECT');
    (err as any).digest = `NEXT_REDIRECT;${url}`;
    throw err;
  },
}));

const mockGetLogtoContext = vi.fn();
vi.mock('@logto/next/server-actions', () => ({
  getLogtoContext: (...args: any[]) => mockGetLogtoContext(...args),
}));

vi.mock('../../config', () => ({
  getLogtoConfig: vi.fn().mockReturnValue({
    endpoint: 'https://test.logto.app',
    appId: 'test-app-id',
  }),
}));

vi.mock('../log', () => ({
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
}));

import { isAuthError, isTransientError } from '../errors';
import { fetchDashboardData } from './dashboard';

describe('isAuthError', () => {
  it('identifies SanitizedError with exact message "UNAUTHORIZED"', () => {
    const err = new Error('UNAUTHORIZED');
    err.name = 'SanitizedError';
    expect(isAuthError(err)).toBe(true);

    const err2 = new Error('UNAUTHORIZED_STUFF');
    err2.name = 'SanitizedError';
    expect(isAuthError(err2)).toBe(false);

    const err3 = new Error('UNAUTHORIZED');
    expect(isAuthError(err3)).toBe(false); // name is not SanitizedError
  });

  it('identifies exact message "needsAuth"', () => {
    expect(isAuthError(new Error('needsAuth'))).toBe(true);
    expect(isAuthError(new Error('needsAuth '))).toBe(false);
  });

  it('identifies exact message "No access token available for Account API"', () => {
    expect(isAuthError(new Error('No access token available for Account API'))).toBe(true);
    expect(isAuthError(new Error('No access token available for Account API.'))).toBe(false);
  });

  it('identifies startsWith "Cookies can only be modified"', () => {
    expect(isAuthError(new Error('Cookies can only be modified by middleware'))).toBe(true);
    expect(isAuthError(new Error('Cookies can only be modified'))).toBe(true);
    expect(isAuthError(new Error('The Cookies can only be modified'))).toBe(false);
  });

  it('identifies custom error properties: status 401 or 403, code UNAUTHORIZED', () => {
    expect(isAuthError({ status: 401 })).toBe(true);
    expect(isAuthError({ status: 403 })).toBe(true);
    expect(isAuthError({ code: 'UNAUTHORIZED' })).toBe(true);
    expect(isAuthError({ status: 500 })).toBe(false);
    expect(isAuthError({ code: 'OTHER' })).toBe(false);
  });

  it('returns false for null or undefined', () => {
    expect(isAuthError(null)).toBe(false);
    expect(isAuthError(undefined)).toBe(false);
  });
});

describe('isTransientError', () => {
  it('identifies numeric status/statusCode properties for 429 or 5xx', () => {
    expect(isTransientError({ status: 429 })).toBe(true);
    expect(isTransientError({ statusCode: 500 })).toBe(true);
    expect(isTransientError({ status: 503 })).toBe(true);
    expect(isTransientError({ status: 400 })).toBe(false);
    expect(isTransientError({ statusCode: 200 })).toBe(false);
  });

  it('identifies string system error codes', () => {
    expect(isTransientError({ code: 'ECONNREFUSED' })).toBe(true);
    expect(isTransientError({ code: 'ETIMEDOUT' })).toBe(true);
    expect(isTransientError({ code: 'ECONNRESET' })).toBe(true);
    expect(isTransientError({ code: 'EPIPE' })).toBe(true);
    expect(isTransientError({ code: 'ENOTFOUND' })).toBe(true);
    expect(isTransientError({ code: 'EADDRINUSE' })).toBe(true);
    expect(isTransientError({ code: 'ECONNABORTED' })).toBe(true);
    expect(isTransientError({ code: 'SOMETHING_ELSE' })).toBe(false);
  });

  it('identifies exact messages "fetch failed" and "Request timed out"', () => {
    expect(isTransientError(new Error('fetch failed'))).toBe(true);
    expect(isTransientError(new Error('Request timed out'))).toBe(true);
    expect(isTransientError(new Error('fetch failed!'))).toBe(false);
  });

  it('identifies HTTP status indicators with word boundaries in error messages', () => {
    expect(isTransientError(new Error('Failed with status 500'))).toBe(true);
    expect(isTransientError(new Error('429 Too Many Requests'))).toBe(true);
    expect(isTransientError(new Error('abc500xyz'))).toBe(false);
    expect(isTransientError(new Error('xyz429'))).toBe(false);
  });

  it('identifies system error codes in error messages with word boundaries', () => {
    expect(isTransientError(new Error('Connection error: ECONNREFUSED'))).toBe(true);
    expect(isTransientError(new Error('abcECONNREFUSEDxyz'))).toBe(false);
  });

  it('returns false for null or undefined', () => {
    expect(isTransientError(null)).toBe(false);
    expect(isTransientError(undefined)).toBe(false);
  });
});

describe('fetchDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully fetches dashboard data', async () => {
    mockGetLogtoContext.mockResolvedValueOnce({
      claims: { sub: 'user_123' },
      userInfo: {
        sub: 'user_123',
        name: 'Test User',
        username: 'testuser',
        picture: 'avatar.png',
        email: 'test@example.com',
        phone_number: '1234567890',
        custom_data: { Preferences: { asOrg: 'org_abc' } },
        organization_data: [{ id: 'org_abc', name: 'Org ABC', description: 'Desc' }],
        organization_roles: ['org_abc:admin'],
      },
    });

    const res = await fetchDashboardData();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.userData).toBeDefined();
      expect(res.userData.id).toBe('user_123');
      expect(res.activeOrgId).toBe('org_abc');
    }
  });

  it('returns needsAuth if claims sub is missing', async () => {
    mockGetLogtoContext.mockResolvedValueOnce({
      claims: {},
    });

    const res = await fetchDashboardData();
    expect(res).toEqual({ success: false, needsAuth: true });
  });

  it('redirects to sign-in on auth error', async () => {
    mockGetLogtoContext.mockRejectedValueOnce(new Error('needsAuth'));

    await expect(fetchDashboardData()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/api/auth/sign-in');
  });

  it('retries on transient errors and eventually returns FETCH_FAILED if all retries fail', async () => {
    vi.useFakeTimers();
    try {
      mockGetLogtoContext.mockRejectedValue(new Error('fetch failed'));

      const promise = fetchDashboardData();
      
      // Fast-forward timers to handle delays in fetchWithRetry
      await vi.runAllTimersAsync();

      const res = await promise;
      expect(res).toEqual({ success: false, error: 'FETCH_FAILED' });
      expect(mockGetLogtoContext).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('aborts immediately on non-transient, non-auth error', async () => {
    mockGetLogtoContext.mockRejectedValueOnce(new Error('Some unknown database error'));

    const res = await fetchDashboardData();
    expect(res).toEqual({ success: false, error: 'FETCH_FAILED' });
    expect(mockGetLogtoContext).toHaveBeenCalledTimes(1);
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
