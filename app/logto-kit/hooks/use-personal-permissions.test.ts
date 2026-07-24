import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersonalPermissions } from './use-personal-permissions';
import { loadPersonalPermissions } from '../server-actions';
import type { PersonalPermission } from '../logic/types';

vi.mock('../server-actions', () => ({
  loadPersonalRoles: vi.fn(),
  loadPersonalPermissions: vi.fn(),
}));

vi.mock('../components/dashboard/shared/tooltip-position', () => ({
  getClampedTooltipPosition: vi.fn(({ left, top }: { left: number; top: number }) => ({
    left,
    top,
  })),
}));

const mockPerms: PersonalPermission[] = [
  { scope: 'read:data', resourceName: 'Data Service', resourceIndicator: 'https://api.example.com' },
  { scope: 'write:data', resourceName: 'Data Service', resourceIndicator: 'https://api.example.com', description: 'Write access' },
];

describe('usePersonalPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with loading state and visible=true', () => {
    vi.mocked(loadPersonalPermissions).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePersonalPermissions());
    expect(result.current.loading).toBe(true);
    expect(result.current.permissions).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.visible).toBe(true);
  });

  it('fetches permissions on mount', async () => {
    vi.mocked(loadPersonalPermissions).mockResolvedValue({ ok: true, data: mockPerms });
    const { result } = renderHook(() => usePersonalPermissions());

    await act(async () => { await Promise.resolve(); });

    expect(loadPersonalPermissions).toHaveBeenCalledTimes(1);
    expect(result.current.permissions).toEqual(mockPerms);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error state on ok: false response', async () => {
    vi.mocked(loadPersonalPermissions).mockResolvedValue({ ok: false, error: 'Forbidden' });
    const { result } = renderHook(() => usePersonalPermissions());

    await act(async () => { await Promise.resolve(); });

    expect(result.current.error).toBe('Forbidden');
    expect(result.current.loading).toBe(false);
  });

  it('sets error state on rejected promise', async () => {
    vi.mocked(loadPersonalPermissions).mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => usePersonalPermissions());

    await act(async () => { await Promise.resolve(); });

    expect(result.current.error).toBe('Network error');
  });

  it('refresh triggers an in-place refetch (rows preserved, no remount)', async () => {
    vi.mocked(loadPersonalPermissions).mockResolvedValue({ ok: true, data: mockPerms });
    const { result } = renderHook(() => usePersonalPermissions());

    await act(async () => { await Promise.resolve(); });
    expect(loadPersonalPermissions).toHaveBeenCalledTimes(1);

    // refresh() now triggers an in-place refetch — visible stays true.
    act(() => { result.current.refresh(); });
    expect(result.current.visible).toBe(true);

    await act(async () => { await Promise.resolve(); });
    expect(loadPersonalPermissions).toHaveBeenCalledTimes(2);
  });

  it('visible is always true (backward compatibility)', () => {
    vi.mocked(loadPersonalPermissions).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePersonalPermissions());
    expect(result.current.visible).toBe(true);
  });

  // ─── Tooltip ──────────────────────────────────────────────────────────────

  it('activePermission is null initially', () => {
    vi.mocked(loadPersonalPermissions).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePersonalPermissions());
    expect(result.current.activePermission).toBeNull();
  });

  it('tooltip is not visible initially', () => {
    vi.mocked(loadPersonalPermissions).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePersonalPermissions());
    expect(result.current.tooltip.visible).toBe(false);
  });

  it('getTooltipHandlers onMouseEnter sets activePermission and shows tooltip', () => {
    vi.mocked(loadPersonalPermissions).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePersonalPermissions());

    const perm = mockPerms[0];
    const handlers = result.current.getTooltipHandlers(perm);

    act(() => {
      handlers.onMouseEnter({
        currentTarget: {
          getBoundingClientRect: () => ({ left: 100, top: 200, right: 200, bottom: 230, width: 100, height: 30 }),
        },
      } as unknown as React.MouseEvent);
    });

    expect(result.current.activePermission).toEqual(perm);
    expect(result.current.tooltip.visible).toBe(true);
  });

  it('getTooltipHandlers onMouseLeave hides tooltip', () => {
    vi.mocked(loadPersonalPermissions).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePersonalPermissions());

    const perm = mockPerms[0];
    const handlers = result.current.getTooltipHandlers(perm);

    act(() => {
      handlers.onMouseEnter({
        currentTarget: {
          getBoundingClientRect: () => ({ left: 100, top: 200, right: 200, bottom: 230, width: 100, height: 30 }),
        },
      } as unknown as React.MouseEvent);
    });

    act(() => { handlers.onMouseLeave(); });

    expect(result.current.tooltip.visible).toBe(false);
    expect(result.current.activePermission).toBeNull();
  });

  it('getTooltipHandlers onFocus sets activePermission and shows tooltip', () => {
    vi.mocked(loadPersonalPermissions).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePersonalPermissions());

    const perm = mockPerms[1];
    const handlers = result.current.getTooltipHandlers(perm);

    act(() => {
      handlers.onFocus({
        currentTarget: {
          getBoundingClientRect: () => ({ left: 50, top: 100, right: 150, bottom: 130, width: 100, height: 30 }),
        },
      } as unknown as React.FocusEvent);
    });

    expect(result.current.activePermission).toEqual(perm);
    expect(result.current.tooltip.visible).toBe(true);
  });

  it('getTooltipHandlers onBlur hides tooltip', () => {
    vi.mocked(loadPersonalPermissions).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePersonalPermissions());

    const perm = mockPerms[0];
    const handlers = result.current.getTooltipHandlers(perm);

    act(() => {
      handlers.onFocus({
        currentTarget: {
          getBoundingClientRect: () => ({ left: 50, top: 100, right: 150, bottom: 130, width: 100, height: 30 }),
        },
      } as unknown as React.FocusEvent);
    });

    act(() => { handlers.onBlur(); });

    expect(result.current.tooltip.visible).toBe(false);
    expect(result.current.activePermission).toBeNull();
  });

  // ─── initialData seeding (instant-fetch) ────────────────────────────────────

  it('seeds permissions from initialData and skips the mount fetch', async () => {
    vi.mocked(loadPersonalPermissions).mockResolvedValue({ ok: true, data: [] });
    const { result } = renderHook(() => usePersonalPermissions(mockPerms));

    expect(result.current.permissions).toEqual(mockPerms);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    await act(async () => { await Promise.resolve(); });
    expect(loadPersonalPermissions).not.toHaveBeenCalled();
  });

  it('treats empty array initialData as "user has zero permissions" and skips the fetch', async () => {
    vi.mocked(loadPersonalPermissions).mockResolvedValue({ ok: true, data: mockPerms });
    const { result } = renderHook(() => usePersonalPermissions([]));

    expect(result.current.permissions).toEqual([]);
    expect(result.current.loading).toBe(false);

    await act(async () => { await Promise.resolve(); });
    expect(loadPersonalPermissions).not.toHaveBeenCalled();
  });

  it('refresh() still fetches (in-place refetch) after initialData seeded the state', async () => {
    vi.mocked(loadPersonalPermissions).mockResolvedValue({ ok: true, data: mockPerms });

    const { result } = renderHook(() => usePersonalPermissions(mockPerms));

    // No fetch on mount.
    await act(async () => { await Promise.resolve(); });
    expect(loadPersonalPermissions).not.toHaveBeenCalled();

    // refresh() bypasses the initialData skip via the in-place refetch.
    act(() => { result.current.refresh(); });
    // visible stays true (in-place, no remount).
    expect(result.current.visible).toBe(true);

    await act(async () => { await Promise.resolve(); });
    expect(loadPersonalPermissions).toHaveBeenCalledTimes(1);
  });
});
