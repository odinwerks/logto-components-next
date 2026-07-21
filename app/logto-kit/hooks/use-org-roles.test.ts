import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrgRoles } from './use-org-roles';
import { loadOrganizationUserRoles } from '../server-actions';
import type { DataResult } from '../logic/actions/safe';
import type { UserRole } from '../logic/types';

vi.mock('../server-actions', () => ({
  loadOrganizationUserRoles: vi.fn(),
}));

const mockRoles: UserRole[] = [
  { id: 'role-1', name: 'Org Admin', description: 'Organization Administrator' },
  { id: 'role-2', name: 'Member', description: 'Regular Member' },
];

describe('useOrgRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes empty state when orgId is undefined', () => {
    const { result } = renderHook(() => useOrgRoles({ orgId: undefined }));
    expect(result.current.roles).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches roles on mount when orgId is provided', async () => {
    vi.mocked(loadOrganizationUserRoles).mockResolvedValue({ ok: true, data: mockRoles });
    const { result } = renderHook(() => useOrgRoles({ orgId: 'org-1' }));

    // Assert loading is true during fetch
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadOrganizationUserRoles).toHaveBeenCalledWith('org-1');
    // Now returns UserRole[] array, not name-keyed Record
    expect(result.current.roles).toEqual(mockRoles);
    expect(result.current.loading).toBe(false);
  });

  it('cancels state updates for older fetch when orgId changes (race condition prevention)', async () => {
    let resolveFirst: (v: DataResult<UserRole[]>) => void = () => {};
    const firstPromise = new Promise<DataResult<UserRole[]>>((resolve) => { resolveFirst = resolve; });

    let resolveSecond: (v: DataResult<UserRole[]>) => void = () => {};
    const secondPromise = new Promise<DataResult<UserRole[]>>((resolve) => { resolveSecond = resolve; });

    vi.mocked(loadOrganizationUserRoles)
      .mockReturnValueOnce(firstPromise)
      .mockReturnValueOnce(secondPromise);

    const { result, rerender } = renderHook(({ orgId }) => useOrgRoles({ orgId }), {
      initialProps: { orgId: 'org-1' },
    });

    // Start first fetch for org-1
    expect(result.current.loading).toBe(true);

    // Suddenly rerender with a new orgId 'org-2'
    rerender({ orgId: 'org-2' });

    // Resolve first fetch (which was for org-1, now outdated)
    await act(async () => {
      resolveFirst({
        ok: true,
        data: [{ id: 'role-old', name: 'Old Role', description: 'Old' }],
      });
      await Promise.resolve();
    });

    // Its result should be discarded completely, and roles should still be empty
    // (useAsyncList keeps previous items while loading, so [] is expected as initial)
    // After the first fetch is discarded, items should still be []
    expect(result.current.roles).toEqual([]);

    // Resolve second fetch for org-2
    await act(async () => {
      resolveSecond({
        ok: true,
        data: [{ id: 'role-new', name: 'New Role', description: 'New' }],
      });
      await Promise.resolve();
    });

    // Now roles should reflect the new org's data
    expect(result.current.roles).toEqual([
      { id: 'role-new', name: 'New Role', description: 'New' },
    ]);
    expect(result.current.loading).toBe(false);
  });

  it('handles API errors elegantly', async () => {
    vi.mocked(loadOrganizationUserRoles).mockResolvedValue({ ok: false, error: 'API_ERROR' });
    const { result } = renderHook(() => useOrgRoles({ orgId: 'org-1' }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe('API_ERROR');
    expect(result.current.loading).toBe(false);
  });

  // ─── initialData seeding (instant-fetch) ────────────────────────────────────

  it('seeds roles from initialData and skips the mount fetch', async () => {
    vi.mocked(loadOrganizationUserRoles).mockResolvedValue({ ok: true, data: [] });
    const { result } = renderHook(() =>
      useOrgRoles({ orgId: 'org-1', initialData: mockRoles }),
    );

    expect(result.current.roles).toEqual(mockRoles);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    await act(async () => { await Promise.resolve(); });
    expect(loadOrganizationUserRoles).not.toHaveBeenCalled();
  });

  it('treats empty array initialData as "user has zero org roles" and skips the fetch', async () => {
    vi.mocked(loadOrganizationUserRoles).mockResolvedValue({ ok: true, data: mockRoles });
    const { result } = renderHook(() => useOrgRoles({ orgId: 'org-1', initialData: [] }));

    expect(result.current.roles).toEqual([]);
    expect(result.current.loading).toBe(false);

    await act(async () => { await Promise.resolve(); });
    expect(loadOrganizationUserRoles).not.toHaveBeenCalled();
  });

  it('refresh() still fetches after initialData seeded the state', async () => {
    vi.mocked(loadOrganizationUserRoles)
      .mockResolvedValueOnce({ ok: true, data: [{ id: 'role-fresh', name: 'Fresh' }] });

    const { result } = renderHook(() =>
      useOrgRoles({ orgId: 'org-1', initialData: mockRoles }),
    );

    await act(async () => { await Promise.resolve(); });
    expect(loadOrganizationUserRoles).not.toHaveBeenCalled();

    act(() => { result.current.refresh(); });
    await act(async () => { await Promise.resolve(); });

    expect(loadOrganizationUserRoles).toHaveBeenCalledTimes(1);
    expect(result.current.roles).toEqual([{ id: 'role-fresh', name: 'Fresh' }]);
  });

  it('re-fetches on orgId change even when initialData was provided', async () => {
    vi.mocked(loadOrganizationUserRoles)
      .mockResolvedValueOnce({ ok: true, data: [{ id: 'role-org-2', name: 'Org 2 Role' }] });

    const { result, rerender } = renderHook(
      ({ orgId }) => useOrgRoles({ orgId, initialData: mockRoles }),
      { initialProps: { orgId: 'org-1' } },
    );

    await act(async () => { await Promise.resolve(); });
    expect(loadOrganizationUserRoles).not.toHaveBeenCalled();
    expect(result.current.roles).toEqual(mockRoles);

    rerender({ orgId: 'org-2' });
    await act(async () => { await Promise.resolve(); });

    expect(loadOrganizationUserRoles).toHaveBeenCalledTimes(1);
    expect(result.current.roles).toEqual([{ id: 'role-org-2', name: 'Org 2 Role' }]);
  });
});
