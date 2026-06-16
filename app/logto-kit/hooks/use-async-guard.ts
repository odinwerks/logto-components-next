'use client';

import { useRef, useCallback } from 'react';

/**
 * Provides generation-counter-based async cancellation.
 *
 * Usage pattern:
 * ```ts
 * const guard = useAsyncGuard();
 * const gen = guard.capture();   // snapshot current generation
 * await someAsyncOp();
 * if (guard.isStale(gen)) return; // abort if superseded
 * ```
 */

export interface UseAsyncGuardResult {
  /**
   * Increments the generation counter and returns the new value.
   * Call this at the start of each async operation to capture the generation.
   */
  capture: () => number;
  /**
   * Returns true if the captured generation no longer matches the current one,
   * meaning a newer async operation has been started.
   */
  isStale: (captured: number) => boolean;
  /**
   * Increments the generation counter without returning a value.
   * Use this to cancel any in-flight operations (e.g. on unmount or deps change).
   */
  bump: () => void;
}

export function useAsyncGuard(): UseAsyncGuardResult {
  const gen = useRef(0);

  const capture = useCallback(() => ++gen.current, []);
  const isStale = useCallback((captured: number) => captured !== gen.current, []);
  const bump = useCallback(() => { gen.current++; }, []);

  return { capture, isStale, bump };
}
