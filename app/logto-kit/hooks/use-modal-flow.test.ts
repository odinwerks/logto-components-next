import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModalFlow } from './use-modal-flow';

describe('useModalFlow', () => {
  it('starts with step=null and no error', () => {
    const { result } = renderHook(() => useModalFlow<'confirm' | 'verify'>());

    expect(result.current.state.step).toBeNull();
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it('open sets the step and clears error', () => {
    const { result } = renderHook(() => useModalFlow<'confirm' | 'verify'>());

    act(() => {
      result.current.setError('some error');
    });
    act(() => {
      result.current.open('confirm');
    });

    expect(result.current.state.step).toBe('confirm');
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.isLoading).toBe(false);
  });

  it('close resets step and error to null', () => {
    const { result } = renderHook(() => useModalFlow<'confirm' | 'verify'>());

    act(() => {
      result.current.open('confirm');
    });
    act(() => {
      result.current.setError('oops');
    });
    act(() => {
      result.current.close();
    });

    expect(result.current.state.step).toBeNull();
    expect(result.current.state.error).toBeNull();
  });

  it('setLoading sets step to "loading" and isLoading to true', () => {
    const { result } = renderHook(() => useModalFlow<'confirm' | 'verify'>());

    act(() => {
      result.current.open('confirm');
      result.current.setLoading();
    });

    expect(result.current.state.step).toBe('loading');
    expect(result.current.state.isLoading).toBe(true);
  });

  it('setError stores the error message', () => {
    const { result } = renderHook(() => useModalFlow<'confirm' | 'verify'>());

    act(() => {
      result.current.setError('Something went wrong');
    });

    expect(result.current.state.error).toBe('Something went wrong');
  });

  it('setError with null clears the error', () => {
    const { result } = renderHook(() => useModalFlow<'confirm' | 'verify'>());

    act(() => {
      result.current.setError('oops');
    });
    act(() => {
      result.current.setError(null);
    });

    expect(result.current.state.error).toBeNull();
  });

  it('maintains stable open/close/setLoading references across renders', () => {
    const { result, rerender } = renderHook(() => useModalFlow<'confirm'>());

    const { open: open1, close: close1, setLoading: setLoading1 } = result.current;
    rerender();
    const { open: open2, close: close2, setLoading: setLoading2 } = result.current;

    expect(open1).toBe(open2);
    expect(close1).toBe(close2);
    expect(setLoading1).toBe(setLoading2);
  });
});
