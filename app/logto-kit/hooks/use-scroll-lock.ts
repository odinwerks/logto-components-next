'use client';

import { useEffect } from 'react';

// Module-level ref-count so stacked modals don't premature-unlock.
let lockCount = 0;
let savedOverflowStyle = '';

/**
 * Locks body scroll on mount and restores on unmount. Uses a module-level
 * ref-count so that stacked modals (e.g. a FlowModal inside a FarewellOverlay)
 * only release the lock when the *last* modal unmounts.
 *
 * SSR-safe — no-ops when `document` is not defined.
 */
export function useScrollLock(): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (lockCount === 0) {
      savedOverflowStyle = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount === 0) {
        document.body.style.overflow = savedOverflowStyle;
      }
    };
  }, []);
}
