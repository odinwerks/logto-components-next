import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Module Mocks - hoisted above all imports
// ============================================================================

// Hoisted mocks for the Logto SDK node-client chain used by
// getOrganizationUserPermissions (BUG-L01). Declared via vi.hoisted so they
// are accessible inside the vi.mock factory below and can be re-established
// in beforeEach after vi.clearAllMocks() resets implementations.
const {
  mockGetRefreshToken,
  mockSetStorageItem,
  mockCreateNodeClient,
  mockLogtoClient,
} = vi.hoisted(() => ({
  mockGetRefreshToken: vi.fn<() => Promise<string | null>>(),
  mockSetStorageItem: vi.fn<(key: string, value: string) => Promise<void>>(),
  mockCreateNodeClient: vi.fn(),
  mockLogtoClient: vi.fn(),
}));

vi.mock('next/navigation', () => ({}));

vi.mock('@logto/next/server-actions', () => ({
  default: mockLogtoClient,
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
  introspectToken: vi.fn().mockResolvedValue({ sub: 'user-test-123', sid: 'session-test-123', active: true }),
}));

vi.mock('../guards', () => ({
  assertSafeLogtoId: vi.fn(),
  assertSafeUserId: vi.fn(),
  decodeLogtoAccessToken: vi.fn(),
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
import { assertSafeLogtoId, decodeLogtoAccessToken } from '../guards';

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
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', sid: 'session-test-123', active: true });
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

  // ── Throws FETCH_FAILED when every scope fetch fails (BUG-L10) ───────────

  it('throws FETCH_FAILED when all per-role scope fetches fail', async () => {
    fetchSpy
      // Roles endpoint: user has two roles
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1', 'Admin'), makeRole('r2', 'Editor')]))
      // Admin role scopes - fails
      .mockResolvedValueOnce(mockJsonResponse(null, 500))
      // Editor role scopes - fails
      .mockResolvedValueOnce(mockJsonResponse(null, 503));

    const { getOrgPermissionsWithDescriptions } = await import('./organizations');
    const result = await getOrgPermissionsWithDescriptions('org-123');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('FETCH_FAILED');
  });

  // ── Does NOT false-positive when fetches succeed with zero scopes ─────────
  // Guards against the `allScopes.length === 0` formulation: a successful
  // fetch that returns [] is NOT a fetch failure.

  it('returns empty data (not FETCH_FAILED) when scope fetches succeed but roles have no scopes', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1', 'Admin')]))
      .mockResolvedValueOnce(mockJsonResponse([])); // role has zero scopes

    const { getOrgPermissionsWithDescriptions } = await import('./organizations');
    const result = await getOrgPermissionsWithDescriptions('org-123');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    expect(result.data).toEqual([]);
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
      const e = new Error('INVALID_INPUT');
      e.name = 'ValidationError';
      throw e;
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
    vi.mocked(introspectToken).mockResolvedValue({ active: true, sub: 'user-test-123', sid: 'session-test-123' });
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

  it('ALWAYS performs fresh introspection (BUG-005: ignores any caller-supplied introspection)', async () => {
    // BUG-005: there is no existingIntrospection parameter anymore. The
    // function must always derive the user identity from a live token
    // introspection it performs itself — never from a caller-supplied object.
    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1', 'Admin')]))
      .mockResolvedValueOnce(mockJsonResponse([makeScope('s1', 'read:data')]));

    const { verifyOrgAccess } = await import('./organizations');
    const result = await verifyOrgAccess('org-123');

    expect(result.ok).toBe(true);
    expect(introspectToken).toHaveBeenCalledWith('mock-access-token', { assertAudience: true });
    expect(getTokenForServerAction).toHaveBeenCalled();
  });

  it('calls introspectToken when no expected principal is provided', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse([makeRole('r1', 'Admin')]))
      .mockResolvedValueOnce(mockJsonResponse([makeScope('s1', 'read:data')]));

    const { verifyOrgAccess } = await import('./organizations');
    const result = await verifyOrgAccess('org-123');

    expect(result.ok).toBe(true);
    expect(introspectToken).toHaveBeenCalledWith('mock-access-token', { assertAudience: true });
  });

  it('validates expectedPrincipal against the freshly-introspected sub (BUG-005)', async () => {
    // The introspection mock returns sub 'user-test-123'. Supplying an
    // expectedPrincipal with a different sub must still be rejected, and
    // introspection MUST have run (not skipped).
    fetchSpy.mockRejectedValue(new Error('fetch should not be called'));

    const { verifyOrgAccess } = await import('./organizations');
    const result = await verifyOrgAccess('org-123', { sub: 'user-other-999' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    // Identity came from a real introspection call, not a skipped path.
    expect(introspectToken).toHaveBeenCalledWith('mock-access-token', { assertAudience: true });
  });

  it('rejects an inactive introspection (fresh, not caller-supplied)', async () => {
    vi.mocked(introspectToken).mockResolvedValueOnce({ active: false } as never);

    const { verifyOrgAccess } = await import('./organizations');
    const result = await verifyOrgAccess('org-123');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    expect(introspectToken).toHaveBeenCalled();
  });

  it('fails closed with UNAUTHORIZED when introspectToken throws (BUG-061)', async () => {
    // BUG-061: an introspection failure (network, token expired, etc.) must
    // be caught and sanitized to UNAUTHORIZED, never bubble up raw.
    vi.mocked(introspectToken).mockRejectedValueOnce(new Error('introspection network failure'));
    fetchSpy.mockRejectedValue(new Error('fetch should not be called'));

    const { verifyOrgAccess } = await import('./organizations');
    const result = await verifyOrgAccess('org-123');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    expect(getManagementApiToken).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
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

// ============================================================================
// getOrganizationUserPermissions — refresh-token rotation persistence (BUG-L01)
// ============================================================================

describe('getOrganizationUserPermissions - refresh token rotation (BUG-L01)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLogtoConfig).mockReturnValue({
      endpoint: 'https://auth.example.org',
      appId: 'mock-app-id',
      appSecret: 'mock-app-secret',
      baseUrl: 'http://localhost:3000',
      cookieSecret: 'mock-cookie-secret',
      cookieSecure: false,
      resources: [],
      scopes: [],
    });
    vi.mocked(decodeLogtoAccessToken).mockReturnValue({ scope: 'read:orders write:orders' });

    // Re-establish the SDK node-client chain after clearAllMocks reset
    // implementations. new LogtoClient(config) → { createNodeClient } →
    // nodeClient with controllable getRefreshToken and adapter.setStorageItem.
    // NOTE: a regular function (not an arrow) is required so `new` can
    // construct the mock; arrow functions have no [[Construct]].
    mockLogtoClient.mockImplementation(function () {
      return { createNodeClient: mockCreateNodeClient };
    });
    mockGetRefreshToken.mockResolvedValue('old-refresh-token');
    mockSetStorageItem.mockResolvedValue(undefined);
    mockCreateNodeClient.mockResolvedValue({
      getRefreshToken: mockGetRefreshToken,
      adapter: { setStorageItem: mockSetStorageItem },
    });

    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('persists a rotated refresh token to the SDK storage when the grant returns one', async () => {
    fetchSpy.mockResolvedValueOnce(
      mockJsonResponse({ access_token: 'org-jwt', refresh_token: 'rotated-refresh' })
    );

    const { getOrganizationUserPermissions } = await import('./organizations');
    const result = await getOrganizationUserPermissions('org-123');

    expect(result.ok).toBe(true);
    // The rotated refresh token must be written back via the SDK's public
    // adapter.setStorageItem so the SDK's getAccessToken doesn't hit
    // invalid_grant on the now-revoked old token.
    expect(mockSetStorageItem).toHaveBeenCalledWith('refreshToken', 'rotated-refresh');
  });

  it('does NOT persist when the grant response omits a refresh_token', async () => {
    fetchSpy.mockResolvedValueOnce(mockJsonResponse({ access_token: 'org-jwt' }));

    const { getOrganizationUserPermissions } = await import('./organizations');
    const result = await getOrganizationUserPermissions('org-123');

    expect(result.ok).toBe(true);
    expect(mockSetStorageItem).not.toHaveBeenCalled();
  });

  it('still returns permissions even if persisting the rotated token throws', async () => {
    mockSetStorageItem.mockRejectedValueOnce(new Error('cookie write failed'));
    fetchSpy.mockResolvedValueOnce(
      mockJsonResponse({ access_token: 'org-jwt', refresh_token: 'rotated-refresh' })
    );

    const { getOrganizationUserPermissions } = await import('./organizations');
    const result = await getOrganizationUserPermissions('org-123');

    // Best-effort persist: a failure must not break the permissions result.
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success');
    expect(result.data).toEqual(['read:orders', 'write:orders']);
    expect(mockSetStorageItem).toHaveBeenCalledWith('refreshToken', 'rotated-refresh');
  });

  it('returns UNAUTHORIZED when the session has no refresh token', async () => {
    mockGetRefreshToken.mockResolvedValue(null);

    const { getOrganizationUserPermissions } = await import('./organizations');
    const result = await getOrganizationUserPermissions('org-123');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected error');
    expect(result.error).toBe('UNAUTHORIZED');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── Concurrent call dedup (BUG-020) ──────────────────────────────────────

  it('deduplicates concurrent calls for the same orgId — only one fetch (BUG-020)', async () => {
    vi.mocked(introspectToken).mockResolvedValue({
      active: true,
      sub: 'user-test-123',
      sid: 'session-test-123',
    } as never);

    // Deferred fetch so we control exactly when the token endpoint responds.
    // Both concurrent callers must rendezvous on the same in-flight promise
    // BEFORE the fetch resolves, proving the dedup map works.
    let resolveFetch: (r: Response) => void = () => {};
    const deferredFetch = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    fetchSpy.mockReturnValueOnce(deferredFetch);

    const { getOrganizationUserPermissions } = await import('./organizations');

    // Fire two concurrent calls for the same orgId
    const p1 = getOrganizationUserPermissions('org-123');
    const p2 = getOrganizationUserPermissions('org-123');

    // Resolve the single fetch — both promises should settle with the same result
    resolveFetch(mockJsonResponse({ access_token: 'org-jwt', scope: 'read:orders' }));

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    // Both callers share the same result object (same promise)
    expect(r1).toBe(r2);
    // Only ONE fetch → only one refresh_token grant
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('serializes different-org grants for one session and propagates the rotated token (M-017)', async () => {
    let resolveFirstFetch: (response: Response) => void = () => {};
    const firstFetch = new Promise<Response>((resolve) => {
      resolveFirstFetch = resolve;
    });
    fetchSpy
      .mockReturnValueOnce(firstFetch)
      .mockResolvedValueOnce(mockJsonResponse({
        access_token: 'org-jwt-2',
        refresh_token: 'rotated-refresh-2',
      }));

    const { getOrganizationUserPermissions } = await import('./organizations');

    const first = getOrganizationUserPermissions('org-123');
    const second = getOrganizationUserPermissions('org-456');

    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(getTokenForServerAction).toHaveBeenCalledTimes(1);

    resolveFirstFetch(mockJsonResponse({
      access_token: 'org-jwt-1',
      refresh_token: 'rotated-refresh-1',
    }));
    const [r1, r2] = await Promise.all([first, second]);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(getTokenForServerAction).toHaveBeenCalledTimes(1);
    expect(introspectToken).toHaveBeenCalledTimes(1);

    const firstBody = String(fetchSpy.mock.calls[0]?.[1]?.body);
    const secondBody = String(fetchSpy.mock.calls[1]?.[1]?.body);
    expect(new URLSearchParams(firstBody).get('refresh_token')).toBe('old-refresh-token');
    expect(new URLSearchParams(secondBody).get('refresh_token')).toBe('rotated-refresh-1');
  });

  // ── Cross-session isolation (CAN-ACT-003) ───────────────────────────────

  it('does NOT share in-flight promise across different sessions for the same orgId (CAN-ACT-003)', async () => {
    // Two sessions for the SAME user requesting the SAME org concurrently
    // must NOT share the in-flight promise. The dedup key must contain a
    // session-specific discriminator, not only the user subject.
    //
    // Before the fix, the key used only `sub`, so Session B would receive
    // Session A's decoded scope names during A's pending refresh-token grant
    // — a cross-session permission leak.
    const sessionOneGetRefreshToken = vi.fn().mockResolvedValue('refresh-session-1');
    const sessionTwoGetRefreshToken = vi.fn().mockResolvedValue('refresh-session-2');
    mockCreateNodeClient
      .mockResolvedValueOnce({
        getRefreshToken: sessionOneGetRefreshToken,
        adapter: { setStorageItem: mockSetStorageItem },
      })
      .mockResolvedValueOnce({
        getRefreshToken: sessionTwoGetRefreshToken,
        adapter: { setStorageItem: mockSetStorageItem },
      });
    vi.mocked(introspectToken)
      .mockResolvedValueOnce({ active: true, sub: 'user-Alice', sid: 'session-Alice-1' } as never)
      .mockResolvedValueOnce({ active: true, sub: 'user-Alice', sid: 'session-Alice-2' } as never);

    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse({ access_token: 'org-jwt-alice' }))
      .mockResolvedValueOnce(mockJsonResponse({ access_token: 'org-jwt-bob' }));

    const { getOrganizationUserPermissions } = await import('./organizations');

    const [r1, r2] = await Promise.all([
      getOrganizationUserPermissions('org-shared'),
      getOrganizationUserPermissions('org-shared'),
    ]);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    // Two separate fetches → two separate refresh_token grants.
    // If the bug were present (keyed by orgId alone), only one fetch
    // would fire and Session B would receive Session A's permissions.
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    // The two results must be distinct promise settlements (not the same
    // shared object), proving the dedup slots were separate.
    expect(r1).not.toBe(r2);
  });

  it('does NOT merge coordinators for distinct refresh-token identities', async () => {
    const sessionOneGetRefreshToken = vi.fn().mockResolvedValue('refresh-session-ab');
    const sessionTwoGetRefreshToken = vi.fn().mockResolvedValue('refresh-session-a');
    mockCreateNodeClient
      .mockResolvedValueOnce({
        getRefreshToken: sessionOneGetRefreshToken,
        adapter: { setStorageItem: mockSetStorageItem },
      })
      .mockResolvedValueOnce({
        getRefreshToken: sessionTwoGetRefreshToken,
        adapter: { setStorageItem: mockSetStorageItem },
      });
    vi.mocked(introspectToken)
      .mockResolvedValueOnce({ active: true, sub: 'ab', sid: 'session-ab' } as never)
      .mockResolvedValueOnce({ active: true, sub: 'a', sid: 'session-a' } as never);

    fetchSpy
      .mockResolvedValueOnce(mockJsonResponse({ access_token: 'org-jwt-first' }))
      .mockResolvedValueOnce(mockJsonResponse({ access_token: 'org-jwt-second' }));

    const { getOrganizationUserPermissions } = await import('./organizations');

    const [r1, r2] = await Promise.all([
      getOrganizationUserPermissions('c'),
      getOrganizationUserPermissions('bc'),
    ]);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r1).not.toBe(r2);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('fails closed when the session discriminator is unavailable', async () => {
    vi.mocked(introspectToken).mockResolvedValueOnce({ active: true, sub: 'user-test-123' } as never);

    const { getOrganizationUserPermissions } = await import('./organizations');
    const result = await getOrganizationUserPermissions('org-123');

    expect(result).toEqual({ ok: false, error: 'UNAUTHORIZED' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('retries after a failed call — stale promise evicted from dedup map (BUG-020)', async () => {
    // First call fails (e.g. invalid_grant). The dedup map evicts the
    // settled promise via .finally(), so a subsequent call for the same
    // orgId creates a fresh promise and retries.
    fetchSpy
      .mockResolvedValueOnce({
        status: 400,
        ok: false,
        text: async () => 'invalid_grant',
      } as Response)
      .mockResolvedValueOnce(mockJsonResponse({ access_token: 'org-jwt' }));

    const { getOrganizationUserPermissions } = await import('./organizations');

    // First call fails
    const r1 = await getOrganizationUserPermissions('org-123');
    expect(r1.ok).toBe(false);
    if (r1.ok) throw new Error('Expected error');

    // Second call should NOT return the stale failed promise —
    // it should issue a fresh fetch and succeed
    const r2 = await getOrganizationUserPermissions('org-123');
    expect(r2.ok).toBe(true);
    if (!r2.ok) throw new Error('Expected success');

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
