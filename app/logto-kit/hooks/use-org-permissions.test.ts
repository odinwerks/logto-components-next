import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrgPermissions } from './use-org-permissions';
import { loadOrganizationPermissions, loadOrgPermissionDescriptions } from '../server-actions';
import type { OrgRoleScope } from '../logic/types';
import type { DataResult } from '../logic/actions/safe';

vi.mock('../server-actions', () => ({
  loadOrganizationPermissions: vi.fn(),
  loadOrgPermissionDescriptions: vi.fn(),
}));

vi.mock('../components/dashboard/shared/tooltip-position', () => ({
  getClampedTooltipPosition: vi.fn(({ left, top }: { left: number; top: number }) => ({
    left,
    top,
  })),
}));

const mockPermNames = ['org:read', 'org:write'];
const mockScopes: OrgRoleScope[] = [
  { id: 's1', name: 'org:read', description: 'Read access', tenantId: 't1' },
  { id: 's2', name: 'org:write', description: 'Write access', tenantId: 't1' },
];

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useOrgPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('initializes empty when orgId is undefined', () => {
    const { result } = renderHook(() => useOrgPermissions({ orgId: undefined }));
    expect(result.current.permissions).toEqual([]);
    expect(result.current.descriptions.size).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches both permissions and descriptions on mount when orgId is provided', async () => {
    vi.mocked(loadOrganizationPermissions).mockResolvedValue({
      ok: true,
      data: mockPermNames,
    } as DataResult<string[]>);
    vi.mocked(loadOrgPermissionDescriptions).mockResolvedValue({
      ok: true,
      data: mockScopes,
    } as DataResult<OrgRoleScope[]>);

    const { result } = renderHook(() => useOrgPermissions({ orgId: 'org-1' }));

    expect(result.current.loading).toBe(true);

    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    expect(loadOrganizationPermissions).toHaveBeenCalledWith('org-1');
    expect(loadOrgPermissionDescriptions).toHaveBeenCalledWith('org-1');
    expect(result.current.permissions).toEqual(mockPermNames);
    expect(result.current.descriptions.get('org:read')).toEqual(mockScopes[0]);
    expect(result.current.loading).toBe(false);
  });

  // ─── initialData seeding (instant-fetch) ────────────────────────────────────

  it('seeds state from initialData and skips BOTH the grant + M2M fetches on mount', async () => {
    vi.mocked(loadOrganizationPermissions).mockResolvedValue({
      ok: true,
      data: mockPermNames,
    } as DataResult<string[]>);
    vi.mocked(loadOrgPermissionDescriptions).mockResolvedValue({
      ok: true,
      data: mockScopes,
    } as DataResult<OrgRoleScope[]>);

    const descMap = new Map<string, OrgRoleScope>([
      ['org:read', mockScopes[0]],
      ['org:write', mockScopes[1]],
    ]);

    const { result } = renderHook(() =>
      useOrgPermissions({ orgId: 'org-1', initialData: { permissions: mockPermNames, descriptions: descMap } }),
    );

    // Seeded synchronously on first render.
    expect(result.current.permissions).toEqual(mockPermNames);
    expect(result.current.descriptions.get('org:read')).toEqual(mockScopes[0]);
    expect(result.current.descriptions.get('org:write')).toEqual(mockScopes[1]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    // Flush microtasks — neither fetch should have fired.
    await act(async () => { await Promise.resolve(); });
    expect(loadOrganizationPermissions).not.toHaveBeenCalled();
    expect(loadOrgPermissionDescriptions).not.toHaveBeenCalled();
  });

  it('refresh() still runs BOTH the grant + M2M fetches after initialData seeded (in-place nonce)', async () => {
    vi.mocked(loadOrganizationPermissions).mockResolvedValue({
      ok: true,
      data: ['org:admin'],
    } as DataResult<string[]>);
    vi.mocked(loadOrgPermissionDescriptions).mockResolvedValue({
      ok: true,
      data: [{ id: 's3', name: 'org:admin', description: 'Admin', tenantId: 't1' }],
    } as DataResult<OrgRoleScope[]>);

    const descMap = new Map<string, OrgRoleScope>([['org:read', mockScopes[0]]]);
    const { result } = renderHook(() =>
      useOrgPermissions({ orgId: 'org-1', initialData: { permissions: ['org:read'], descriptions: descMap } }),
    );

    await act(async () => { await Promise.resolve(); });
    expect(loadOrganizationPermissions).not.toHaveBeenCalled();

    // refresh() bypasses the initialData skip via the in-place nonce.
    // visible stays true (in-place, no remount).
    act(() => { result.current.refresh(); });
    expect(result.current.visible).toBe(true);

    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    expect(loadOrganizationPermissions).toHaveBeenCalledTimes(1);
    expect(loadOrgPermissionDescriptions).toHaveBeenCalledTimes(1);
    expect(result.current.permissions).toEqual(['org:admin']);
    // Successful explicit refresh → source is live-audit, auditStatus is live.
    expect(result.current.source).toBe('live-audit');
    expect(result.current.auditStatus).toBe('live');
  });

  // ─── Provenance / audit status (Point 2) ────────────────────────────────────

  it('seeded data has source=m2m-derived and auditStatus=idle', async () => {
    vi.mocked(loadOrganizationPermissions).mockResolvedValue({
      ok: true,
      data: mockPermNames,
    } as DataResult<string[]>);
    vi.mocked(loadOrgPermissionDescriptions).mockResolvedValue({
      ok: true,
      data: mockScopes,
    } as DataResult<OrgRoleScope[]>);

    const descMap = new Map<string, OrgRoleScope>([
      ['org:read', mockScopes[0]],
      ['org:write', mockScopes[1]],
    ]);

    const { result } = renderHook(() =>
      useOrgPermissions({ orgId: 'org-1', initialData: { permissions: mockPermNames, descriptions: descMap } }),
    );

    expect(result.current.source).toBe('m2m-derived');
    expect(result.current.auditStatus).toBe('idle');
    expect(result.current.descriptionsError).toBeNull();

    await act(async () => { await Promise.resolve(); });
    // No mount fetch → provenance stays m2m-derived.
    expect(result.current.source).toBe('m2m-derived');
    expect(result.current.auditStatus).toBe('idle');
  });

  it('mount fetch (no initialData) does NOT set auditStatus to live (not an explicit refresh)', async () => {
    vi.mocked(loadOrganizationPermissions).mockResolvedValue({
      ok: true,
      data: mockPermNames,
    } as DataResult<string[]>);
    vi.mocked(loadOrgPermissionDescriptions).mockResolvedValue({
      ok: true,
      data: mockScopes,
    } as DataResult<OrgRoleScope[]>);

    const { result } = renderHook(() => useOrgPermissions({ orgId: 'org-1' }));

    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.permissions).toEqual(mockPermNames);
    // Mount fetch is NOT an explicit refresh → auditStatus stays idle.
    expect(result.current.auditStatus).toBe('idle');
    expect(result.current.source).toBe('m2m-derived');
  });

  it('descriptions failure sets descriptionsError but retains permissions', async () => {
    vi.mocked(loadOrganizationPermissions).mockResolvedValue({
      ok: true,
      data: mockPermNames,
    } as DataResult<string[]>);
    vi.mocked(loadOrgPermissionDescriptions).mockResolvedValue({
      ok: false,
      error: 'DESC_FAIL',
    } as DataResult<OrgRoleScope[]>);

    const { result } = renderHook(() => useOrgPermissions({ orgId: 'org-1' }));

    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.permissions).toEqual(mockPermNames);
    expect(result.current.descriptionsError).toBe('DESCRIPTIONS_FAILED');
    expect(result.current.error).toBeNull();
  });

  it('failed explicit refresh sets auditStatus=audit-error and retains prior display rows', async () => {
    // Seed with initial data, then refresh fails.
    vi.mocked(loadOrganizationPermissions).mockResolvedValue({
      ok: true,
      data: ['org:admin'],
    } as DataResult<string[]>);
    vi.mocked(loadOrgPermissionDescriptions).mockResolvedValue({
      ok: true,
      data: [{ id: 's3', name: 'org:admin', description: 'Admin', tenantId: 't1' }],
    } as DataResult<OrgRoleScope[]>);

    const descMap = new Map<string, OrgRoleScope>([['org:read', mockScopes[0]]]);
    const { result } = renderHook(() =>
      useOrgPermissions({ orgId: 'org-1', initialData: { permissions: ['org:read'], descriptions: descMap } }),
    );

    // First refresh succeeds.
    act(() => { result.current.refresh(); });
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });
    expect(result.current.auditStatus).toBe('live');
    expect(result.current.permissions).toEqual(['org:admin']);

    // Second refresh fails — permissions request returns ok: false.
    vi.mocked(loadOrganizationPermissions).mockResolvedValueOnce({
      ok: false,
      error: 'GRANT_FAILED',
    } as DataResult<string[]>);

    act(() => { result.current.refresh(); });
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    // Prior display rows retained, audit-status is audit-error.
    expect(result.current.auditStatus).toBe('audit-error');
    expect(result.current.error).toBe('GRANT_FAILED');
  });

  it('clears Org A rows synchronously and ignores its stale refresh when Org B fails (M-023)', async () => {
    vi.mocked(loadOrganizationPermissions).mockResolvedValueOnce({
      ok: true,
      data: ['org-a:read'],
    } as DataResult<string[]>);
    vi.mocked(loadOrgPermissionDescriptions).mockResolvedValue({
      ok: true,
      data: [],
    } as DataResult<OrgRoleScope[]>);

    const { result, rerender } = renderHook(
      ({ orgId }: { orgId: string }) => useOrgPermissions({ orgId }),
      { initialProps: { orgId: 'org-a' } },
    );

    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });
    expect(result.current.permissions).toEqual(['org-a:read']);

    const staleOrgARefresh = deferred<DataResult<string[]>>();
    const orgBFetch = deferred<DataResult<string[]>>();
    vi.mocked(loadOrganizationPermissions).mockImplementation((orgId) =>
      orgId === 'org-a' ? staleOrgARefresh.promise : orgBFetch.promise,
    );

    act(() => { result.current.refresh(); });
    rerender({ orgId: 'org-b' });

    expect(result.current.permissions).toEqual([]);

    await act(async () => {
      staleOrgARefresh.resolve({ ok: true, data: ['org-a:admin'] });
      await staleOrgARefresh.promise;
    });
    expect(result.current.permissions).toEqual([]);

    await act(async () => {
      orgBFetch.resolve({ ok: false, error: 'ORG_B_FAILED' });
      await orgBFetch.promise;
    });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.permissions).toEqual([]);
    expect(result.current.error).toBe('ORG_B_FAILED');
  });
});
