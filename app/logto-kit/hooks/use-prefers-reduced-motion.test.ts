import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';

describe('usePrefersReducedMotion', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    // Restore original matchMedia after each test
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
    vi.unstubAllEnvs();
  });

  it('returns false when matchMedia reports no preference', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when matchMedia reports reduced motion', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it('returns false when matchMedia is not available', () => {
    // Remove matchMedia to simulate environments without it
    vi.stubGlobal('matchMedia', undefined);

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('subscribes to changes in the reduced-motion media query', () => {
    const listeners: (() => void)[] = [];
    let matches = false;

    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      get matches() { return matches; },
      media: query,
      onchange: null,
      addEventListener: (_event: string, listener: () => void) => { listeners.push(listener); },
      removeEventListener: (_event: string, listener: () => void) => {
        const idx = listeners.indexOf(listener);
        if (idx >= 0) listeners.splice(idx, 1);
      },
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    // Simulate user enabling reduced motion
    matches = true;
    act(() => {
      listeners.forEach((l) => l());
    });

    expect(result.current).toBe(true);
  });

  it('returns false when NEXT_PUBLIC_FORCE_ANIMATIONS is "true" regardless of OS preference', () => {
    vi.stubEnv('NEXT_PUBLIC_FORCE_ANIMATIONS', 'true');
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('still respects reduced motion when NEXT_PUBLIC_FORCE_ANIMATIONS is "false"', () => {
    vi.stubEnv('NEXT_PUBLIC_FORCE_ANIMATIONS', 'false');
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });
});
