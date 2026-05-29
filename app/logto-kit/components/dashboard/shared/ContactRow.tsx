'use client';

import React, { useState } from 'react';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import { formatPhone } from '../../../logic/formatting';
import type { ActionResult, DataResult } from '../../../logic/actions/safe';
import type { ModalStep } from './FlowModal';
import { FlowModal } from './FlowModal';
import { Plus, Mail, Phone as PhoneIcon, LucideIcon, Pencil } from 'lucide-react';
import { Button } from '../../shared/Button';
import { Input } from '../../shared/Input';
import { Lbl, SL, Card, HR, IconBox } from './primitives';

// Re-export primitives for backwards compatibility with existing importers
export { SL, Card, HR, IconBox };

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
  mobmode?: number;
  t: Translations;
  mode: 'dark' | 'light';
  colors: ThemeColors;
}

export function ContactRow({
  label, Icon, currentValue, type, placeholder,
  onVerifyPassword, onSendVerification, onVerifyCodeAndUpdate, onRemove,
  onSuccess, onError, mobmode, t, mode, colors,
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

  const isMobile = mobmode === 1;
  const displayValue = type === 'phone' && currentValue
    ? formatPhone(currentValue)
    : currentValue;

  const openEdit = () => { setNewValue(currentValue ?? ''); setPwErr(''); setStep({ kind: 'password' }); setModalKind('edit'); };
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
            : currentValue
              ? (type === 'email' ? t.security.updateEmailTitle : t.security.updatePhoneTitle)
              : (type === 'email' ? t.security.addEmailTitle : t.security.addPhoneTitle)}
          subtitle={modalKind === 'remove'
            ? (type === 'email' ? t.security.removeEmailSubtitle : t.security.removePhoneSubtitle)
            : (type === 'email' ? t.security.updateEmailConfirm : t.security.updatePhoneConfirm)}
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
              <Lbl colors={colors}>{currentValue ? (type === 'email' ? t.security.email : t.security.phone) : label}</Lbl>
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
          headerExtra={modalKind === 'edit' && currentValue && step.kind === 'password' ? (
            <button
              onClick={() => { setModalKind('remove'); setPwErr(''); }}
              style={{
                background: 'none', border: 'none', padding: 0,
                cursor: 'pointer', color: c.accentRed,
                fontWeight: 600, fontSize: '0.75rem',
                fontFamily: T.font, textDecoration: 'underline',
                whiteSpace: 'nowrap',
              }}
            >
              {t.profile.deleteHint}
            </button>
          ) : undefined}
          hideFooterClose={true}
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
        <div style={{ display: 'flex', gap: isMobile ? '0.25rem' : '0.375rem', flexDirection: isMobile ? 'column' : 'row', flexShrink: 0 }}>
          {currentValue ? (
            isMobile ? (
              <button onClick={openEdit} aria-label={t.profile.edit} style={{
                width: '2rem', height: '2rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: c.bgTertiary, border: `1px solid ${c.borderColor}`,
                borderRadius: '0.25rem', cursor: 'pointer', color: c.textSecondary, padding: 0,
              }}>
                <Pencil size={14} strokeWidth={1.5} />
              </button>
            ) : (
              <Button size="sm" onClick={openEdit} mode={mode} colors={colors}>{t.profile.edit}</Button>
            )
          ) : isMobile ? (
            <button onClick={openEdit} aria-label={t.profile.add} style={{
              width: '2rem', height: '2rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: c.accentBlue, border: `1px solid ${c.accentBlue}`,
              borderRadius: '0.25rem', cursor: 'pointer', color: '#fff', padding: 0,
            }}>
              <Plus size={14} strokeWidth={1.5} />
            </button>
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
