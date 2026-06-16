import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrgRoles } from './use-org-roles';
import { loadOrganizationUserRoles } from '../server-actions';
import type { DataResult } from '../logic/actions/safe';
import type { UserRole } from '../logic/types';

vi.mock('../server-actions', () => ({
  loadOrganizationUserRoles: vi.fn(),
}));

const mockRoles = [
  { id: 'role-1', name: 'Org Admin', description: 'Organization Administrator' },
  { id: 'role-2', name: 'Member', description: 'Regular Member' },
];

describe('useOrgRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes empty state when orgId is undefined', () => {
    const { result } = renderHook(() => useOrgRoles({ orgId: undefined }));
    expect(result.current.roles).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches roles on mount when orgId is provided', async () => {
    vi.mocked(loadOrganizationUserRoles).mockResolvedValue({ ok: true, data: mockRoles });
    const { result } = renderHook(() => useOrgRoles({ orgId: 'org-1' }));

    // Assert loading is true during fetch
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(loadOrganizationUserRoles).toHaveBeenCalledWith('org-1');
    expect(result.current.roles).toEqual({
      'Org Admin': { id: 'role-1', description: 'Organization Administrator' },
      'Member': { id: 'role-2', description: 'Regular Member' },
    });
    expect(result.current.isLoading).toBe(false);
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
    expect(result.current.isLoading).toBe(true);

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
    expect(result.current.roles).toEqual({});

    // Resolve second fetch for org-2
    await act(async () => {
      resolveSecond({
        ok: true,
        data: [{ id: 'role-new', name: 'New Role', description: 'New' }],
      });
      await Promise.resolve();
    });

    // Now roles should reflect the new org's data
    expect(result.current.roles).toEqual({
      'New Role': { id: 'role-new', description: 'New' },
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('handles API errors elegantly', async () => {
    vi.mocked(loadOrganizationUserRoles).mockResolvedValue({ ok: false, error: 'API_ERROR' });
    const { result } = renderHook(() => useOrgRoles({ orgId: 'org-1' }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe('API_ERROR');
    expect(result.current.isLoading).toBe(false);
  });
});