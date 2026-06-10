'use client';

import React from 'react';
import type { ThemeColors } from '../../../themes';

/**
 * Shared UI primitives for the dashboard.
 * Extracted from ContactRow.tsx to avoid sourcing layout atoms from a
 * semantically-specific component file.
 */

export function Lbl({ children, colors }: { children: React.ReactNode; colors: ThemeColors }) {
  return <label style={{
    display: 'block',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontWeight: 500,
    fontSize: '0.625rem',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: '0.4375rem',
  }}>{children}</label>;
}

export function SL({ children, colors }: { children: React.ReactNode; colors: ThemeColors }) {
  return <p style={{
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '0.625rem',
    fontWeight: 600,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: '0.875rem',
  }}>{children}</p>;
}

export function Card({ children, danger, style, mode, colors }: { children: React.ReactNode; danger?: boolean; style?: React.CSSProperties; mode: 'dark' | 'light'; colors: ThemeColors }) {
  const c = colors;
  const isDark = mode === 'dark';
  return (
    <div style={{
      background: danger ? c.errorBg : c.bgSecondary,
      border: `1px solid ${danger ? c.accentRed : c.borderColor}`,
      marginBottom: '1rem',
      overflow: 'hidden',
      boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 3px rgba(0,0,0,0.1)',
      ...style,
    }}>
      {children}
    </div>
  );
}

export function HR({ colors }: { colors: ThemeColors }) {
  return <div style={{
    height: '1px',
    background: `${colors.borderColor}cc`,
    border: 'none',
    margin: '0',
    flexShrink: 0,
  }} />;
}

export function IconBox({ children, color, mode, colors }: { children: React.ReactNode; color?: 'blue' | 'green' | 'red'; mode: 'dark' | 'light'; colors: ThemeColors }) {
  const c = colors;
  const isDark = mode === 'dark';

  const baseStyle: React.CSSProperties = {
    width: '2rem',
    height: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: '0.25rem',
    transition: 'background 0.15s ease',
  };

  const colorStyles: Record<string, React.CSSProperties> = {
    blue: { background: isDark ? '#3b82f61a' : '#2563eb1a', border: '1px solid transparent' },
    green: { background: isDark ? '#10b9811a' : '#0596691a', border: '1px solid transparent' },
    red: { background: c.errorBg, border: isDark ? '1px solid #ef44444d' : '1px solid #dc26264d' },
  };

  const s = color ? { ...baseStyle, ...colorStyles[color] } : { ...baseStyle, background: c.bgTertiary, border: `1px solid ${c.borderColor}` };
  return (
    <div style={s}>
      {children}
    </div>
  );
}
