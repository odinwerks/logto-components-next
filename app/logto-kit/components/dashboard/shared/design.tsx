'use client';

/**
 * design.tsx
 * ----------
 * Shared design tokens and primitive components.
 * Uses themeColors prop for dual theme (dark/light) support.
 * Font: var(--font-ibm-plex-mono)
 */

import { useState } from 'react';
import type { ThemeColors } from '../../../themes';

// ── Typography ─────────────────────────────────────────────────────────────
export const css = {
  mono: "var(--font-ibm-plex-mono)",
  sans: "'DM Sans', system-ui, sans-serif",
} as const;

// ── Types ──────────────────────────────────────────────────────────────────
export type BtnVariant   = 'primary' | 'secondary' | 'ghost' | 'danger';
export type BtnSize      = 'sm' | 'md';
export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

// ── Badge ──────────────────────────────────────────────────────────────────
export function Badge({
  children,
  variant = 'neutral',
  themeColors,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  themeColors: ThemeColors;
}) {
  const map: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
    neutral: { bg: themeColors.bgTertiary, color: themeColors.textTertiary, border: themeColors.borderColor },
    success: { bg: themeColors.successBg, color: themeColors.accentGreen, border: themeColors.accentGreen },
    warning: { bg: themeColors.warningBg, color: themeColors.accentYellow, border: themeColors.accentYellow },
    danger:  { bg: themeColors.errorBg, color: themeColors.accentRed, border: themeColors.accentRed },
    info:    { bg: themeColors.bgSecondary, color: themeColors.accentBlue, border: themeColors.accentBlue },
  };
  const s = map[variant];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0.125rem 0.5rem', fontSize: '0.6875rem', fontFamily: css.mono,
      background: s.bg, border: `1px solid ${s.border}`,
      color: s.color, letterSpacing: 0.2, flexShrink: 0,
    }}>
      {children}
    </span>
  );
}

// ── Btn ────────────────────────────────────────────────────────────────────
export function Btn({
  children,
  variant  = 'secondary',
  size     = 'md',
  onClick,
  disabled,
  type     = 'button',
  style: extra,
  themeColors,
}: {
  children:  React.ReactNode;
  variant?:  BtnVariant;
  size?:     BtnSize;
  onClick?:  () => void;
  disabled?: boolean;
  type?:     'button' | 'submit';
  style?:    React.CSSProperties;
  themeColors: ThemeColors;
}) {
  const pad = size === 'sm' ? '0.3125rem 0.6875rem' : '0.5rem 0.9375rem';
  const fz  = size === 'sm' ? '0.75rem' : '0.8125rem';
  const map: Record<BtnVariant, { bg: string; color: string; border: string; hover: string }> = {
    primary:   { bg: themeColors.accentBlue, color: '#fff', border: themeColors.accentBlue, hover: '#2563eb' },
    secondary: { bg: themeColors.bgTertiary, color: themeColors.textSecondary, border: themeColors.borderColor, hover: themeColors.bgSecondary },
    ghost:     { bg: 'transparent', color: themeColors.textTertiary, border: 'transparent', hover: themeColors.bgTertiary },
    danger:    { bg: themeColors.errorBg, color: themeColors.accentRed, border: themeColors.accentRed, hover: '#7f1d1d' },
  };
  const s = map[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: pad, fontFamily: css.sans, fontWeight: 500, fontSize: fz,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: `1px solid ${s.border}`,
        background: s.bg, color: s.color,
        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
        transition: 'background 0.1s', flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
        borderRadius: '0.25rem',
        ...extra,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = s.hover; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = s.bg;    }}
    >
      {children}
    </button>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────
export function Input({
  type         = 'text',
  value,
  defaultValue,
  placeholder,
  disabled,
  autoFocus,
  maxLength,
  onChange,
  onKeyDown,
  style: extra,
  themeColors,
}: {
  type?:         string;
  value?:        string;
  defaultValue?: string;
  placeholder?:  string;
  disabled?:     boolean;
  autoFocus?:    boolean;
  maxLength?:    number;
  onChange?:     (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?:    (e: React.KeyboardEvent<HTMLInputElement>) => void;
  style?:        React.CSSProperties;
  themeColors: ThemeColors;
}) {
  const base: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0.6875rem',
    background: disabled ? themeColors.bgPage : themeColors.bgPrimary,
    border: `1px solid ${themeColors.borderColor}`,
    color: disabled ? themeColors.textTertiary : themeColors.textPrimary,
    fontFamily: css.sans, fontSize: '0.8125rem', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
    opacity: disabled ? 0.7 : 1,
    borderRadius: '0.25rem',
    ...extra,
  };

  const controlled = value !== undefined
    ? { value: value ?? '', onChange }
    : { defaultValue };

  return (
    <input
      type={type}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      maxLength={maxLength}
      onKeyDown={onKeyDown}
      style={base}
      onFocus={e => { if (!disabled) e.target.style.borderColor = themeColors.accentBlue; }}
      onBlur={e  => { e.target.style.borderColor = themeColors.borderColor; }}
      {...controlled}
    />
  );
}

// ── Well ───────────────────────────────────────────────────────────────────
export function Well({ children, danger, themeColors }: { children: React.ReactNode; danger?: boolean; themeColors: ThemeColors }) {
  return (
    <div style={{
      background: danger ? themeColors.errorBg : themeColors.bgPrimary,
      border: `1px solid ${danger ? themeColors.accentRed : themeColors.borderColor}`,
      padding: '1rem 1.125rem',
      borderRadius: '0.375rem',
    }}>
      {children}
    </div>
  );
}

// ── Row ────────────────────────────────────────────────────────────────────
export function Row({
  label, description, children, noBorder, themeColors,
}: {
  label:        React.ReactNode;
  description?: React.ReactNode;
  children?:    React.ReactNode;
  noBorder?:    boolean;
  themeColors: ThemeColors;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.8125rem 0',
      borderBottom: noBorder ? 'none' : `1px solid ${themeColors.borderColor}`,
      gap: '1rem',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: css.sans, fontWeight: 500, fontSize: '0.8125rem',
          color: themeColors.textSecondary, marginBottom: description ? '0.125rem' : 0,
        }}>
          {label}
        </p>
        {description && (
          <p style={{ fontFamily: css.sans, fontSize: '0.75rem', color: themeColors.textTertiary }}>
            {description}
          </p>
        )}
      </div>
      {children && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── SectionLabel ───────────────────────────────────────────────────────────
export function SectionLabel({ children, themeColors }: { children: React.ReactNode; themeColors: ThemeColors }) {
  return (
    <p style={{
      fontFamily: css.sans, fontWeight: 500, fontSize: '0.6875rem',
      color: themeColors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7,
      marginBottom: '0.75rem',
    }}>
      {children}
    </p>
  );
}

// ── PageHeader ─────────────────────────────────────────────────────────────
export function PageHeader({
  title, description, action, themeColors,
}: {
  title:       string;
  description: string;
  action?:     React.ReactNode;
  themeColors: ThemeColors;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: '1.625rem',
    }}>
      <div>
        <h2 style={{
          fontFamily: css.sans, fontWeight: 600, fontSize: '1.0625rem',
          color: themeColors.textPrimary, marginBottom: '0.25rem',
        }}>
          {title}
        </h2>
        <p style={{ fontFamily: css.sans, fontSize: '0.8125rem', color: themeColors.textTertiary }}>
          {description}
        </p>
      </div>
      {action && <div style={{ flexShrink: 0, marginTop: '0.125rem' }}>{action}</div>}
    </div>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────
export function Divider({ themeColors }: { themeColors: ThemeColors }) {
  return <div style={{ height: '0.0625rem', background: themeColors.borderColor, margin: '1.5rem 0' }} />;
}

// ── PasswordModal ──────────────────────────────────────────────────────────
export function PasswordModal({
  title,
  subtitle,
  confirmLabel   = 'Continue',
  confirmVariant = 'primary' as BtnVariant,
  onClose,
  onConfirm,
  themeColors,
}: {
  title:           string;
  subtitle?:       string;
  confirmLabel?:   string;
  confirmVariant?: BtnVariant;
  onClose:         () => void;
  onConfirm:       (password: string) => Promise<void>;
  themeColors: ThemeColors;
}) {
  const [val, setVal]         = useState('');
  const [errMsg, setErrMsg]   = useState('');
  const [loading, setLoading] = useState(false);

  const attempt = async () => {
    if (!val.trim()) {
      setErrMsg('Password is required.');
      return;
    }
    setErrMsg('');
    setLoading(true);
    try {
      await onConfirm(val);
      onClose();
    } catch (e) {
      setErrMsg(
        e instanceof Error
          ? e.message
          : 'Verification failed — check your password and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.72)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(0.25rem)',
    }}>
      <div style={{
        width: '26.25rem', background: themeColors.bgSecondary,
        border: `1px solid ${themeColors.borderColor}`,
        boxShadow: '0 2rem 5rem rgba(0,0,0,0.65)',
        borderRadius: '0.5rem',
      }}>
        <div style={{ padding: '1.125rem 1.25rem 0.9375rem', borderBottom: `1px solid ${themeColors.borderColor}` }}>
          <h3 style={{
            fontFamily: css.sans, fontWeight: 600, fontSize: '0.875rem',
            color: themeColors.textPrimary, marginBottom: subtitle ? '0.1875rem' : 0,
          }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ fontFamily: css.sans, fontSize: '0.75rem', color: themeColors.textTertiary }}>{subtitle}</p>
          )}
        </div>

        <div style={{ padding: '1.125rem 1.25rem' }}>
          <label style={{
            display: 'block', fontFamily: css.sans, fontWeight: 500,
            fontSize: '0.75rem', color: themeColors.textSecondary, marginBottom: '0.375rem',
          }}>
            Current password
          </label>

          <Input
            type="password"
            placeholder="Enter your password"
            value={val}
            onChange={e => { setVal(e.target.value); if (errMsg) setErrMsg(''); }}
            onKeyDown={e => { if (e.key === 'Enter' && !loading) attempt(); }}
            autoFocus
            themeColors={themeColors}
            style={{ marginBottom: '0.5rem' }}
          />

          <div style={{ minHeight: '2rem', marginBottom: '0.875rem' }}>
            {errMsg && (
              <p style={{
                fontFamily: css.sans, fontSize: '0.6875rem', color: themeColors.accentRed,
                padding: '0.375rem 0.625rem',
                background: themeColors.errorBg,
                border: `1px solid ${themeColors.accentRed}`,
                borderRadius: '0.25rem',
              }}>
                {errMsg}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Btn onClick={onClose} disabled={loading} themeColors={themeColors}>Cancel</Btn>
            <Btn variant={confirmVariant} onClick={attempt} disabled={loading} themeColors={themeColors}>
              {loading ? 'Verifying…' : confirmLabel}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
