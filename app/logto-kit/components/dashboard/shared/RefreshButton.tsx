'use client';

import type { ThemeColors } from '../../../themes';
import { RefreshCw } from 'lucide-react';

interface RefreshButtonProps {
  onClick: () => void;
  loading: boolean;
  colors: ThemeColors;
  ariaLabel: string;
}

export function RefreshButton({ onClick, loading, colors: c, ariaLabel }: RefreshButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      aria-label={ariaLabel}
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
  );
}
