'use client';

import type { ThemeColors } from '../../themes';
import type { ChangeEvent, KeyboardEvent } from 'react';

export type InputProps = {
  id?: string;
  name?: string;
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  autoFocus?: boolean;
  suffix?: React.ReactNode;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  maxLength?: number;
  hasError?: boolean;
  mode?: 'dark' | 'light';
  colors: ThemeColors;
  describedby?: string;
};

export function Input({
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  style: ext,
  autoFocus,
  suffix,
  onKeyDown,
  disabled,
  maxLength,
  hasError,
  mode: _mode,
  colors,
  describedby,
}: InputProps) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5625rem 0.75rem',
    ...(suffix ? { paddingRight: '2.5rem' } : {}),
    background: colors.bgPrimary,
    border: `1px solid ${colors.borderColor}`,
    color: colors.textPrimary,
    fontSize: '0.8125rem',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
    borderRadius: '0.25rem',
    transition: 'border-color 0.15s ease, background 0.15s ease',
    boxShadow: _mode === 'dark' ? 'inset 0 1px 4px rgba(0,0,0,0.5)' : 'inset 0 1px 4px rgba(0,0,0,0.15)',
  };
  const errorStyle = hasError
    ? { borderColor: colors.accentRed, background: colors.errorBg }
    : {};

  const input = (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
      aria-invalid={hasError ? 'true' : undefined}
      aria-describedby={describedby}
      disabled={disabled}
      maxLength={maxLength}
      style={{
        ...inputStyle,
        ...errorStyle,
        ...ext,
      }}
    />
  );

  if (!suffix) {
    return input;
  }

  return (
    <div style={{ position: 'relative' }}>
      {input}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {suffix}
      </div>
    </div>
  );
}
