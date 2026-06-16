'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import { X, Eye, EyeOff, AlertTriangle, ChevronRight, Check, Copy, Download } from 'lucide-react';
import { Button } from '../../shared/Button';
import { Input } from '../../shared/Input';
import { Lbl, HR } from './primitives';

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
    </div>
  );
}

import { useFocusTrap } from './focus-trap';

export type PasswordModalStep =
  | { kind: 'password' }
  | { kind: 'loading'; message: string };

export type ModalStep =
  | { kind: 'value' }
  | { kind: 'password' }
  | { kind: 'loading'; message: string }
  | { kind: 'code'; destination: string; verificationId: string; identityVerificationId: string; verificationTimestamp: number }
  | { kind: 'totp-scan'; secret: string; totpUri: string; identityVerificationId: string; verificationTimestamp: number }
  | { kind: 'new-password'; verificationRecordId: string; verificationTimestamp: number }
  | { kind: 'rename-passkey'; verificationRecordId: string; passkeyId: string; verificationTimestamp: number };

export function PasswordVerifyModal({
  title, subtitle, step, onPasswordSubmit, onClose, passwordError, mode, colors, t, danger,
}: {
  title: string;
  subtitle: string;
  step: PasswordModalStep;
  onPasswordSubmit: (password: string) => void;
  onClose: () => void;
  passwordError?: string;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  danger?: boolean;
}) {
  const c = colors;
  const T = {
    surface: c.bgSecondary,
    bg: c.bgPrimary,
    border: c.borderColor,
    borderFaint: c.borderColor,
    font: "'DM Sans', system-ui, sans-serif",
    mono: "'IBM Plex Mono', 'Courier New', monospace",
    text: c.textPrimary,
    sub: c.textSecondary,
    muted: c.textTertiary,
    blue: c.accentBlue,
    red: c.accentRed,
    redText: c.accentRed,
  };

  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [hidePwErrorWhileTyping, setHidePwErrorWhileTyping] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const pwdErrorId = useId();
  const pwInputId = useId();
  const dangerColor = c.accentRed;
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onClose);

  // Reset "hide while typing" when error prop or step changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on prop change
    setHidePwErrorWhileTyping(false);
  }, [passwordError, step.kind]);

  return (
    <Overlay onDismiss={onClose}>
      <div style={{
        width: '100%', maxWidth: '27.5rem',
        background: T.surface, border: `1px solid ${T.border}`,
        boxShadow: '0 2rem 5rem rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        overflow: 'hidden',
      }} ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <div style={{
          padding: '1.125rem 1.375rem 1rem', borderBottom: `1px solid ${danger ? dangerColor : T.borderFaint}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem',
        }}>
          <div>
            <p id={titleId} style={{ fontFamily: T.font, fontWeight: 600, fontSize: '0.9375rem', color: danger ? dangerColor : T.text, marginBottom: '0.1875rem', letterSpacing: '-0.02em' }}>
              {title}
            </p>
            <p id={descriptionId} style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.55 }}>{subtitle}</p>
          </div>
          <button aria-label="Close dialog" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: '0.125rem', display: 'flex', flexShrink: 0 }}>
            <X size={'0.875rem'} color={T.muted} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.375rem' }}>
          {step.kind === 'password' && (
            <>
              <label htmlFor={pwInputId} style={{ display: 'block', fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontWeight: 500, fontSize: '0.625rem', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4375rem' }}>{t.verification.password}</label>
      <Input
        id={pwInputId}
        type={showPw ? 'text' : 'password'}
        value={pw}
        onChange={(e) => {
          setPw(e.target.value);
          if (passwordError) setHidePwErrorWhileTyping(true);
        }}
        placeholder={t.mfa.enterPasswordPlaceholder}
        autoFocus
        hasError={!!passwordError}
        onKeyDown={(e) => { if (e.key === 'Enter' && pw) onPasswordSubmit(pw); }}
        mode={mode}
        colors={colors}
                describedby={passwordError && !hidePwErrorWhileTyping ? pwdErrorId : undefined}
                suffix={
                  <button
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPw(s => !s)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, display: 'flex', padding: 0 }}
                  >
                    {showPw ? <EyeOff size={'0.875rem'} color={T.muted} strokeWidth={1.5} /> : <Eye size={'0.875rem'} color={T.muted} strokeWidth={1.5} />}
                  </button>
                }
              />
              {passwordError && !hidePwErrorWhileTyping && (
                <div id={pwdErrorId} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem', fontFamily: T.font, fontSize: '0.75rem', color: T.redText }}>
                  <AlertTriangle size={'0.8125rem'} color={T.redText} strokeWidth={1.5} /> {passwordError}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.125rem' }}>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              if (!pw) return;
              setHidePwErrorWhileTyping(false);
              onPasswordSubmit(pw);
            }}
            disabled={!pw}
            mode={mode}
            colors={colors}
          >
            {t.verification.verifyPassword} <ChevronRight size={'0.75rem'} color={danger ? colors.accentRed : colors.contrastText} strokeWidth={1.5} />
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

export function FlowModal({
  title, subtitle, step, onValueSubmit, valueSubmitDisabled, valueSubmitLabel, onPasswordSubmit, onCodeSubmit, onTotpSubmit, onNewPasswordSubmit, onRenamePasskeySubmit, onClose,
  passwordError, extra, headerExtra, hideFooterClose, mode, colors, t, danger, mobmode,
}: {
  title: string;
  subtitle: string;
  step: ModalStep;
  onValueSubmit?: () => void;
  valueSubmitDisabled?: boolean;
  valueSubmitLabel?: string;
  onPasswordSubmit: (password: string) => void;
  onCodeSubmit?: (code: string) => void;
  onTotpSubmit?: (code: string, secret: string, identityVerificationId: string, verificationTimestamp: number) => void;
  onNewPasswordSubmit?: (newPassword: string, verificationRecordId: string, verificationTimestamp: number) => void;
  onRenamePasskeySubmit?: (name: string, passkeyId: string, verificationRecordId: string, verificationTimestamp: number) => void;
  onClose: () => void;
  passwordError?: string;
  extra?: React.ReactNode;
  headerExtra?: React.ReactNode;
  hideFooterClose?: boolean;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  danger?: boolean;
  mobmode?: number;
}) {
  const c = colors;
  const isMobile = mobmode === 1;
  const T = {
    surface: c.bgSecondary,
    bg: c.bgPrimary,
    border: c.borderColor,
    borderFaint: c.borderColor,
    font: "'DM Sans', system-ui, sans-serif",
    mono: "'IBM Plex Mono', 'Courier New', monospace",
    text: c.textPrimary,
    sub: c.textSecondary,
    muted: c.textTertiary,
    blue: c.accentBlue,
    red: c.accentRed,
    redText: c.accentRed,
    redDim: colors.errorBg,
    raised: colors.bgPrimary,
    greenText: colors.accentGreen,
    blueText: colors.accentBlue,
  };
  const [pw, setPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [hidePwErrorWhileTyping, setHidePwErrorWhileTyping] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [code, setCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const titleId = useId();
  const descriptionId = useId();
  const pwdErrorId = useId();
  const pwInputId = useId();
  const codeInputId = useId();
  const totpInputId = useId();
  const newPwInputId = useId();
  const renameInputId = useId();

  const dangerColor = c.accentRed;

  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onClose);

  // Reset "hide while typing" when error prop or step changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on prop change
    setHidePwErrorWhileTyping(false);
  }, [passwordError, step.kind]);

  const copySecret = () => {
    if (step.kind !== 'totp-scan') return;
    navigator.clipboard.writeText(step.secret).then(() => {
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 3000);
    });
  };

  const wide = step.kind === 'totp-scan';

  return (
    <Overlay onDismiss={onClose}>
      <div style={{
        width: '100%', maxWidth: wide ? '35rem' : '27.5rem',
        background: T.surface, border: `1px solid ${T.border}`,
        boxShadow: '0 2rem 5rem rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        overflow: 'hidden',
      }} ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <div style={{
          padding: '1.125rem 1.375rem 1rem', borderBottom: `1px solid ${danger ? dangerColor : T.borderFaint}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.1875rem' }}>
              <p id={titleId} style={{ fontFamily: T.font, fontWeight: 600, fontSize: '0.9375rem', color: danger ? dangerColor : T.text, letterSpacing: '-0.02em', margin: 0 }}>
                {title}
              </p>
              {headerExtra}
            </div>
            <p id={descriptionId} style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.55 }}>{subtitle}</p>
          </div>
          <button aria-label="Close dialog" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: '0.125rem', display: 'flex', flexShrink: 0 }}>
            <X size={'0.875rem'} color={T.muted} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.375rem' }}>

          {step.kind === 'value' && (
            <>
              {extra}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.125rem' }}>
                {!hideFooterClose && (
                  <Button onClick={onClose} mode={mode} colors={colors}>{t.common.close}</Button>
                )}
                <Button
                  variant={danger ? 'danger' : 'primary'}
                  onClick={() => onValueSubmit?.()}
                  disabled={valueSubmitDisabled}
                  mode={mode}
                  colors={colors}
                >
                  {(valueSubmitLabel ?? t.profile.saveChanges)} <ChevronRight size={'0.75rem'} color={danger ? colors.accentRed : colors.contrastText} strokeWidth={1.5} />
                </Button>
              </div>
            </>
          )}

          {step.kind === 'password' && (
            <>
              {extra}
              <Lbl colors={colors} htmlFor={pwInputId}>{t.verification.password}</Lbl>
              <Input
                id={pwInputId}
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  if (passwordError) setHidePwErrorWhileTyping(true);
                }}
                placeholder={t.mfa.enterPasswordPlaceholder}
                autoFocus={!extra}
                hasError={!!passwordError}
                onKeyDown={(e) => { if (e.key === 'Enter' && pw) onPasswordSubmit(pw); }}
                mode={mode} colors={colors}
                describedby={passwordError && !hidePwErrorWhileTyping ? pwdErrorId : undefined}
                suffix={
                  <button
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPw(s => !s)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, display: 'flex', padding: 0 }}
                  >
                    {showPw ? <EyeOff size={'0.875rem'} color={T.muted} strokeWidth={1.5} /> : <Eye size={'0.875rem'} color={T.muted} strokeWidth={1.5} />}
                  </button>
                }
              />
              {passwordError && !hidePwErrorWhileTyping && (
                <div id={pwdErrorId} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem', fontFamily: T.font, fontSize: '0.75rem', color: T.redText }}>
                  <AlertTriangle size={'0.8125rem'} color={T.redText} strokeWidth={1.5} /> {passwordError}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.125rem' }}>
                {!hideFooterClose && (
                  <Button onClick={onClose} mode={mode} colors={colors}>{t.common.close}</Button>
                )}
                <Button
                  variant={danger ? 'danger' : 'primary'}
                  onClick={() => {
                    if (!pw) return;
                    setHidePwErrorWhileTyping(false);
                    onPasswordSubmit(pw);
                  }}
                  disabled={!pw}
                  mode={mode}
                  colors={colors}
                >
                  {t.verification.verifyPassword} <ChevronRight size={'0.75rem'} color={danger ? colors.accentRed : colors.contrastText} strokeWidth={1.5} />
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

          {step.kind === 'code' && (
            <>
              <div style={{ padding: '0.625rem 0.875rem', background: T.bg, border: `1px solid ${T.border}`, marginBottom: '1rem' }}>
                <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.5 }}>
                  {t.verification.codeSent}{' '}
                  <span style={{ fontFamily: T.mono, color: T.text }}>{step.destination}</span>.
                </p>
              </div>
              <Lbl colors={colors} htmlFor={codeInputId}>{t.verification.verificationCode}</Lbl>
              <Input
                id={codeInputId}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) onCodeSubmit?.(code); }}
                mode={mode} colors={colors}
                style={{ fontFamily: T.mono, letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.125rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.125rem' }}>
                {!hideFooterClose && (
                  <Button onClick={onClose} mode={mode} colors={colors}>{t.profile.cancel}</Button>
                )}
                <Button variant="primary" onClick={() => onCodeSubmit?.(code)} disabled={code.length !== 6} mode={mode} colors={colors}>
                  Verify <Check size={'0.75rem'} color={colors.contrastText} strokeWidth={1.5} />
                </Button>
              </div>
            </>
          )}

          {step.kind === 'totp-scan' && (
              <>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '1rem' : '1.25rem' }}>
                  <div role="img" aria-label="TOTP setup QR code — use an authenticator app to scan this code" style={{ background: '#fff', padding: '0.375rem', border: `1px solid ${c.borderColor}`, flexShrink: 0, alignSelf: isMobile ? 'center' : 'flex-start' }}>
                    <QRCodeSVG value={step.totpUri} size={152} />
                  </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                    {!isMobile && (
                      <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.6, marginBottom: '0.75rem' }}>
                        {t.mfa.scanQrCode}
                      </p>
                    )}
                    <p style={{ fontFamily: T.font, fontSize: '0.6875rem', color: T.muted, marginBottom: '0.3125rem' }}>
                      {t.mfa.cantScan} {t.mfa.enterManually}
                    </p>
                    <div style={{ display: 'flex', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
                      <div style={{
                        flex: 1, padding: '0.4375rem 0.625rem', fontFamily: T.mono, fontSize: '0.6875rem',
                        background: T.bg, color: showSecret ? T.text : T.muted,
                        filter: showSecret ? 'none' : 'blur(3px)',
                        userSelect: showSecret ? 'text' : 'none',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        transition: 'filter .2s',
                      }}>
                        {step.secret}
                      </div>
                      <button aria-label={showSecret ? 'Hide secret key' : 'Show secret key'} onClick={() => setShowSecret(s => !s)} style={{
                        padding: '0 0.625rem', background: T.raised, border: 'none',
                        borderLeft: `1px solid ${T.border}`, cursor: 'pointer',
                        color: T.muted, display: 'flex', alignItems: 'center',
                      }}>
                        {showSecret ? <EyeOff size={'0.8125rem'} color={T.muted} strokeWidth={1.5} /> : <Eye size={'0.8125rem'} color={T.muted} strokeWidth={1.5} />}
                      </button>
                      <button aria-label="Copy secret key" onClick={copySecret} style={{
                        padding: '0 0.625rem', background: T.raised, border: 'none',
                        borderLeft: `1px solid ${T.border}`, cursor: 'pointer',
                        color: copied ? T.greenText : T.muted,
                        display: 'flex', alignItems: 'center', transition: 'color .2s',
                      }}>
                        {copied ? <Check size={'0.8125rem'} color={T.greenText} strokeWidth={1.5} /> : <Copy size={'0.8125rem'} color={T.muted} strokeWidth={1.5} />}
                      </button>
                      {copyFailed && <span style={{ fontSize: '0.625rem', color: T.redText, marginLeft: '0.25rem' }}>Copy failed</span>}
                    </div>

                    <HR colors={colors} />
                    <Lbl colors={colors} htmlFor={totpInputId}>{t.verification.totpCodeLabel || '6-digit code from your app'}</Lbl>
                    <Input
                      id={totpInputId}
                      value={code}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setCode(val);
                        if (val.length === 6) {
                          onTotpSubmit?.(val, step.secret, step.identityVerificationId, step.verificationTimestamp);
                        }
                      }}
                      placeholder="000000"
                      maxLength={6}
                      autoFocus
                      mode={mode} colors={colors}
                      style={{ fontFamily: T.mono, letterSpacing: '0.3em', textAlign: 'center', fontSize: isMobile ? '1.5rem' : '1.125rem' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.125rem' }}>
                      {!hideFooterClose && (
                        <Button onClick={onClose} mode={mode} colors={colors}>{t.profile.cancel}</Button>
                      )}
                      <Button variant="primary"
                        onClick={() => onTotpSubmit?.(code, step.secret, step.identityVerificationId, step.verificationTimestamp)}
                        disabled={code.length !== 6} mode={mode} colors={colors}
                      >
                        Activate <Check size={'0.75rem'} color={colors.contrastText} strokeWidth={1.5} />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

          {step.kind === 'new-password' && (
            <>
              <Lbl colors={colors} htmlFor={newPwInputId}>{t.security.password}</Lbl>
              <Input
                id={newPwInputId}
                type={showNewPw ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder={t.security.enterNewPassword}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && newPw) onNewPasswordSubmit?.(newPw, step.verificationRecordId, step.verificationTimestamp); }}
                mode={mode} colors={colors}
                suffix={
                  <button
                    aria-label={showNewPw ? 'Hide password' : 'Show password'}
                    onClick={() => setShowNewPw(s => !s)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, display: 'flex', padding: 0 }}
                  >
                    {showNewPw ? <EyeOff size={'0.875rem'} color={T.muted} strokeWidth={1.5} /> : <Eye size={'0.875rem'} color={T.muted} strokeWidth={1.5} />}
                  </button>
                }
              />
              {passwordError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem', fontFamily: T.font, fontSize: '0.75rem', color: T.redText }}>
                  <AlertTriangle size={'0.8125rem'} color={T.redText} strokeWidth={1.5} /> {passwordError}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.125rem' }}>
                {!hideFooterClose && (
                  <Button onClick={onClose} mode={mode} colors={colors}>{t.profile.cancel}</Button>
                )}
                <Button variant={danger ? 'danger' : 'primary'} onClick={() => newPw && onNewPasswordSubmit?.(newPw, step.verificationRecordId, step.verificationTimestamp)} disabled={!newPw} mode={mode} colors={colors}>
                  {danger ? t.security.deleteAccount : t.security.changePassword} <ChevronRight size={'0.75rem'} color={danger ? colors.accentRed : colors.contrastText} strokeWidth={1.5} />
                </Button>
              </div>
            </>
          )}

          {step.kind === 'rename-passkey' && (
            <>
              <Lbl colors={colors} htmlFor={renameInputId}>{t.mfa.newPasskeyName}</Lbl>
              <Input
                id={renameInputId}
                type="text"
                value={renameVal}
                onChange={(e) => setRenameVal(e.target.value.slice(0, 64))}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && renameVal.trim()) onRenamePasskeySubmit?.(renameVal.trim(), step.passkeyId, step.verificationRecordId, step.verificationTimestamp); }}
                mode={mode} colors={colors}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.125rem' }}>
                {!hideFooterClose && (
                  <Button onClick={onClose} mode={mode} colors={colors}>{t.common.close}</Button>
                )}
                <Button variant="primary" onClick={() => renameVal.trim() && onRenamePasskeySubmit?.(renameVal.trim(), step.passkeyId, step.verificationRecordId, step.verificationTimestamp)} disabled={!renameVal.trim()} mode={mode} colors={colors}>
                  {t.mfa.renamePasskey} <ChevronRight size={'0.75rem'} color={colors.contrastText} strokeWidth={1.5} />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Overlay>
  );
}

export function BackupCodesModal({
  codes, isNew, onDone, onSuccess, t, mode, colors,
}: {
  codes: Array<{ code: string; used: boolean }>;
  isNew: boolean;
  onDone: () => void;
  onSuccess: (msg: string) => void;
  t: Translations;
  mode: 'dark' | 'light';
  colors: ThemeColors;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onDone);

  const c = colors;
  const T = {
    surface: c.bgSecondary,
    bg: c.bgPrimary,
    border: c.borderColor,
    borderFaint: c.borderColor,
    font: "'DM Sans', system-ui, sans-serif",
    mono: "'IBM Plex Mono', 'Courier New', monospace",
    text: c.textPrimary,
    sub: c.textSecondary,
    muted: c.textTertiary,
    amberDim: '#f59e0b1a',
    amberText: c.accentYellow,
    accentYellow: c.accentYellow,
  };

  const dl = (format: 'txt' | 'html') => {
    let content: string;
    let mime: string;
    let ext: string;
    if (format === 'txt') {
      content = codes.map(c => c.code).join('\n');
      mime = 'text/plain'; ext = 'txt';
    } else {
      content = `<!DOCTYPE html><html><head><title>Backup Codes</title>
<style>body{font-family:monospace;padding:40px;background:#0d0d0d;color:#e5e5e5}.w{max-width:560px;margin:0 auto;background:#1a1a1a;padding:28px;border:1px solid #333}h1{font-size:16px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;color:#fff}.s{color:#666;font-size:12px;margin-bottom:20px}.g{display:grid;grid-template-columns:1fr 1fr;gap:8px}.c{padding:9px 12px;background:#111;border:1px solid #2a2a2a;font-size:13px;letter-spacing:.04em}.f{margin-top:20px;color:#444;font-size:11px}</style>
</head><body><div class="w"><h1>Backup codes</h1><p class="s">Each code can only be used once.</p>
<div class="g">${codes.map(c => `<div class="c">${String(c.code).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}</div>`).join('')}</div>
<p class="f">Generated ${new Date().toLocaleString()}</p></div></body></html>`;
      mime = 'text/html'; ext = 'html';
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `backup-codes-${Date.now()}.${ext}`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 150);
    onSuccess(format === 'txt' ? t.mfa.backupCodesDownloaded : t.mfa.backupCodesDownloadedHtml);
  };

  return (
    <Overlay onDismiss={onDone}>
      <div style={{
        width: '100%', maxWidth: '31.25rem', background: T.surface,
        border: `1px solid ${T.border}`,
        boxShadow: '0 2rem 5rem rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }} ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={isNew ? (t.mfa.saveBackupCodes || 'Save your backup codes') : (t.mfa.backupCodesTitle || 'Backup codes')} aria-describedby="backup-codes-desc">
        <div style={{
          padding: '1.125rem 1.375rem 1rem', borderBottom: `1px solid ${T.borderFaint}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontFamily: T.font, fontWeight: 600, fontSize: '0.9375rem', color: T.text, marginBottom: '0.1875rem', letterSpacing: '-0.02em' }}>
              {isNew ? (t.mfa.saveBackupCodes || 'Save your backup codes') : (t.mfa.backupCodesTitle || 'Backup codes')}
            </p>
            <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub }}>
              {isNew ? t.mfa.saveTheseCodes : t.mfa.existingCodes}
            </p>
          </div>
          <button aria-label="Close dialog" onClick={onDone} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: '0.125rem', display: 'flex' }}>
            <X size={'0.875rem'} color={T.muted} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ padding: '1.125rem 1.375rem' }}>
          {isNew && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
              padding: '0.625rem 0.875rem', background: T.amberDim,
              border: `1px solid ${T.accentYellow}44`,
              marginBottom: '1rem',
            }}>
              <AlertTriangle size={'0.875rem'} color={T.amberText} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: '0.0625rem' }} />
              <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.amberText, lineHeight: 1.5 }}>
                {t.mfa.backupCodesWarning}
              </p>
            </div>
          )}

          {codes.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: T.muted, fontFamily: T.mono, fontSize: '0.75rem' }}>
              Loading codes...
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(9.375rem, 1fr))',
              gap: '0.375rem', marginBottom: '1rem',
            }}>
              {codes.map((c) => (
                <div key={c.code} style={{
                  fontFamily: T.mono, fontSize: '0.75rem', color: c.used ? T.muted : T.text,
                  padding: '0.5rem 0.6875rem', background: T.bg,
                  border: `1px solid ${T.border}`, letterSpacing: '0.06em',
                  textDecoration: c.used ? 'line-through' : 'none',
                }}>
                  {c.code}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button size="sm" onClick={() => dl('txt')} mode={mode} colors={colors}><Download size={'0.6875rem'} strokeWidth={1.5} /> .txt</Button>
              <Button size="sm" onClick={() => dl('html')} mode={mode} colors={colors}><Download size={'0.6875rem'} strokeWidth={1.5} /> .html</Button>
            </div>
            <Button variant={isNew ? 'primary' : 'secondary'} onClick={onDone} mode={mode} colors={colors}>
              {isNew ? t.mfa.finishAndSave : t.mfa.hide}
            </Button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
