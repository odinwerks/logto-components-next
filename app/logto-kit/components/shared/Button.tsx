'use client';

import { useState } from 'react';
import type { ThemeSpec } from '../../themes';
import type { ReactNode, CSSProperties } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSolid';

export type ButtonSize = 'sm' | 'md';

export type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
  theme: ThemeSpec;
};

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  onClick,
  disabled = false,
  style,
  theme,
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  const s = theme.components.buttons[variant];
  const sz =
    size === 'sm'
      ? { padding: '0.3125rem 0.8125rem', fontSize: '0.6875rem', gap: '0.3125rem' }
      : { padding: '0.5rem 1.125rem', fontSize: '0.8125rem', gap: '0.4375rem' };

  return (
    <button
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
