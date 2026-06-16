import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAsyncGuard } from './use-async-guard';

describe('useAsyncGuard', () => {
  it('capture increments the generation counter and returns the new value', () => {
    const { result } = renderHook(() => useAsyncGuard());

    const gen1 = result.current.capture();
    expect(gen1).toBe(1);

    const gen2 = result.current.capture();
    expect(gen2).toBe(2);
  });

  it('isStale returns false for the most recent captured generation', () => {
    const { result } = renderHook(() => useAsyncGuard());

    const captured = result.current.capture();
    expect(result.current.isStale(captured)).toBe(false);
  });

  it('isStale returns true when generation has been bumped after capture', () => {
    const { result } = renderHook(() => useAsyncGuard());

    const captured = result.current.capture();
    act(() => {
      result.current.bump();
    });

    expect(result.current.isStale(captured)).toBe(true);
  });

  it('bump increments generation without returning a value', () => {
    const { result } = renderHook(() => useAsyncGuard());

    const gen1 = result.current.capture();
    act(() => {
      result.current.bump();
    });

    // After bump, the old captured value is stale
    expect(result.current.isStale(gen1)).toBe(true);

    // New capture should return the latest
    const gen2 = result.current.capture();
    expect(result.current.isStale(gen2)).toBe(false);
  });

  it('captures before a new capture are stale after a new capture', () => {
    const { result } = renderHook(() => useAsyncGuard());

    const gen1 = result.current.capture();
    const gen2 = result.current.capture();

    // gen1 is stale because gen2 was captured (incremented counter)
    expect(result.current.isStale(gen1)).toBe(true);
    // gen2 is the latest
    expect(result.current.isStale(gen2)).toBe(false);
  });

  it('maintains stable function references across renders', () => {
    const { result, rerender } = renderHook(() => useAsyncGuard());

    const { capture: capture1, isStale: isStale1, bump: bump1 } = result.current;
    rerender();
    const { capture: capture2, isStale: isStale2, bump: bump2 } = result.current;

    expect(capture1).toBe(capture2);
    expect(isStale1).toBe(isStale2);
    expect(bump1).toBe(bump2);
  });
});
