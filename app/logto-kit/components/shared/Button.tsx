'use client';

import { useState } from 'react';
import type { ThemeColors } from '../../themes';
import type { ReactNode, CSSProperties } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSolid';

export type ButtonSize = 'sm' | 'md';

export type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
  mode: 'dark' | 'light';
  colors: ThemeColors;
};

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  type = 'button',
  onClick,
  disabled = false,
  style,
  mode,
  colors,
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);

  const isDark = mode === 'dark';

  const btnBase: React.CSSProperties = {
    padding: '0.5rem 0.9375rem',
    fontSize: '0.8125rem',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontWeight: 500,
    border: '1px solid',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.375rem',
    borderRadius: '0.25rem',
    transition: 'all 0.15s ease',
    lineHeight: 1,
    flexShrink: 0,
  };

  const btnSm = { padding: '0.3125rem 0.8125rem', fontSize: '0.6875rem', gap: '0.3125rem' };

  function mkBtn(bg: string, color: string, border: string, hoverBg: string, hoverColor?: string) {
    return {
      base: { ...btnBase, background: bg, color, borderColor: border },
      hover: { background: hoverBg, color: hoverColor ?? color },
      disabled: { opacity: 0.45, cursor: 'not-allowed' },
    };
  }

  const BUTTONS: Record<string, { base: React.CSSProperties; hover: React.CSSProperties; disabled: React.CSSProperties }> = {
    primary: mkBtn(colors.accentBlue, '#fff', colors.accentBlue, isDark ? 'color-mix(in srgb, ' + colors.accentBlue + ' 80%, #fff)' : 'color-mix(in srgb, ' + colors.accentBlue + ' 80%, #000)'),
    secondary: mkBtn(colors.bgTertiary, colors.textSecondary, colors.borderColor, colors.bgPrimary, colors.textPrimary),
    ghost: {
      base: { ...btnBase, background: 'transparent', color: colors.textTertiary, borderColor: 'transparent' },
      hover: { background: colors.bgTertiary, color: colors.textSecondary },
      disabled: { opacity: 0.45, cursor: 'not-allowed' },
    },
    danger: mkBtn(colors.errorBg, colors.accentRed, isDark ? colors.accentRed + '38' : colors.accentRed + '38', isDark ? colors.accentRed + '22' : colors.accentRed + '22'),
    dangerSolid: mkBtn(colors.accentRed, '#fff', colors.accentRed, isDark ? 'color-mix(in srgb, ' + colors.accentRed + ' 80%, #fff)' : 'color-mix(in srgb, ' + colors.accentRed + ' 80%, #000)'),
  };

  const s = BUTTONS[variant];
  const sz =
    size === 'sm'
      ? btnSm
      : { padding: '0.5rem 1.125rem', fontSize: '0.8125rem', gap: '0.4375rem' };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...s.base,
        ...(hovered && !disabled ? s.hover : {}),
        ...(disabled ? s.disabled : {}),
        ...sz,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
