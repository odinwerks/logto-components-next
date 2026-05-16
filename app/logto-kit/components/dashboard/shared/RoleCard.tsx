'use client';

import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';

interface RoleCardProps {
  name: string;
  subtitle?: string;
  subtitleLabel?: string;
  id?: string;
  idLabel?: string;
  colors: ThemeColors;
  t: Translations;
}

const FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace";

export function RoleCard({ name, subtitle, subtitleLabel, id, idLabel, colors, t }: RoleCardProps) {
  const c = colors;

  return (
    <div
      style={{
        padding: '0.625rem 0.75rem',
        background: c.bgPrimary,
        border: `1px solid ${c.borderColor}`,
        borderRadius: '0.25rem',
      }}
    >
      <div
        style={{
          color: c.textPrimary,
          fontSize: '0.6875rem',
          fontWeight: 600,
          fontFamily: FONT_MONO,
          marginBottom: '0.25rem',
        }}
      >
        {name}
      </div>
      {subtitle && (
        <div
          style={{
            color: c.textSecondary,
            fontSize: '0.5625rem',
            fontFamily: FONT_MONO,
          }}
        >
          {subtitleLabel ? `${subtitleLabel}: ` : ''}
          {subtitle}
        </div>
      )}
      {id && (
        <div
          style={{
            color: c.textTertiary,
            fontSize: '0.5625rem',
            marginTop: '0.125rem',
            fontFamily: FONT_MONO,
          }}
        >
          {idLabel || t.organizations.roleIdLabel}: {id}
        </div>
      )}
    </div>
  );
}
