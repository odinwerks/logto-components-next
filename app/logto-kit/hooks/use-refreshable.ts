'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Returns { visible, triggerRefresh } for wrapping a data block that should
 * fully unmount / remount on refresh.
 *
 * triggerRefresh() sets visible to false (unmounts children), then after a
 * 35ms tick sets visible back to true (remounts children fresh). The gap
 * gives React a full render cycle to flush cleanup effects before remount.
 */

const REFRESH_GAP_MS = 35;

export function useRefreshable() {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const triggerRefresh = useCallback(() => {
    if (!mountedRef.current) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setVisible(false);
    timerRef.current = setTimeout(() => {
      if (mountedRef.current) setVisible(true);
    }, REFRESH_GAP_MS);
  }, []);

  return { visible, triggerRefresh };
}
