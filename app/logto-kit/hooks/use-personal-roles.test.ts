import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersonalRoles } from './use-personal-roles';
import { loadPersonalRoles } from '../server-actions';
import type { UserRole } from '../logic/types';
import type { DataResult } from '../logic/actions/safe';

vi.mock('../server-actions', () => ({
  loadPersonalRoles: vi.fn(),
  loadPersonalPermissions: vi.fn(),
}));

const mockRoles: UserRole[] = [
  { id: 'role-1', name: 'Admin', description: 'Administrator' },
  { id: 'role-2', name: 'Viewer' },
];

describe('usePersonalRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with loading state', () => {
    vi.mocked(loadPersonalRoles).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePersonalRoles('user-1'));
    expect(result.current.loading).toBe(true);
    expect(result.current.userRoles).toEqual([]);
    expect(result.current.error).toBe(false);
  });

  it('does not fetch when userId is undefined', () => {
    const { result } = renderHook(() => usePersonalRoles(undefined));
    expect(loadPersonalRoles).not.toHaveBeenCalled();
    // loading stays true (initial value), no fetch was made
    expect(result.current.loading).toBe(true);
  });

  it('fetches roles on mount when userId is provided', async () => {
    vi.mocked(loadPersonalRoles).mockResolvedValue({ ok: true, data: mockRoles });
    const { result } = renderHook(() => usePersonalRoles('user-1'));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadPersonalRoles).toHaveBeenCalledTimes(1);
    expect(result.current.userRoles).toEqual(mockRoles);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(false);
  });

  it('sets error state on fetch failure (ok: false)', async () => {
    vi.mocked(loadPersonalRoles).mockResolvedValue({ ok: false, error: 'Unauthorized' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => usePersonalRoles('user-1'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.userRoles).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('sets error state on fetch rejection', async () => {
    vi.mocked(loadPersonalRoles).mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => usePersonalRoles('user-1'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe(true);
    consoleSpy.mockRestore();
  });

  it('refresh triggers a re-fetch', async () => {
    vi.mocked(loadPersonalRoles).mockResolvedValue({ ok: true, data: mockRoles });
    const { result } = renderHook(() => usePersonalRoles('user-1'));

    await act(async () => { await Promise.resolve(); });
    expect(loadPersonalRoles).toHaveBeenCalledTimes(1);

    act(() => { result.current.refresh(); });
    await act(async () => { await Promise.resolve(); });

    expect(loadPersonalRoles).toHaveBeenCalledTimes(2);
  });

  it('ignores stale fetch result after refresh', async () => {
    let resolveFirst: (v: DataResult<UserRole[]>) => void = () => {};
    const first = new Promise<DataResult<UserRole[]>>((r) => { resolveFirst = r; });
    vi.mocked(loadPersonalRoles)
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce({ ok: true, data: [mockRoles[1]] });

    const { result } = renderHook(() => usePersonalRoles('user-1'));

    // Trigger refresh before first resolves
    act(() => { result.current.refresh(); });
    await act(async () => { await Promise.resolve(); });

    // Now resolve the stale first fetch - it should be ignored
    await act(async () => {
      resolveFirst({ ok: true, data: [mockRoles[0]] });
      await Promise.resolve();
    });

    // Only the second (refresh) fetch result should be used
    expect(result.current.userRoles).toEqual([mockRoles[1]]);
  });

  it('does not update state after unmount', async () => {
    let resolve: (v: DataResult<UserRole[]>) => void = () => {};
    const pending = new Promise<DataResult<UserRole[]>>((r) => { resolve = r; });
    vi.mocked(loadPersonalRoles).mockReturnValue(pending);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = renderHook(() => usePersonalRoles('user-1'));
    unmount();

    // Resolving after unmount should not throw
    await act(async () => {
      resolve({ ok: true, data: mockRoles });
      await Promise.resolve();
    });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
