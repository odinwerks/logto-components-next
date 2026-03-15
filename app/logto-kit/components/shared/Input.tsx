'use client';

import type { ThemeSpec } from '../../themes';
import type { ChangeEvent, KeyboardEvent } from 'react';

export type InputProps = {
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
  theme: ThemeSpec;
};

export function Input({
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
  theme,
}: InputProps) {
  const inputStyle = theme.components.inputs.text;
  const errorStyle = hasError
    ? { borderColor: theme.colors.accentRed, background: theme.colors.errorBg }
    : {};

  const input = (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
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
