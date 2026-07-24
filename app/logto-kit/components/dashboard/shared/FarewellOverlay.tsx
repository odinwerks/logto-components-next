import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { ThemeColors } from '../types';
import { readEnv } from '../../../logic/env';
import { useScrollLock } from '../../../hooks/use-scroll-lock';
import { useFocusTrap } from './focus-trap';

interface FarewellOverlayProps {
  message: string;
  colors: ThemeColors;
  delayMs?: number;
  onComplete?: () => void;
}

export function FarewellOverlay({ message, colors, delayMs, onComplete }: FarewellOverlayProps) {
  useScrollLock();

  // BUG-M08: Dialog semantics, focus trap, and live region.
  // Escape is intentionally a no-op — the user cannot cancel the farewell.
  const farewellRef = useRef<HTMLDivElement>(null);
  useFocusTrap(farewellRef, () => { /* Escape is a no-op during farewell */ });

  const rawDelay = delayMs ?? parseInt(readEnv('DELETE_REDIRECT_DELAY') || '3000', 10);
  const effectiveDelay = Number.isFinite(rawDelay) && rawDelay >= 0 ? rawDelay : 3000;

  // BUG-019: Store onComplete in a ref to prevent timer resets when parent
  // passes an inline, un-memoized callback whose identity changes every render.
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onCompleteRef.current) {
        onCompleteRef.current();
      } else {
        window.location.href = '/';
      }
    }, effectiveDelay);
    return () => clearTimeout(timer);
  }, [effectiveDelay]);

  return (
    <motion.div
      ref={farewellRef}
      role="dialog"
      aria-modal="true"
      aria-label={message}
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.06, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(0.375rem) saturate(0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
    >
      <div role="status" aria-live="polite">
        <p
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: '1.75rem',
            fontWeight: 700,
            color: colors.textPrimary,
            textAlign: 'center',
            margin: 0,
          }}
        >
          {message}
        </p>
      </div>
    </motion.div>
  );
}
