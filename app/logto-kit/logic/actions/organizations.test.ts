import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Module Mocks - hoisted above all imports
// ============================================================================

vi.mock('next/navigation', () => ({}));

vi.mock('@logto/next/server-actions', () => ({
  default: vi.fn(),
  getAccessToken: vi.fn(),
}));

vi.mock('../../config', () => ({
  getManagementApiToken: vi.fn().mockResolvedValue('mock-m2m-token'),
  getLogtoConfig: vi.fn().mockReturnValue({
    appId: 'mock-app-id',
    appSecret: 'mock-app-secret',
    endpoint: 'https://auth.example.org',
    baseUrl: 'http://localhost:3000',
    cookieSecret: 'mock-cookie-secret',
    cookieSecure: false,
    resources: [],
    scopes: [],
  }),
}));

vi.mock('../utils', () => ({
  introspectToken: vi.fn().mockResolvedValue({ sub: 'user-test-123', active: true }),
}));

vi.mock('../guards', () => ({
  assertSafeLogtoId: vi.fn(),
  assertSafeUserId: vi.fn(),
}));

vi.mock('./tokens', () => ({
  getTokenForServerAction: vi.fn().mockResolvedValue('mock-access-token'),
}));

// ============================================================================
// Imports of mocked modules (for vi.mocked usage)
// ============================================================================

import { getTokenForServerAction } from './tokens';
import { introspectToken } from '../utils';
import { getManagementApiToken, getLogtoConfig } from '../../config';
import { assertSafeLogtoId } from '../guards';

// ============================================================================
// Test Helpers
// ============================================================================

/** Build a mock Response that resolves .json() to the given data. */
const mockJsonResponse = <T>(data: T, status = 200): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(''),
  }) as unknown as Response;

/** Fixture: a UserRole returned by the org user roles endpoint. */
const makeRole = (id: string, name: string) => ({
  id,
  name,
  description: `Role: ${name}`,
  type: 'User' as const,
});

/** Fixture: an OrgRoleScope returned by the role scopes endpoint. */
const makeScope = (id: string, name: string, description: string | null = null) => ({
  id,
  name,
  description,
  tenantId: 'mock-tenant-id',
});

// ============================================================================
// getOrgPermissionsWithDescriptions
// ============================================================================

describe('getOrgPermissionsWithDescriptions', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
    vi.mocked(getManagementApiToken).mockResolvedValue('mock-m2m-token');
    vi.mocked(getLogtoConfig).mockReturnValue({ endpoint: 'https://auth.example.org', appId: 'mock-app-id', appSecret: 'mock-secret', baseUrl: 'http://localhost:3000', cookieSecret: 'mock-cookie-secret', cookieSecure: false, resources: [], scopes: [] });

    // Spy on global fetch for call-count / call-arg assertions
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // ── Returns scopes with descriptions for roles ──────────────────────────

  it('returns OrgRoleScope[] with descriptions for all user roles in an org', async () => {
    const scope1 = makeScope('s1', 'read:orders', 'Can read orders');
    const scope2 = makeScope('s2', 'write:orders', 'Can write orders');

    fetchSpy
      // First call: GET /api/organizations/{orgId}/users/{userId}/roles
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1', 'Admin')]))
      // Second call: GET /api/organization-roles/{roleId}/scopes
      .mockResolvedValueOnce(mockJsonResponse([scope1, scope2]));

    const { getOrgPermissionsWithDescriptions } = await import('./organizations');
    const result = await getOrgPermissionsWithDescriptions('org-123');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual(scope1);
    expect(result.data[1]).toEqual(scope2);
  });

  // ── Returns empty array when user has no roles ──────────────────────────

  it('returns empty array when user has no roles in the org', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse([])); // roles endpoint returns []

    const { getOrgPermissionsWithDescriptions } = await import('./organizations');
    const result = await getOrgPermissionsWithDescriptions('org-123');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    expect(result.data).toEqual([]);
  });

  // ── Deduplicates scopes by name when multiple roles share scopes ──────────

  it('deduplicates scopes by name across multiple roles', async () => {
    const readScope = makeScope('s1', 'read:orders', 'Can read orders');
    const writeScope = makeScope('s2', 'write:orders', 'Can write orders');

    fetchSpy
      // Roles endpoint: user has two roles
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1', 'Admin'), makeRole('r2', 'Editor')]))
      // Admin role scopes
      .mockResolvedValueOnce(mockJsonResponse([readScope, writeScope]))
      // Editor role scopes (same scopes, different IDs - dedup by name)
      .mockResolvedValueOnce(mockJsonResponse([
        makeScope('s3', 'read:orders', 'Can read orders'),
        makeScope('s4', 'write:orders', 'Can write orders'),
      ]));

    const { getOrgPermissionsWithDescriptions } = await import('./organizations');
    const result = await getOrgPermissionsWithDescriptions('org-123');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    // Should have exactly 2 unique scopes (deduplicated by name)
    expect(result.data).toHaveLength(2);
    expect(result.data.map((s) => s.name).sort()).toEqual(['read:orders', 'write:orders']);
  });

  // ── Handles partial failure (one role scopes fetch fails) ────────────────

  it('tolerates a single role scope fetch failure and returns successful results', async () => {
    const readScope = makeScope('s1', 'read:orders', 'Can read orders');

    fetchSpy
      // Roles endpoint: user has two roles
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1', 'Admin'), makeRole('r2', 'Editor')]))
      // Admin role scopes - succeeds
      .mockResolvedValueOnce(mockJsonResponse([readScope]))
      // Editor role scopes - fails
      .mockResolvedValueOnce(mockJsonResponse(null, 500));

    const { getOrgPermissionsWithDescriptions } = await import('./organizations');
    const result = await getOrgPermissionsWithDescriptions('org-123');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    // Should still have the Admin role's scopes
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('read:orders');
  });

  // ── Returns UNAUTHORIZED when session token is inactive ──────────────────

  it('returns UNAUTHORIZED when session token is not active', async () => {
    vi.mocked(introspectToken).mockResolvedValue({ active: false });

    const { getOrgPermissionsWithDescriptions } = await import('./organizations');
    const result = await getOrgPermissionsWithDescriptions('org-123');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
  });

  // ── Returns UNAUTHORIZED when no userId in token ─────────────────────────

  it('returns UNAUTHORIZED when user sub is missing from introspection', async () => {
    vi.mocked(introspectToken).mockResolvedValue({ active: true, sub: undefined } as never);

    const { getOrgPermissionsWithDescriptions } = await import('./organizations');
    const result = await getOrgPermissionsWithDescriptions('org-123');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
  });

  // ── Rejects invalid orgId via guard ─────────────────────────────────────

  it('rejects an invalid orgId via assertSafeLogtoId', async () => {
    vi.mocked(assertSafeLogtoId).mockImplementationOnce(() => {
      throw new Error('INVALID_INPUT');
    });

    const { getOrgPermissionsWithDescriptions } = await import('./organizations');
    const result = await getOrgPermissionsWithDescriptions('');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('INVALID_INPUT');
  });
});

describe('verifyOrgAccess - expected principal compatibility hardening', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ active: true, sub: 'user-test-123' });
    vi.mocked(getManagementApiToken).mockResolvedValue('mock-m2m-token');
    vi.mocked(getLogtoConfig).mockReturnValue({ endpoint: 'https://auth.example.org', appId: 'mock-app-id', appSecret: 'mock-secret', baseUrl: 'http://localhost:3000', cookieSecret: 'mock-cookie-secret', cookieSecure: false, resources: [], scopes: [] });

    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('fails closed with UNAUTHORIZED when session token retrieval fails, even with expected principal', async () => {
    vi.mocked(getTokenForServerAction).mockRejectedValueOnce(new Error('session-unavailable'));
    fetchSpy.mockRejectedValue(new Error('fetch should not be called'));

    const { verifyOrgAccess } = await import('./organizations');
    const result = await verifyOrgAccess('org-123', { sub: 'user-compat-777' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    expect(getManagementApiToken).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails closed with UNAUTHORIZED when token introspection fails, even with expected principal', async () => {
    vi.mocked(introspectToken).mockRejectedValueOnce(new Error('introspection-unavailable'));
    fetchSpy.mockRejectedValue(new Error('fetch should not be called'));

    const { verifyOrgAccess } = await import('./organizations');
    const result = await verifyOrgAccess('org-123', { sub: 'user-test-123' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    expect(getManagementApiToken).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails closed with UNAUTHORIZED when expected sub differs', async () => {
    fetchSpy.mockRejectedValue(new Error('fetch should not be called'));

    const { verifyOrgAccess } = await import('./organizations');
    const result = await verifyOrgAccess('org-123', { sub: 'user-other-999' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    expect(getManagementApiToken).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('skips introspectToken when existingIntrospection is provided', async () => {
    const existingIntrospection = { active: true, sub: 'user-test-123' };

    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1', 'Admin')]))
      .mockResolvedValueOnce(mockJsonResponse([makeScope('s1', 'read:data')]));

    const { verifyOrgAccess } = await import('./organizations');
    const result = await verifyOrgAccess('org-123', undefined, existingIntrospection);

    expect(result.ok).toBe(true);
    expect(introspectToken).not.toHaveBeenCalled();
    expect(getTokenForServerAction).not.toHaveBeenCalled();
  });

  it('calls introspectToken when existingIntrospection is not provided', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1', 'Admin')]))
      .mockResolvedValueOnce(mockJsonResponse([makeScope('s1', 'read:data')]));

    const { verifyOrgAccess } = await import('./organizations');
    const result = await verifyOrgAccess('org-123');

    expect(result.ok).toBe(true);
    expect(introspectToken).toHaveBeenCalledWith('mock-access-token');
  });

  it('validates expectedPrincipal against existingIntrospection', async () => {
    const existingIntrospection = { active: true, sub: 'user-other-999' };

    const { verifyOrgAccess } = await import('./organizations');
    const result = await verifyOrgAccess('org-123', { sub: 'user-test-123' }, existingIntrospection);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    expect(introspectToken).not.toHaveBeenCalled();
  });

  it('rejects inactive existingIntrospection', async () => {
    const existingIntrospection = { active: false };

    const { verifyOrgAccess } = await import('./organizations');
    const result = await verifyOrgAccess('org-123', undefined, existingIntrospection);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    expect(introspectToken).not.toHaveBeenCalled();
  });

  it('fails closed with UNAUTHORIZED when expected sid differs and both sides include sid', async () => {
    vi.mocked(introspectToken).mockResolvedValue({ active: true, sub: 'user-test-123', sid: 'sid-actual-123' } as never);
    fetchSpy.mockRejectedValue(new Error('fetch should not be called'));

    const { verifyOrgAccess } = await import('./organizations');
    const result = await verifyOrgAccess('org-123', {
      sub: 'user-test-123',
      sid: 'sid-expected-999',
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    expect(getManagementApiToken).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails closed when all parallel scope fetches fail', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1', 'Admin')]))
      .mockResolvedValueOnce({
        status: 500,
        ok: false,
        text: async () => 'Internal Server Error',
      } as Response);

    const { verifyOrgAccess } = await import('./organizations');
    const result = await verifyOrgAccess('org-123');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('FETCH_FAILED');
  });
});
