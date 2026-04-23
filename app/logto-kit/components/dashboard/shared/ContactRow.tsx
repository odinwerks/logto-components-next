'use client';

import React, { useState } from 'react';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';
import { adj } from '../../handlers/theme-helpers';
import { formatPhone } from '../../../logic/formatting';
import type { ModalStep } from './FlowModal';
import { FlowModal } from './FlowModal';
import { Plus, Mail, Phone as PhoneIcon, LucideIcon } from 'lucide-react';
import { Button } from '../../shared/Button';
import { Input } from '../../shared/Input';

function Lbl({ children, theme }: { children: React.ReactNode; theme: ThemeSpec }) {
  const cs = theme.components;
  return <label style={cs.inputs.label}>{children}</label>;
}

export function SL({ children, theme }: { children: React.ReactNode; theme: ThemeSpec }) {
  return <p style={theme.components.text.sectionLabel}>{children}</p>;
}

export function Card({ children, danger, style, theme }: { children: React.ReactNode; danger?: boolean; style?: React.CSSProperties; theme: ThemeSpec }) {
  const c = theme.colors;
  return (
    <div style={{
      background: danger ? c.errorBg : c.bgSecondary,
      border: `1px solid ${danger ? c.accentRed : c.borderColor}`,
      marginBottom: '1rem', overflow: 'hidden',
      boxShadow: theme.tokens.shadows.card,
      ...style,
    }}>
      {children}
    </div>
  );
}

export function HR({ theme }: { theme: ThemeSpec }) {
  return <div style={theme.components.divider} />;
}

export function IconBox({ children, active, color, theme }: { children: React.ReactNode; active?: boolean; color?: 'blue' | 'green' | 'red'; theme: ThemeSpec }) {
  const cs = theme.components;
  const colorMap = { blue: cs.iconBox.blue, green: cs.iconBox.green, red: cs.iconBox.red };
  const s = color ? colorMap[color] : cs.iconBox.base;
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
  onVerifyPassword: (p: string) => Promise<{ verificationRecordId: string }>;
  onSendVerification: (value: string) => Promise<{ verificationId: string }>;
  onVerifyCodeAndUpdate: (value: string, verificationId: string, identityVerificationId: string, code: string) => Promise<void>;
  onRemove: (identityVerificationRecordId: string) => Promise<void>;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  t: Translations;
  theme: ThemeSpec;
}

export function ContactRow({
  label, Icon, currentValue, type, placeholder,
  onVerifyPassword, onSendVerification, onVerifyCodeAndUpdate, onRemove,
  onSuccess, onError, t, theme,
}: ContactRowProps) {
  const c = theme.colors;
  const ty = theme.tokens.typography;
  const T = {
    font: ty.fontSans,
    mono: ty.fontMono,
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
      try {
        const resp = await onVerifyPassword(pw);
        await onRemove(resp.verificationRecordId);
        onSuccess(type === 'email' ? t.profile.emailRemoved : t.profile.phoneRemoved);
        close();
      } catch (err) { onError(err instanceof Error ? err.message : t.profile.updateFailed); close(); }
    } else {
      const target = newValueRef.current.trim();
      if (!target) { setPwErr(t.security.enterValueFirst); return; }
      setStep({ kind: 'loading', message: t.mfa.sendingCode });
      try {
        const identity = await onVerifyPassword(pw);
        const codeResp = await onSendVerification(target);
        onSuccess(`${t.verification.codeSent} ${target}`);
        setStep({ kind: 'code', destination: target, verificationId: codeResp.verificationId, identityVerificationId: identity.verificationRecordId });
      } catch (err) { onError(err instanceof Error ? err.message : t.profile.verificationFailed); close(); }
    }
  };

  const handleCode = async (code: string) => {
    if (step.kind !== 'code') return;
    const { destination, verificationId, identityVerificationId } = step;
    setStep({ kind: 'loading', message: t.mfa.verifyingCode });
    try {
      await onVerifyCodeAndUpdate(destination, verificationId, identityVerificationId, code);
      onSuccess(type === 'email' ? t.profile.emailUpdated : t.profile.phoneUpdated);
      close();
    } catch (err) { onError(err instanceof Error ? err.message : t.profile.updateFailed); close(); }
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
          theme={theme}
          t={t}
          extra={modalKind === 'edit' && step.kind === 'password' ? (
            <div style={{ marginBottom: '1rem' }}>
              <Lbl theme={theme}>{currentValue ? `New ${label.toLowerCase()}` : label}</Lbl>
              <Input
                type={type === 'email' ? 'email' : 'tel'}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={placeholder}
                autoFocus
                theme={theme}
              />
            </div>
          ) : undefined}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <IconBox theme={theme}>
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
              <Button size="sm" onClick={openEdit} theme={theme}>{t.profile.edit}</Button>
              <Button size="sm" variant="danger" onClick={openRemove} theme={theme}>{t.profile.remove}</Button>
            </>
          ) : (
            <Button size="sm" variant="primary" onClick={openEdit} theme={theme}>
              <Plus size={'0.6875rem'} color={c.contrastText} strokeWidth={1.5} /> {t.profile.add}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}