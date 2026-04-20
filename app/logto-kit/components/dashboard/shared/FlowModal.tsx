'use client';

import React, { useState, useEffect } from 'react';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';
import { X, Eye, EyeOff, AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '../../shared/Button';
import { Input } from '../../shared/Input';

export function Overlay({ onDismiss, children }: { onDismiss: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(0.375rem) saturate(0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      {children}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export type PasswordModalStep =
  | { kind: 'password' }
  | { kind: 'loading'; message: string };

export function PasswordVerifyModal({
  title,
  subtitle,
  step,
  onPasswordSubmit,
  onClose,
  passwordError,
  theme,
  t,
  danger,
}: {
  title: string;
  subtitle: string;
  step: PasswordModalStep;
  onPasswordSubmit: (password: string) => void;
  onClose: () => void;
  passwordError?: string;
  theme: ThemeSpec;
  t: Translations;
  danger?: boolean;
}) {
  const c = theme.colors;
  const ty = theme.tokens.typography;
  const T = {
    surface: c.bgSecondary,
    bg: c.bgPrimary,
    border: c.borderColor,
    borderFaint: c.borderColor,
    font: ty.fontSans,
    mono: ty.fontMono,
    text: c.textPrimary,
    sub: c.textSecondary,
    muted: c.textTertiary,
    blue: c.accentBlue,
    red: c.accentRed,
    redText: c.accentRed,
  };

  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const dangerColor = c.accentRed;

  useEffect(() => {
    if (step.kind === 'password') {
      setPw('');
      setShowPw(false);
    }
  }, [step]);

  return (
    <Overlay onDismiss={onClose}>
      <div style={{
        width: '100%', maxWidth: '27.5rem',
        background: T.surface, border: `1px solid ${T.border}`,
        boxShadow: '0 2rem 5rem rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '1.125rem 1.375rem 1rem', borderBottom: `1px solid ${danger ? dangerColor : T.borderFaint}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem',
        }}>
          <div>
            <p style={{ fontFamily: T.font, fontWeight: 600, fontSize: '0.9375rem', color: danger ? dangerColor : T.text, marginBottom: '0.1875rem', letterSpacing: '-0.02em' }}>
              {title}
            </p>
            <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.55 }}>{subtitle}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: '0.125rem', display: 'flex', flexShrink: 0 }}>
            <X size={'0.875rem'} color={T.muted} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.375rem' }}>
          {step.kind === 'password' && (
            <>
              <label style={theme.components.inputs.label}>{t.verification.password}</label>
              <Input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder={t.mfa.enterPasswordPlaceholder}
                autoFocus
                hasError={!!passwordError}
                onKeyDown={(e) => { if (e.key === 'Enter' && pw) onPasswordSubmit(pw); }}
                theme={theme}
                suffix={
                  <button onClick={() => setShowPw(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, display: 'flex', padding: 0 }}>
                    {showPw ? <EyeOff size={'0.875rem'} color={T.muted} strokeWidth={1.5} /> : <Eye size={'0.875rem'} color={T.muted} strokeWidth={1.5} />}
                  </button>
                }
              />
              {passwordError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem', fontFamily: T.font, fontSize: '0.75rem', color: T.redText }}>
                  <AlertTriangle size={'0.8125rem'} color={T.redText} strokeWidth={1.5} /> {passwordError}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.125rem' }}>
                <Button onClick={onClose} theme={theme}>{t.common.close}</Button>
                <Button variant={danger ? 'danger' : 'primary'} onClick={() => pw && onPasswordSubmit(pw)} disabled={!pw} theme={theme}>
                  {t.verification.verifyPassword} <ChevronRight size={'0.75rem'} color={danger ? c.accentRed : c.contrastText} strokeWidth={1.5} />
                </Button>
              </div>
            </>
          )}

          {step.kind === 'loading' && (
            <div style={{ padding: '1.25rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{
                width: '1.875rem', height: '1.875rem', border: `2px solid ${T.border}`,
                borderTopColor: T.blue, borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
              <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub }}>{step.message}</p>
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}
