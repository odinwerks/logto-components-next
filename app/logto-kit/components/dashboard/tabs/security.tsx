'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import type { UserData, MfaVerification, MfaVerificationPayload } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import { Check, X, ChevronRight, AlertTriangle, Key, Trash2, Plus, Eye, EyeOff, RefreshCw, Download, Phone, Mail, Shield, Lock, Copy, LucideIcon } from 'lucide-react';

// ─── Props ─────────────────────────────────────────────────────────────────────

interface SecurityTabProps {
  userData: UserData;
  themeColors: ThemeColors;
  t: Translations;
  onVerifyPassword: (password: string) => Promise<{ verificationRecordId: string }>;
  onSendEmailVerification: (email: string) => Promise<{ verificationId: string }>;
  onSendPhoneVerification: (phone: string) => Promise<{ verificationId: string }>;
  onVerifyCode: (type: 'email' | 'phone', value: string, verificationId: string, code: string) => Promise<{ verificationRecordId: string }>;
  onUpdateEmail: (email: string | null, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string) => Promise<void>;
  onUpdatePhone: (phone: string, newIdentifierVerificationRecordId: string, identityVerificationRecordId: string) => Promise<void>;
  onRemoveEmail: (identityVerificationRecordId: string) => Promise<void>;
  onRemovePhone: (identityVerificationRecordId: string) => Promise<void>;
  onGetMfaVerifications: () => Promise<MfaVerification[]>;
  onGenerateTotpSecret: () => Promise<{ secret: string; secretQrCode: string }>;
  onAddMfaVerification: (verification: MfaVerificationPayload, identityVerificationRecordId: string) => Promise<void>;
  onDeleteMfaVerification: (verificationId: string, identityVerificationRecordId: string) => Promise<void>;
  onGenerateBackupCodes: (identityVerificationRecordId: string) => Promise<{ codes: string[] }>;
  onUpdatePassword: (newPassword: string, identityVerificationRecordId: string) => Promise<void>;
  onDeleteAccount: (identityVerificationRecordId: string) => Promise<void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const ISSUER = process.env.NEXT_PUBLIC_MFA_ISSUER || 'Logto';

// ─── Theme ─────────────────────────────────────────────────────────────────────

function adj(hex: string, n: number): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return hex;
  const v = parseInt(c, 16);
  const r = Math.min(255, Math.max(0, (v >> 16) + n));
  const g = Math.min(255, Math.max(0, ((v >> 8) & 0xff) + n));
  const b = Math.min(255, Math.max(0, (v & 0xff) + n));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function tk(tc: ThemeColors) {
  return {
    bg: tc.bgPrimary,
    surface: tc.bgSecondary,
    raised: tc.bgTertiary,
    border: tc.borderColor,
    borderFaint: tc.borderColor + '55',
    text: tc.textPrimary,
    sub: tc.textSecondary,
    muted: tc.textTertiary,
    blue: tc.accentBlue,
    blueEdge: adj(tc.accentBlue, -20),
    blueDim: tc.accentBlue + '1a',
    blueText: tc.accentBlue,
    red: tc.accentRed,
    redDim: tc.accentRed + '1a',
    redBorder: adj(tc.accentRed, -30) + '55',
    redText: tc.accentRed,
    green: tc.accentGreen,
    greenDim: tc.accentGreen + '1a',
    greenText: adj(tc.accentGreen, 30),
    amber: tc.accentYellow,
    amberDim: tc.accentYellow + '1a',
    amberText: adj(tc.accentYellow, -20),
    font: "'Sora', system-ui, sans-serif",
    mono: "'IBM Plex Mono', monospace",
  };
}

// ─── Primitives ────────────────────────────────────────────────────────────────

function Btn({
  children, variant = 'secondary', size = 'md', onClick, disabled, style, tc,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-solid';
  size?: 'sm' | 'md';
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  tc: ThemeColors;
}) {
  const T = tk(tc);
  const sz = size === 'sm' ? { padding: '0.3125rem 0.8125rem', fontSize: '0.6875rem', gap: '0.3125rem' } : { padding: '0.5rem 1.125rem', fontSize: '0.8125rem', gap: '0.4375rem' };
  const V = {
    primary:        { bg: T.raised,  color: T.text,    border: T.border,    shadow: 'none' },
    secondary:      { bg: T.raised,  color: T.text,    border: T.border,    shadow: 'none' },
    ghost:          { bg: 'transparent', color: T.muted, border: 'transparent', shadow: 'none' },
    danger:         { bg: T.redDim,  color: T.redText, border: T.redBorder, shadow: 'none' },
    'danger-solid': { bg: T.red,     color: '#fff',    border: adj(tc.accentRed, -25), shadow: 'none' },
  };
  const v = V[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: sz.gap,
      padding: sz.padding, fontSize: sz.fontSize, fontFamily: T.font,
      fontWeight: 500, letterSpacing: '-0.01em',
      background: v.bg, color: v.color, border: `1px solid ${v.border}`,
      boxShadow: v.shadow, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1, transition: 'opacity .15s',
      flexShrink: 0, ...style,
    }}>
      {children}
    </button>
  );
}

function Inp({
  type = 'text', value, onChange, placeholder, style: ext,
  autoFocus, suffix, onKeyDown, disabled, maxLength, hasError, tc,
}: {
  type?: string; value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; style?: React.CSSProperties;
  autoFocus?: boolean; suffix?: React.ReactNode;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean; maxLength?: number; hasError?: boolean;
  tc: ThemeColors;
}) {
  const T = tk(tc);
  const el = (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      autoFocus={autoFocus} onKeyDown={onKeyDown} disabled={disabled} maxLength={maxLength}
      style={{
        width: '100%', padding: suffix ? '0.5625rem 2.625rem 0.5625rem 0.75rem' : '0.5625rem 0.75rem',
        background: hasError ? T.redDim : disabled ? T.raised : T.bg,
        border: `1px solid ${hasError ? T.red : T.border}`,
        color: T.text, fontFamily: T.font, fontSize: '0.8125rem',
        boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.2)',
        boxSizing: 'border-box', outline: 'none',
        opacity: disabled ? 0.55 : 1,
        transition: 'border-color .15s, background .15s',
        ...ext,
      }}
    />
  );
  if (!suffix) return el;
  return (
    <div style={{ position: 'relative' }}>
      {el}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {suffix}
      </div>
    </div>
  );
}

function Lbl({ children, tc }: { children: React.ReactNode; tc: ThemeColors }) {
  const T = tk(tc);
  return (
    <label style={{
      display: 'block', fontFamily: T.font, fontWeight: 500,
      fontSize: '0.6875rem', color: T.muted, marginBottom: '0.4375rem', letterSpacing: '0.02em',
    }}>
      {children}
    </label>
  );
}

function SL({ children, tc }: { children: React.ReactNode; tc: ThemeColors }) {
  const T = tk(tc);
  return (
    <p style={{
      fontFamily: T.font, fontWeight: 600, fontSize: '0.625rem', color: T.muted,
      textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem',
    }}>
      {children}
    </p>
  );
}

function Card({ children, danger, style, tc }: { children: React.ReactNode; danger?: boolean; style?: React.CSSProperties; tc: ThemeColors }) {
  const T = tk(tc);
  return (
    <div style={{
      background: danger ? T.redDim : T.surface,
      border: `1px solid ${danger ? T.redBorder : T.border}`,
      marginBottom: '1rem', overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function HR({ tc }: { tc: ThemeColors }) {
  return <div style={{ height: 1, background: tk(tc).borderFaint }} />;
}

function IconBox({ children, active, color, tc }: { children: React.ReactNode; active?: boolean; color?: 'blue' | 'green' | 'red'; tc: ThemeColors }) {
  const T = tk(tc);
  const colors = {
    blue:  { bg: T.blueDim,  border: adj(tc.accentBlue, -40) + '44' },
    green: { bg: T.greenDim, border: adj(tc.accentGreen, -40) + '44' },
    red:   { bg: T.redDim,   border: T.redBorder },
  };
  const s = color ? colors[color] : { bg: T.raised, border: T.border };
  return (
    <div style={{
        width: '2.5rem', height: '2.5rem', background: s.bg, border: `1px solid ${s.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {children}
    </div>
  );
}

// ─── Modal overlay wrapper ─────────────────────────────────────────────────────

function Overlay({ onDismiss, children }: { onDismiss: () => void; children: React.ReactNode }) {
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

// ─── Generic flow modal (password → loading → code OR totp-scan) ───────────────

type ModalStep =
  | { kind: 'password' }
  | { kind: 'loading'; message: string }
  | { kind: 'code'; destination: string; verificationId: string; identityVerificationId: string }
  | { kind: 'totp-scan'; secret: string; totpUri: string; identityVerificationId: string }
  | { kind: 'new-password'; verificationRecordId: string };

function FlowModal({
  title, subtitle, step, onPasswordSubmit, onCodeSubmit, onTotpSubmit, onNewPasswordSubmit, onClose,
  passwordError, extra, tc, t, danger,
}: {
  title: string;
  subtitle: string;
  step: ModalStep;
  onPasswordSubmit: (password: string) => void;
  onCodeSubmit?: (code: string) => void;
  onTotpSubmit?: (code: string, secret: string, identityVerificationId: string) => void;
  onNewPasswordSubmit?: (newPassword: string, verificationRecordId: string) => void;
  onClose: () => void;
  passwordError?: string;
  /** Rendered above the password field when step === 'password' */
  extra?: React.ReactNode;
  tc: ThemeColors;
  t: Translations;
  danger?: boolean;
}) {
  const T = tk(tc);
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  const dangerColor = T.red;

  const copySecret = () => {
    if (step.kind !== 'totp-scan') return;
    navigator.clipboard.writeText(step.secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
      }}>
        {/* Header */}
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

        {/* Body */}
        <div style={{ padding: '1.25rem 1.375rem' }}>

          {/* Password step */}
          {step.kind === 'password' && (
            <>
              {extra}
              <Lbl tc={tc}>{t.verification.password}</Lbl>
              <Inp
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder={t.mfa.enterPasswordPlaceholder}
                autoFocus={!extra}
                hasError={!!passwordError}
                onKeyDown={(e) => { if (e.key === 'Enter' && pw) onPasswordSubmit(pw); }}
                tc={tc}
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
                <Btn onClick={onClose} tc={tc}>{t.common.close}</Btn>
                <Btn variant="primary" onClick={() => pw && onPasswordSubmit(pw)} disabled={!pw} tc={tc}>
                  {t.verification.verifyPassword} <ChevronRight size={'0.75rem'} color="#fff" strokeWidth={1.5} />
                </Btn>
              </div>
            </>
          )}

          {/* Loading step */}
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

          {/* Code verification step */}
          {step.kind === 'code' && (
            <>
              <div style={{ padding: '0.625rem 0.875rem', background: T.bg, border: `1px solid ${T.border}`, marginBottom: '1rem' }}>
                <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.5 }}>
                  A 6-digit code was sent to{' '}
                  <span style={{ fontFamily: T.mono, color: T.text }}>{step.destination}</span>.
                </p>
              </div>
              <Lbl tc={tc}>Verification code</Lbl>
              <Inp
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) onCodeSubmit?.(code); }}
                tc={tc}
                style={{ fontFamily: T.mono, letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.125rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.125rem' }}>
                <Btn onClick={onClose} tc={tc}>Cancel</Btn>
                <Btn variant="primary" onClick={() => onCodeSubmit?.(code)} disabled={code.length !== 6} tc={tc}>
                  Verify <Check size={'0.75rem'} color="#fff" strokeWidth={1.5} />
                </Btn>
              </div>
            </>
          )}

          {/* TOTP scan step */}
          {step.kind === 'totp-scan' && (
            <>
              <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.125rem' }}>
                <div style={{ background: '#fff', padding: '0.75rem', border: `1px solid ${T.border}`, flexShrink: 0, alignSelf: 'flex-start' }}>
                  <QRCodeSVG value={step.totpUri} size={140} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.6, marginBottom: '0.75rem' }}>
                    Scan this QR code with your authenticator app, then enter the 6-digit code below to confirm.
                  </p>
                  <p style={{ fontFamily: T.font, fontSize: '0.6875rem', color: T.muted, marginBottom: '0.3125rem' }}>
                    Can't scan? Enter this key manually:
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
                    <button onClick={() => setShowSecret(s => !s)} style={{
                      padding: '0 0.625rem', background: T.raised, border: 'none',
                      borderLeft: `1px solid ${T.border}`, cursor: 'pointer',
                      color: T.muted, display: 'flex', alignItems: 'center',
                    }}>
                      {showSecret ? <EyeOff size={'0.8125rem'} color={T.muted} strokeWidth={1.5} /> : <Eye size={'0.8125rem'} color={T.muted} strokeWidth={1.5} />}
                    </button>
                    <button onClick={copySecret} style={{
                      padding: '0 0.625rem', background: T.raised, border: 'none',
                      borderLeft: `1px solid ${T.border}`, cursor: 'pointer',
                      color: copied ? T.greenText : T.muted,
                      display: 'flex', alignItems: 'center', transition: 'color .2s',
                    }}>
                      {copied ? <Check size={'0.8125rem'} color={T.greenText} strokeWidth={1.5} /> : <Copy size={'0.8125rem'} color={T.muted} strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>
              </div>

              <HR tc={tc} />
              <div style={{ marginTop: '1rem' }}>
                <Lbl tc={tc}>6-digit code from your app</Lbl>
                <Inp
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && code.length === 6)
                      onTotpSubmit?.(code, step.secret, step.identityVerificationId);
                  }}
                  tc={tc}
                  style={{ fontFamily: T.mono, letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.125rem' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.125rem' }}>
                <Btn onClick={onClose} tc={tc}>Cancel</Btn>
                <Btn variant="primary"
                  onClick={() => onTotpSubmit?.(code, step.secret, step.identityVerificationId)}
                  disabled={code.length !== 6} tc={tc}
                >
                  Activate <Check size={'0.75rem'} color="#fff" strokeWidth={1.5} />
                </Btn>
              </div>
            </>
          )}

          {/* New password step */}
          {step.kind === 'new-password' && (
            <>
              <Lbl tc={tc}>New password</Lbl>
              <Inp
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Enter new password"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && pw) onNewPasswordSubmit?.(pw, step.verificationRecordId); }}
                tc={tc}
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
                <Btn onClick={onClose} tc={tc}>Cancel</Btn>
                <Btn variant={danger ? 'danger' : 'primary'} onClick={() => pw && onNewPasswordSubmit?.(pw, step.verificationRecordId)} disabled={!pw} tc={tc}>
                  {danger ? 'Confirm' : 'Change password'} <ChevronRight size={'0.75rem'} color={danger ? '#fff' : '#fff'} strokeWidth={1.5} />
                </Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </Overlay>
  );
}

// ─── Backup codes modal ────────────────────────────────────────────────────────

function BackupCodesModal({
  codes, isNew, onDone, onSuccess, t, tc,
}: {
  codes: Array<{ code: string; used: boolean }>;
  isNew: boolean;
  onDone: () => void;
  onSuccess: (msg: string) => void;
  t: Translations;
  tc: ThemeColors;
}) {
  const T = tk(tc);

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
<div class="g">${codes.map(c => `<div class="c">${c.code}</div>`).join('')}</div>
<p class="f">Generated ${new Date().toLocaleString()}</p></div></body></html>`;
      mime = 'text/html'; ext = 'html';
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `backup-codes-${Date.now()}.${ext}`; a.click();
    URL.revokeObjectURL(url);
    onSuccess(format === 'txt' ? t.mfa.backupCodesDownloaded : t.mfa.backupCodesDownloadedHtml);
  };

  return (
    <Overlay onDismiss={onDone}>
      <div style={{
        width: '100%', maxWidth: '31.25rem', background: T.surface,
        border: `1px solid ${T.border}`,
        boxShadow: '0 2rem 5rem rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '1.125rem 1.375rem 1rem', borderBottom: `1px solid ${T.borderFaint}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontFamily: T.font, fontWeight: 600, fontSize: '0.9375rem', color: T.text, marginBottom: '0.1875rem', letterSpacing: '-0.02em' }}>
              {isNew ? 'Save your backup codes' : 'Backup codes'}
            </p>
            <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub }}>
              {isNew ? t.mfa.saveTheseCodes : t.mfa.existingCodes}
            </p>
          </div>
          <button onClick={onDone} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: '0.125rem', display: 'flex' }}>
            <X size={'0.875rem'} color={T.muted} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ padding: '1.125rem 1.375rem' }}>
          {isNew && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
              padding: '0.625rem 0.875rem', background: T.amberDim,
              border: `1px solid ${adj(tc.accentYellow, -40) + '44'}`,
              marginBottom: '1rem',
            }}>
              <AlertTriangle size={'0.875rem'} color={T.amberText} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: '0.0625rem' }} />
              <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.amberText, lineHeight: 1.5 }}>
                These codes won't be shown again. Download or copy them now.
              </p>
            </div>
          )}

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(9.375rem, 1fr))',
            gap: '0.375rem', marginBottom: '1rem',
          }}>
            {codes.map((c, i) => (
              <div key={i} style={{
                fontFamily: T.mono, fontSize: '0.75rem', color: c.used ? T.muted : T.text,
                padding: '0.5rem 0.6875rem', background: T.bg,
                border: `1px solid ${T.border}`, letterSpacing: '0.06em',
                textDecoration: c.used ? 'line-through' : 'none',
              }}>
                {c.code}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Btn size="sm" onClick={() => dl('txt')} tc={tc}><Download size={'0.6875rem'} strokeWidth={1.5} /> .txt</Btn>
              <Btn size="sm" onClick={() => dl('html')} tc={tc}><Download size={'0.6875rem'} strokeWidth={1.5} /> .html</Btn>
            </div>
            <Btn variant={isNew ? 'primary' : 'secondary'} onClick={onDone} tc={tc}>
              {isNew ? t.mfa.finishAndSave : t.mfa.hide}
            </Btn>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

// ─── Contact row ───────────────────────────────────────────────────────────────

function ContactRow({
  label, Icon, currentValue, type, placeholder,
  onVerifyPassword, onSendVerification, onVerifyCodeAndUpdate, onRemove,
  onSuccess, onError, t, tc,
}: {
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
  tc: ThemeColors;
}) {
  const T = tk(tc);
  type Kind = 'edit' | 'remove';
  const [modalKind, setModalKind] = useState<Kind | null>(null);
  const [newValue, setNewValue] = useState('');
  const [step, setStep] = useState<ModalStep>({ kind: 'password' });
  const [pwErr, setPwErr] = useState('');
  const newValueRef = React.useRef(newValue);
  newValueRef.current = newValue;

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
          tc={tc}
          t={t}
          extra={modalKind === 'edit' && step.kind === 'password' ? (
            <div style={{ marginBottom: '1rem' }}>
              <Lbl tc={tc}>{currentValue ? `New ${label.toLowerCase()}` : label}</Lbl>
              <Inp
                type={type === 'email' ? 'email' : 'tel'}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={placeholder}
                autoFocus
                tc={tc}
              />
            </div>
          ) : undefined}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <IconBox tc={tc}>
            <Icon size={'0.9375rem'} color={T.muted} strokeWidth={1.5} />
          </IconBox>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: T.font, fontWeight: 500, fontSize: '0.8125rem', color: T.text, marginBottom: '0.0625rem' }}>{label}</p>
            <p style={{ fontFamily: T.mono, fontSize: '0.6875rem', color: currentValue ? T.sub : T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentValue || t.profile.notSet}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
          {currentValue ? (
            <>
              <Btn size="sm" onClick={openEdit} tc={tc}>{t.profile.edit}</Btn>
              <Btn size="sm" variant="danger" onClick={openRemove} tc={tc}>{t.profile.remove}</Btn>
            </>
          ) : (
            <Btn size="sm" variant="primary" onClick={openEdit} tc={tc}>
              <Plus size={'0.6875rem'} color="#fff" strokeWidth={1.5} /> {t.profile.add}
            </Btn>
          )}
        </div>
      </div>
    </>
  );
}

// ─── SecurityTab ──────────────────────────────────────────────────────────────

export function SecurityTab({
  userData, themeColors: tc, t,
  onVerifyPassword,
  onSendEmailVerification, onSendPhoneVerification,
  onVerifyCode, onUpdateEmail, onUpdatePhone,
  onRemoveEmail, onRemovePhone,
  onGetMfaVerifications, onGenerateTotpSecret,
  onAddMfaVerification, onDeleteMfaVerification,
  onGenerateBackupCodes,
  onUpdatePassword,
  onDeleteAccount,
  onSuccess, onError,
}: SecurityTabProps) {
  const T = tk(tc);
  const router = useRouter();

  // ── MFA list ──
  const [mfaList, setMfaList] = useState<MfaVerification[]>([]);
  const [mfaLoading, setMfaLoading] = useState(false);

  const loadMfa = useCallback(async () => {
    setMfaLoading(true);
    try { setMfaList(await onGetMfaVerifications()); }
    catch (err) { onError(err instanceof Error ? err.message : t.mfa.loadFailed); }
    finally { setMfaLoading(false); }
  }, [onGetMfaVerifications, onError, t.mfa.loadFailed]);

  useEffect(() => { loadMfa(); }, [loadMfa]);

  const totpFactor   = mfaList.find(v => v.type === 'Totp');
  const backupFactor = mfaList.find(v => v.type === 'BackupCode');

  const fmt = (d: string) => new Date(d).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  // ── TOTP modal ──
  const [totpStep, setTotpStep] = useState<ModalStep | null>(null);
  const [totpPwErr, setTotpPwErr] = useState('');

  const openTotp = () => { setTotpStep({ kind: 'password' }); setTotpPwErr(''); };
  const closeTotp = () => { setTotpStep(null); };

  const handleTotpPassword = async (pw: string) => {
    setTotpPwErr('');
    setTotpStep({ kind: 'loading', message: 'Verifying password…' });
    try {
      const identity = await onVerifyPassword(pw);
      if (totpFactor) {
        setTotpStep({ kind: 'loading', message: 'Removing old authenticator…' });
        await onDeleteMfaVerification(totpFactor.id, identity.verificationRecordId);
      }
      setTotpStep({ kind: 'loading', message: 'Generating secret…' });
      const { secret } = await onGenerateTotpSecret();
      const account = userData.profile?.givenName || userData.username || 'user';
      const totpUri = `otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}`;
      setTotpStep({ kind: 'totp-scan', secret, totpUri, identityVerificationId: identity.verificationRecordId });
    } catch (err) {
      onError(err instanceof Error ? err.message : t.mfa.verificationFailed);
      closeTotp();
    }
  };

  const handleTotpActivate = async (code: string, secret: string, identityVerificationId: string) => {
    setTotpStep({ kind: 'loading', message: 'Activating…' });
    try {
      await onAddMfaVerification({ type: 'Totp', payload: { secret, code } }, identityVerificationId);
      onSuccess(t.mfa.totpEnrolled);
      closeTotp();
      await loadMfa();
    } catch (err) { onError(err instanceof Error ? err.message : t.mfa.totpVerificationFailed); closeTotp(); }
  };

  // ── Delete TOTP modal ──
  const [delTotpStep, setDelTotpStep] = useState<ModalStep | null>(null);

  const openDelTotp = () => setDelTotpStep({ kind: 'password' });
  const closeDelTotp = () => setDelTotpStep(null);

  const handleDelTotpPw = async (pw: string) => {
    if (!totpFactor) return;
    setDelTotpStep({ kind: 'loading', message: 'Removing…' });
    try {
      const identity = await onVerifyPassword(pw);
      await onDeleteMfaVerification(totpFactor.id, identity.verificationRecordId);
      onSuccess(t.mfa.factorRemoved);
      closeDelTotp();
      await loadMfa();
    } catch (err) { onError(err instanceof Error ? err.message : t.mfa.verificationFailed); closeDelTotp(); }
  };

  // ── Backup codes ──
  const [backupStep, setBackupStep] = useState<ModalStep | null>(null);
  const [backupCodes, setBackupCodes] = useState<Array<{ code: string; used: boolean }> | null>(null);

  const openBackup = () => { setBackupStep({ kind: 'password' }); };
  const closeBackupModal = () => setBackupStep(null);
  const closeCodesModal = async () => { setBackupCodes(null); await loadMfa(); };

  const handleBackupPw = async (pw: string) => {
    setBackupStep({ kind: 'loading', message: 'Generating codes…' });
    try {
      const identity = await onVerifyPassword(pw);
      const result = await onGenerateBackupCodes(identity.verificationRecordId);
      setBackupCodes(result.codes.map(code => ({ code, used: false })));
      onSuccess(t.mfa.backupCodesGenerated);
      closeBackupModal();
    } catch (err) { onError(err instanceof Error ? err.message : t.mfa.verificationFailed); closeBackupModal(); }
  };

  // ── Password change modal ──
  const [pwStep, setPwStep] = useState<ModalStep | null>(null);

  // ── Delete account modal ──
  const [deleteStep, setDeleteStep] = useState<ModalStep | null>(null);

  const handleDeleteAccount = async (pw: string) => {
    setDeleteStep({ kind: 'loading', message: t.mfa.verifying });
    try {
      const { verificationRecordId } = await onVerifyPassword(pw);

      // Server action deletes the account and returns cleanly.
      // It no longer calls signOut()/redirect() internally — doing so raced
      // with AuthWatcher's router.refresh() interval and caused a flood of
      // "failed to fetch" errors as the session was torn down mid-flight.
      await onDeleteAccount(verificationRecordId);

      // Navigate client-side to the sign-out route handler.
      // window.location.href (not router.push) because:
      //   - It performs a full page navigation, unloading AuthWatcher so no
      //     more router.refresh() calls fire against a dead session.
      //   - router.push would do a client-side RSC fetch which won't follow
      //     the Logto redirect chain correctly.
      window.location.href = '/api/auth/sign-out';
    } catch (err) {
      onError(err instanceof Error ? err.message : t.mfa.verificationFailed);
      setDeleteStep(null);
    }
  };

  return (
    <div>
      {/* TOTP setup modal */}
      {totpStep && (
        <FlowModal
          title={totpFactor ? t.security.reconfigreAuthenticator : t.mfa.totp}
          subtitle={totpFactor ? t.security.reconfigureAuthenticatorDesc : t.mfa.totpDescription}
          step={totpStep}
          onPasswordSubmit={handleTotpPassword}
          onTotpSubmit={handleTotpActivate}
          onClose={closeTotp}
          passwordError={totpPwErr}
          tc={tc}
          t={t}
        />
      )}

      {/* Delete TOTP modal */}
      {delTotpStep && (
        <FlowModal
          title={t.security.removeAuthenticator}
          subtitle={t.security.removeAuthenticatorDesc}
          step={delTotpStep}
          onPasswordSubmit={handleDelTotpPw}
          onClose={closeDelTotp}
          tc={tc}
          t={t}
        />
      )}

      {/* Backup codes — password modal */}
      {backupStep && (
        <FlowModal
          title={t.security.generateBackupCodesTitle}
          subtitle={t.mfa.verifyPasswordToGenerateBackupCodes}
          step={backupStep}
          onPasswordSubmit={handleBackupPw}
          onClose={closeBackupModal}
          tc={tc}
          t={t}
        />
      )}

      {/* Backup codes — display modal */}
      {backupCodes && (
        <BackupCodesModal
          codes={backupCodes}
          isNew={true}
          onDone={closeCodesModal}
          onSuccess={onSuccess}
          t={t}
          tc={tc}
        />
      )}

      {/* Password change modal */}
      {pwStep && (
        <FlowModal
          title={t.security.changePassword}
          subtitle={pwStep.kind === 'new-password' ? t.security.enterNewPassword : t.security.enterCurrentPassword}
          step={pwStep}
          onPasswordSubmit={async (pw) => {
            setPwStep({ kind: 'loading', message: t.mfa.verifying });
            try {
              const { verificationRecordId } = await onVerifyPassword(pw);
              setPwStep({ kind: 'new-password', verificationRecordId });
            } catch (err) {
              onError(err instanceof Error ? err.message : t.mfa.verificationFailed);
              setPwStep(null);
            }
          }}
          onNewPasswordSubmit={async (newPw, verificationRecordId) => {
            setPwStep({ kind: 'loading', message: t.mfa.changingPassword || 'Changing password...' });
            try {
              await onUpdatePassword(newPw, verificationRecordId);
              onSuccess(t.security.passwordChanged || 'Password changed successfully');
              setPwStep(null);
            } catch (err) {
              onError(err instanceof Error ? err.message : 'Password change failed');
              setPwStep(null);
            }
          }}
          onClose={() => setPwStep(null)}
          tc={tc}
          t={t}
        />
      )}

      {/* Delete account modal */}
      {deleteStep && (
        <FlowModal
          title={t.security.deleteAccount}
          subtitle={t.security.confirmDeleteAccount}
          step={deleteStep}
          onPasswordSubmit={handleDeleteAccount}
          onClose={() => setDeleteStep(null)}
          danger
          tc={tc}
          t={t}
        />
      )}

      {/* ── Page description ── */}
      <div style={{ marginBottom: '1.625rem' }}>
        <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.65 }}>
          {t.security.description}
        </p>
      </div>

      {/* ── Contact & Credentials ── */}
      <SL tc={tc}>Contact &amp; credentials</SL>
      <Card tc={tc}>
        <ContactRow
          label={t.security.email || 'Email address'}
          Icon={Mail}
          currentValue={userData.primaryEmail}
          type="email"
          placeholder={t.profile.emailPlaceholder || 'you@example.com'}
          onVerifyPassword={onVerifyPassword}
          onSendVerification={onSendEmailVerification}
          onVerifyCodeAndUpdate={async (value, verificationId, identityVerificationId, code) => {
            const result = await onVerifyCode('email', value, verificationId, code);
            await onUpdateEmail(value, result.verificationRecordId, identityVerificationId);
          }}
          onRemove={onRemoveEmail}
          onSuccess={onSuccess} onError={onError} t={t} tc={tc}
        />
        <HR tc={tc} />
        <ContactRow
          label={t.security.phone || 'Phone number'}
          Icon={Phone}
          currentValue={userData.primaryPhone}
          type="phone"
          placeholder={t.profile.phonePlaceholder || '+1 555 000 0000'}
          onVerifyPassword={onVerifyPassword}
          onSendVerification={onSendPhoneVerification}
          onVerifyCodeAndUpdate={async (value, verificationId, identityVerificationId, code) => {
            const result = await onVerifyCode('phone', value, verificationId, code);
            await onUpdatePhone(value, result.verificationRecordId, identityVerificationId);
          }}
          onRemove={onRemovePhone}
          onSuccess={onSuccess} onError={onError} t={t} tc={tc}
        />
        <HR tc={tc} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <IconBox tc={tc}><Lock size={'0.9375rem'} color={T.muted} strokeWidth={1.5} /></IconBox>
            <div>
              <p style={{ fontFamily: T.font, fontWeight: 500, fontSize: '0.8125rem', color: T.text, marginBottom: '0.0625rem' }}>
                {t.security.password || 'Password'}
              </p>
              <p style={{ fontFamily: T.mono, fontSize: '0.6875rem', color: T.muted }}>••••••••••••</p>
            </div>
          </div>
          <Btn size="sm" onClick={() => setPwStep({ kind: 'password' })} tc={tc}>
            {t.security.changePassword}
          </Btn>
        </div>
      </Card>

      {/* ── Two-factor authentication ── */}
      <SL tc={tc}>Two-factor authentication</SL>
      <Card tc={tc}>
        <div style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.8125rem', alignItems: 'flex-start' }}>
              <IconBox tc={tc} color={totpFactor ? 'blue' : undefined}>
                <Shield size={'1rem'} color={totpFactor ? T.blueText : T.muted} strokeWidth={1.5} />
              </IconBox>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5625rem', marginBottom: '0.1875rem' }}>
                  <p style={{ fontFamily: T.font, fontWeight: 500, fontSize: '0.8125rem', color: T.text }}>
                    Authenticator app
                  </p>
                  {totpFactor && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      padding: '0.125rem 0.5rem', fontSize: '0.625rem', fontFamily: T.mono,
                      background: T.greenDim, color: T.greenText,
                      border: `1px solid ${adj(tc.accentGreen, -40) + '44'}`,
                      letterSpacing: 0.2,
                    }}>
                      <Check size={'0.5625rem'} color={T.greenText} strokeWidth={1.5} /> Active
                    </span>
                  )}
                </div>
                {totpFactor && (
                  <p style={{ fontFamily: T.mono, fontSize: '0.625rem', color: T.muted, marginTop: '0.3125rem' }}>
                    {t.mfa.created}: {fmt(totpFactor.createdAt)}
                    {totpFactor.lastUsedAt && ` · ${t.mfa.lastUsed}: ${fmt(totpFactor.lastUsedAt)}`}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
              {totpFactor ? (
                <>
                  <Btn size="sm" variant="ghost" onClick={openTotp} tc={tc}>
                    <RefreshCw size={'0.6875rem'} strokeWidth={1.5} /> Reconfigure
                  </Btn>
                  <Btn size="sm" variant="danger" onClick={openDelTotp} tc={tc}>
                    <Trash2 size={'0.6875rem'} strokeWidth={1.5} /> {t.mfa.remove}
                  </Btn>
                </>
              ) : (
                <Btn size="sm" variant="primary" onClick={openTotp} tc={tc}>
                  <Plus size={'0.6875rem'} color="#fff" strokeWidth={1.5} /> {t.mfa.generateTotpSecret}
                </Btn>
              )}
            </div>
          </div>
        </div>

        {mfaLoading && (
          <div style={{ padding: '0.5rem 1.25rem 0.875rem', borderTop: `1px solid ${T.borderFaint}`, fontFamily: T.font, fontSize: '0.75rem', color: T.muted }}>
            {t.common.loading}
          </div>
        )}
      </Card>

      {/* ── Backup codes ── */}
      <SL tc={tc}>Backup codes</SL>
      <Card tc={tc}>
        <div style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.8125rem', alignItems: 'center' }}>
              <IconBox tc={tc} color={backupFactor ? 'green' : undefined}>
                <Key size={'0.9375rem'} color={backupFactor ? T.greenText : T.muted} strokeWidth={1.5} />
              </IconBox>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5625rem', marginBottom: '0.1875rem' }}>
                  <p style={{ fontFamily: T.font, fontWeight: 500, fontSize: '0.8125rem', color: T.text }}>
                    Recovery codes
                  </p>
                  {backupFactor?.remainCodes !== undefined && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      padding: '0.125rem 0.5rem', fontSize: '0.625rem', fontFamily: T.mono,
                      background: T.raised, color: T.sub,
                      border: `1px solid ${T.border}`, letterSpacing: 0.2,
                    }}>
                      {backupFactor.remainCodes} remaining
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.muted, lineHeight: 1.55 }}>
                  Single-use codes for account recovery.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
              <Btn size="sm" onClick={() => openBackup()} tc={tc}>
                <RefreshCw size={'0.6875rem'} strokeWidth={1.5} /> {t.mfa.generateNewCodes}
              </Btn>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Danger zone ── */}
      <div style={{ marginTop: '0.375rem' }}>
        <SL tc={tc}>{t.security.dangerZone}</SL>
        <Card danger tc={tc}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', gap: '1.25rem' }}>
            <div>
              <p style={{ fontFamily: T.font, fontWeight: 600, fontSize: '0.8125rem', color: T.text, marginBottom: '0.125rem' }}>
                {t.security.deleteAccount}
              </p>
              <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.55 }}>
                {t.security.deleteAccountDescription}
              </p>
            </div>
            <Btn variant="danger" size="sm" style={{ flexShrink: 0 }}
              onClick={() => setDeleteStep({ kind: 'password' })} tc={tc}>
              {t.security.deleteAccount}
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  )}