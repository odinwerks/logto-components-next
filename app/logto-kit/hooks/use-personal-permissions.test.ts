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
    expect(result.current.error).toBe(false);
    expect(result.current.visible).toBe(true);
  });

  it('fetches permissions on mount', async () => {
    vi.mocked(loadPersonalPermissions).mockResolvedValue({ ok: true, data: mockPerms });
    const { result } = renderHook(() => usePersonalPermissions());

    await act(async () => { await Promise.resolve(); });

    expect(loadPersonalPermissions).toHaveBeenCalledTimes(1);
    expect(result.current.permissions).toEqual(mockPerms);
    expect(result.current.loading).toBe(false);
  });

  it('sets error state on ok: false response', async () => {
    vi.mocked(loadPersonalPermissions).mockResolvedValue({ ok: false, error: 'Forbidden' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => usePersonalPermissions());

    await act(async () => { await Promise.resolve(); });

    expect(result.current.error).toBe(true);
    expect(result.current.loading).toBe(false);
    consoleSpy.mockRestore();
  });

  it('sets error state on rejected promise', async () => {
    vi.mocked(loadPersonalPermissions).mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => usePersonalPermissions());

    await act(async () => { await Promise.resolve(); });

    expect(result.current.error).toBe(true);
    consoleSpy.mockRestore();
  });

  it('triggerRefresh unmounts and remounts causing re-fetch', async () => {
    vi.useFakeTimers();
    vi.mocked(loadPersonalPermissions).mockResolvedValue({ ok: true, data: mockPerms });
    const { result } = renderHook(() => usePersonalPermissions());

    await act(async () => { await Promise.resolve(); });
    expect(loadPersonalPermissions).toHaveBeenCalledTimes(1);

    act(() => { result.current.triggerRefresh(); });
    expect(result.current.visible).toBe(false);

    act(() => { vi.advanceTimersByTime(35); });
    expect(result.current.visible).toBe(true);

    await act(async () => { await Promise.resolve(); });
    expect(loadPersonalPermissions).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('does not fetch when visible is false', async () => {
    vi.useFakeTimers();
    vi.mocked(loadPersonalPermissions).mockResolvedValue({ ok: true, data: mockPerms });
    const { result } = renderHook(() => usePersonalPermissions());

    await act(async () => { await Promise.resolve(); });
    const callCount = vi.mocked(loadPersonalPermissions).mock.calls.length;

    act(() => { result.current.triggerRefresh(); });
    // visible is now false - no new fetch should be triggered
    await act(async () => { await Promise.resolve(); });
    expect(loadPersonalPermissions).toHaveBeenCalledTimes(callCount);

    vi.useRealTimers();
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
});
