'use client';

import type { ThemeColors } from '../../../themes';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

interface RefreshButtonProps {
  onClick: () => void;
  loading: boolean;
  colors: ThemeColors;
  ariaLabel: string;
}

export function RefreshButton({ onClick, loading, colors: c, ariaLabel }: RefreshButtonProps) {
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- announce prop transition
      setStatus(`${ariaLabel} in progress`);
    } else if (status) {
      setStatus(`${ariaLabel} complete`);
    }
    // The status is intentionally driven by the loading edge, not by the
    // button's disabled state, so completion is announced after the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, ariaLabel]);

  return (
    <>
      <button
        onClick={onClick}
        disabled={loading}
        aria-label={ariaLabel}
        aria-busy={loading}
        style={{
        background: 'none',
        border: `1px solid ${c.borderColor}`,
        borderRadius: '0.25rem',
        color: c.textTertiary,
        cursor: loading ? 'wait' : 'pointer',
        padding: '0.25rem',
        opacity: loading ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 0,
        }}
      >
        <RefreshCw size={12} strokeWidth={1.5} />
      </button>
      <span className="sr-only" aria-live="polite">{status}</span>
    </>
  );
}
