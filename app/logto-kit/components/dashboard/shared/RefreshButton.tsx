'use client';

import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';

interface RefreshButtonProps {
  onClick: () => void;
  loading: boolean;
  colors: ThemeColors;
  t: Translations;
}

const FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace";

export function RefreshButton({ onClick, loading, colors: c, t }: RefreshButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        background: 'none',
        border: `1px solid ${c.borderColor}`,
        borderRadius: '0.25rem',
        color: c.textTertiary,
        cursor: loading ? 'wait' : 'pointer',
        fontSize: '0.5625rem',
        fontFamily: FONT_MONO,
        padding: '0.125rem 0.5rem',
        opacity: loading ? 0.5 : 1,
      }}
      title={t.dashboard.refresh}
    >
      {loading ? '...' : t.dashboard.refresh}
    </button>
  );
}
