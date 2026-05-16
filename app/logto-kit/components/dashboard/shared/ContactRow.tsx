'use client';

import React, { useState } from 'react';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import { formatPhone } from '../../../logic/formatting';
import type { ActionResult, DataResult } from '../../../logic/actions/safe';
import type { ModalStep } from './FlowModal';
import { FlowModal } from './FlowModal';
import { Plus, Mail, Phone as PhoneIcon, LucideIcon } from 'lucide-react';
import { Button } from '../../shared/Button';
import { Input } from '../../shared/Input';

function Lbl({ children, colors }: { children: React.ReactNode; colors: ThemeColors }) {
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

export function IconBox({ children, active, color, mode, colors }: { children: React.ReactNode; active?: boolean; color?: 'blue' | 'green' | 'red'; mode: 'dark' | 'light'; colors: ThemeColors }) {
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

export interface ContactRowProps {
  label: string;
  Icon: LucideIcon;
  currentValue?: string;
  type: 'email' | 'phone';
  placeholder: string;
  onVerifyPassword: (p: string) => Promise<DataResult<{ verificationRecordId: string }>>;
  onSendVerification: (value: string) => Promise<DataResult<{ verificationId: string }>>;
  onVerifyCodeAndUpdate: (value: string, verificationId: string, identityVerificationId: string, code: string) => Promise<ActionResult>;
  onRemove: (identityVerificationRecordId: string) => Promise<ActionResult>;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  t: Translations;
  mode: 'dark' | 'light';
  colors: ThemeColors;
}

export function ContactRow({
  label, Icon, currentValue, type, placeholder,
  onVerifyPassword, onSendVerification, onVerifyCodeAndUpdate, onRemove,
  onSuccess, onError, t, mode, colors,
}: ContactRowProps) {
  const c = colors;
  const T = {
    font: "'DM Sans', system-ui, sans-serif" as const,
    mono: "'IBM Plex Mono', 'Courier New', monospace" as const,
    text: c.textPrimary,
    sub: c.textSecondary,
    muted: c.textTertiary,
  };
  type Kind = 'edit' | 'remove';
  const [modalKind, setModalKind] = useState<Kind | null>(null);
  const [newValue, setNewValue] = useState('');
  const [step, setStep] = useState<ModalStep>({ kind: 'password' });
  const [pwErr, setPwErr] = useState('');
  const newValueRef = React.useRef(newValue);
  newValueRef.current = newValue;

  const displayValue = type === 'phone' && currentValue
    ? formatPhone(currentValue)
    : currentValue;

  const openEdit = () => { setNewValue(currentValue ?? ''); setPwErr(''); setStep({ kind: 'password' }); setModalKind('edit'); };
  const openRemove = () => { setPwErr(''); setStep({ kind: 'password' }); setModalKind('remove'); };
  const close = () => { setModalKind(null); setStep({ kind: 'password' }); setPwErr(''); };

  const handlePassword = async (pw: string) => {
    setPwErr('');
    if (modalKind === 'remove') {
      setStep({ kind: 'loading', message: t.mfa.verifying });
      const r1 = await onVerifyPassword(pw);
      if (!r1.ok) { setPwErr(r1.error); return; }
      const r2 = await onRemove(r1.data.verificationRecordId);
      if (!r2.ok) { onError(r2.error); setStep({ kind: 'password' }); return; }
      onSuccess(type === 'email' ? t.profile.emailRemoved : t.profile.phoneRemoved);
      close();
    } else {
      const target = newValueRef.current.trim();
      if (!target) { setPwErr(t.security.enterValueFirst); return; }
      setStep({ kind: 'loading', message: t.mfa.sendingCode });
      const r1 = await onVerifyPassword(pw);
      if (!r1.ok) { setPwErr(r1.error); return; }
      const r2 = await onSendVerification(target);
      if (!r2.ok) { onError(r2.error); setStep({ kind: 'password' }); return; }
      onSuccess(`${t.verification.codeSent} ${target}`);
      setStep({ kind: 'code', destination: target, verificationId: r2.data.verificationId, identityVerificationId: r1.data.verificationRecordId });
    }
  };

  const handleCode = async (code: string) => {
    if (step.kind !== 'code') return;
    const { destination, verificationId, identityVerificationId } = step;
    setStep({ kind: 'loading', message: t.mfa.verifyingCode });
    const r = await onVerifyCodeAndUpdate(destination, verificationId, identityVerificationId, code);
    if (!r.ok) { onError(r.error); setStep({ kind: 'password' }); return; }
    onSuccess(type === 'email' ? t.profile.emailUpdated : t.profile.phoneUpdated);
    close();
  };

  return (
    <>
      {modalKind && (
        <FlowModal
          title={modalKind === 'remove'
            ? (type === 'email' ? (t.security.removeEmail || 'Remove email') : (t.security.removePhone || 'Remove phone'))
            : (currentValue ? `Update ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`)}
          subtitle={modalKind === 'remove'
            ? `Confirm your password to remove this ${label.toLowerCase()}.`
            : `Enter your new ${label.toLowerCase()}, then confirm your password.`}
          step={step}
          onPasswordSubmit={handlePassword}
          onCodeSubmit={handleCode}
          onClose={close}
          passwordError={pwErr}
          mode={mode}
          colors={colors}
          t={t}
          extra={modalKind === 'edit' && step.kind === 'password' ? (
            <div style={{ marginBottom: '1rem' }}>
              <Lbl colors={colors}>{currentValue ? `New ${label.toLowerCase()}` : label}</Lbl>
              <Input
                type={type === 'email' ? 'email' : 'tel'}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={placeholder}
                autoFocus
                mode={mode}
                colors={colors}
              />
            </div>
          ) : undefined}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <IconBox mode={mode} colors={colors}>
            <Icon size={'0.9375rem'} color={T.muted} strokeWidth={1.5} />
          </IconBox>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: T.font, fontWeight: 500, fontSize: '0.8125rem', color: T.text, marginBottom: '0.0625rem' }}>{label}</p>
            <p style={{ fontFamily: T.mono, fontSize: '0.6875rem', color: currentValue ? T.sub : T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayValue || t.profile.notSet}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
          {currentValue ? (
            <>
              <Button size="sm" onClick={openEdit} mode={mode} colors={colors}>{t.profile.edit}</Button>
              <Button size="sm" variant="danger" onClick={openRemove} mode={mode} colors={colors}>{t.profile.remove}</Button>
            </>
          ) : (
            <Button size="sm" variant="primary" onClick={openEdit} mode={mode} colors={colors}>
              <Plus size={'0.6875rem'} color={c.contrastText} strokeWidth={1.5} /> {t.profile.add}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
