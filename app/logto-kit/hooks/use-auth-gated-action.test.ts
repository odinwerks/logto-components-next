import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockIsAuthenticated = vi.fn().mockReturnValue(false);
const mockOpenDashboard = vi.fn();

vi.mock('../components/providers/logto-provider', () => ({
  useLogto: () => ({
    isAuthenticated: mockIsAuthenticated(),
    openDashboard: mockOpenDashboard,
  }),
}));

import { useAuthGatedAction } from './use-auth-gated-action';

describe('useAuthGatedAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(false);
  });

  it('calls openDashboard when unauthenticated', () => {
    const { result } = renderHook(() => useAuthGatedAction());
    const action = vi.fn();

    act(() => {
      result.current(action, '/demo/calculator')();
    });

    expect(mockOpenDashboard).toHaveBeenCalledWith({ routeTo: '/demo/calculator' });
    expect(action).not.toHaveBeenCalled();
  });

  it('calls openDashboard without routeTo when no routeTo provided', () => {
    const { result } = renderHook(() => useAuthGatedAction());
    const action = vi.fn();

    act(() => {
      result.current(action)();
    });

    expect(mockOpenDashboard).toHaveBeenCalledWith({ routeTo: undefined });
    expect(action).not.toHaveBeenCalled();
  });

  it('calls the action when authenticated', () => {
    mockIsAuthenticated.mockReturnValue(true);

    const { result } = renderHook(() => useAuthGatedAction());
    const action = vi.fn();

    act(() => {
      result.current(action, '/demo/calculator')();
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(mockOpenDashboard).not.toHaveBeenCalled();
  });

  it('passes arguments through to the action when authenticated', () => {
    mockIsAuthenticated.mockReturnValue(true);

    const { result } = renderHook(() => useAuthGatedAction());
    const action = vi.fn();

    act(() => {
      result.current(action)('arg1', 42);
    });

    expect(action).toHaveBeenCalledWith('arg1', 42);
  });

  it('returns a stable gatedAction reference across renders when deps are unchanged', () => {
    mockIsAuthenticated.mockReturnValue(true);

    const { result, rerender } = renderHook(() => useAuthGatedAction());
    const first = result.current;
    rerender();
    const second = result.current;

    expect(first).toBe(second);
  });
});
