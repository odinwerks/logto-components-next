import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRefreshable } from './use-refreshable';

describe('useRefreshable', () => {
  it('triggers refresh by toggling visible state', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useRefreshable());

    expect(result.current.visible).toBe(true);

    act(() => {
      result.current.triggerRefresh();
    });

    expect(result.current.visible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(35);
    });

    expect(result.current.visible).toBe(true);
    vi.useRealTimers();
  });

  it('does not set state if unmounted during timer gap', () => {
    vi.useFakeTimers();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, unmount } = renderHook(() => useRefreshable());

    act(() => {
      result.current.triggerRefresh();
    });

    expect(result.current.visible).toBe(false);

    unmount();

    act(() => {
      vi.advanceTimersByTime(35);
    });

    // Console error shouldn't have been called (no React state updates on unmounted component)
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
    vi.useRealTimers();
  });
});
