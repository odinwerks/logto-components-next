'use client';

import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { UserData, MfaVerification, MfaVerificationPayload } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';

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
  onGetMfaVerifications: () => Promise<Array<MfaVerification>>;
  onGenerateTotpSecret: () => Promise<{ secret: string; secretQrCode: string }>;
  onAddMfaVerification: (verification: MfaVerificationPayload, identityVerificationRecordId: string) => Promise<void>;
  onDeleteMfaVerification: (verificationId: string, identityVerificationRecordId: string) => Promise<void>;
  onGenerateBackupCodes: (identityVerificationRecordId: string) => Promise<{ codes: string[] }>;
  onGetBackupCodes: (identityVerificationRecordId: string) => Promise<{ codes: Array<{ code: string; usedAt: string | null }> }>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const ISSUER = process.env.NEXT_PUBLIC_MFA_ISSUER || 'Logto';

function makeTheme(themeColors: ThemeColors) {
  return {
    bg: themeColors.bgPage,
    surface: themeColors.bgSecondary,
    raised: themeColors.bgTertiary,
    border: themeColors.borderColor,
    borderFaint: themeColors.borderColor + '80',
    text: themeColors.textPrimary,
    textSub: themeColors.textSecondary,
    textMuted: themeColors.textTertiary,
    blue: themeColors.accentBlue,
    blueHov: adjustColor(themeColors.accentBlue, -20),
    blueDim: themeColors.warningBg,
    blueEdge: adjustColor(themeColors.accentBlue, -15),
    blueText: adjustColor(themeColors.accentBlue, 30),
    red: themeColors.accentRed,
    redDim: themeColors.errorBg,
    redBorder: adjustColor(themeColors.accentRed, -40) + '40',
    redText: themeColors.accentRed,
    green: themeColors.accentGreen,
    greenDim: themeColors.successBg,
    greenText: adjustColor(themeColors.accentGreen, 20),
    amber: themeColors.accentYellow,
    amberDim: themeColors.warningBg,
    amberText: adjustColor(themeColors.accentYellow, 20),
    font: "'Sora', system-ui, sans-serif",
    mono: "'IBM Plex Mono', monospace",
  };
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const ic = (d: React.ReactNode) => ({ size = 16, color = 'currentColor', strokeWidth = 1.5, style }: { size?: number; color?: string; strokeWidth?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square" strokeLinejoin="miter" style={style}>
    {d}
  </svg>
);

const ICheck = ic(<polyline points="20 6 9 17 4 12" />);
const IX = ic(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>);
const IChevron = ic(<polyline points="9 18 15 12 9 6" />);
const IWarn = ic(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>);
const IKey = ic(<><circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6" /><path d="M15.5 7.5l3 3L22 7l-3-3" /></>);
const ITrash = ic(<><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></>);
const IPlus = ic(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>);
const IEye = ic(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>);
const IEyeOff = ic(<><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>);
const IRefresh = ic(<><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-.18-5.83" /></>);

function Badge({ children, variant = 'neutral', themeColors }: { children: React.ReactNode; variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'; themeColors: ThemeColors }) {
  const T = makeTheme(themeColors);
  const m: Record<string, { bg: string; color: string; border: string }> = {
    neutral: { bg: T.raised, color: T.textSub, border: T.border },
    success: { bg: T.greenDim, color: T.greenText, border: adjustColor(themeColors.accentGreen, -40) + '40' },
    warning: { bg: T.amberDim, color: T.amberText, border: adjustColor(themeColors.accentYellow, -40) + '40' },
    danger: { bg: T.redDim, color: T.redText, border: T.redBorder },
    info: { bg: T.blueDim, color: T.blueText, border: adjustColor(themeColors.accentBlue, -40) + '40' },
  };
  const s = m[variant];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', fontSize: 11, fontFamily: T.mono, background: s.bg, border: `1px solid ${s.border}`, color: s.color, letterSpacing: 0.15, whiteSpace: 'nowrap', lineHeight: '18px' }}>
      {children}
    </span>
  );
}

function Toggle({ checked, onChange, themeColors }: { checked: boolean; onChange: (v: boolean) => void; themeColors: ThemeColors }) {
  const T = makeTheme(themeColors);
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      style={{ width: 38, height: 22, position: 'relative', cursor: 'pointer', flexShrink: 0, background: checked ? T.blue : T.raised, border: `1px solid ${checked ? T.blueEdge : T.border}`, transition: 'background .18s,border-color .18s' }}>
      <span style={{ position: 'absolute', top: 3, left: checked ? 19 : 3, width: 14, height: 14, background: checked ? '#fff' : T.textMuted, transition: 'left .18s,background .18s', display: 'block' }} />
    </button>
  );
}

function Btn({ children, variant = 'secondary', size = 'md', onClick, disabled, style, themeColors }: { children: React.ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-solid'; size?: 'sm' | 'md'; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties; themeColors: ThemeColors }) {
  const T = makeTheme(themeColors);
  const sz = size === 'sm' ? { p: '5px 13px', fs: 12, gap: 5 } : { p: '8px 17px', fs: 13, gap: 7 };
  const vr: Record<string, { bg: string; color: string; bdr: string; sh: string; cls: string }> = {
    primary: { bg: T.blue, color: '#fff', bdr: `1px solid ${T.blueEdge}`, sh: 'inset 0 1px 0 rgba(255,255,255,0.1),0 1px 3px rgba(0,0,0,0.4)', cls: 'bp' },
    secondary: { bg: T.raised, color: T.textSub, bdr: `1px solid ${T.border}`, sh: 'inset 0 1px 0 rgba(255,255,255,0.04),0 1px 2px rgba(0,0,0,0.3)', cls: 'bs' },
    ghost: { bg: 'transparent', color: T.textMuted, bdr: '1px solid transparent', sh: 'none', cls: 'bg' },
    danger: { bg: T.redDim, color: T.redText, bdr: `1px solid ${T.redBorder}`, sh: 'none', cls: 'bd' },
    'danger-solid': { bg: T.red, color: '#fff', bdr: '1px solid #a02828', sh: 'inset 0 1px 0 rgba(255,255,255,0.08)', cls: 'bds' },
  };
  const v = vr[variant];
  return (
    <button onClick={onClick} disabled={disabled} className={v.cls}
      style={{ display: 'inline-flex', alignItems: 'center', gap: sz.gap, padding: sz.p, fontSize: sz.fs, fontFamily: T.font, fontWeight: 500, background: v.bg, color: v.color, border: v.bdr, boxShadow: v.sh, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'background .12s,border-color .12s', letterSpacing: '-0.01em', ...style }}>
      {children}
    </button>
  );
}

function Inp({ type = 'text', value, defaultValue, onChange, placeholder, style: ext, autoFocus, suffix, onKeyDown, themeColors }: { type?: string; value?: string; defaultValue?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; style?: React.CSSProperties; autoFocus?: boolean; suffix?: React.ReactNode; onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void; themeColors: ThemeColors }) {
  const T = makeTheme(themeColors);
  const el = (
    <input type={type} className="fi" defaultValue={defaultValue} value={value} onChange={onChange}
      placeholder={placeholder} autoFocus={autoFocus} onKeyDown={onKeyDown}
      style={{ width: '100%', padding: '9px 12px', background: T.bg, border: `1px solid ${T.border}`, color: T.text, fontFamily: T.font, fontSize: 13, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)', ...ext }} />
  );
  if (!suffix) return el;
  return (
    <div style={{ position: 'relative' }}>
      {el}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, padding: '0 11px', display: 'flex', alignItems: 'center', borderLeft: `1px solid ${T.border}`, background: T.raised }}>
        {suffix}
      </div>
    </div>
  );
}

function Label({ children, themeColors }: { children: React.ReactNode; themeColors: ThemeColors }) {
  const T = makeTheme(themeColors);
  return <label style={{ display: 'block', fontFamily: T.font, fontWeight: 500, fontSize: 12, color: T.textSub, marginBottom: 6 }}>{children}</label>;
}

function SL({ children, themeColors }: { children: React.ReactNode; themeColors: ThemeColors }) {
  const T = makeTheme(themeColors);
  return <p style={{ fontFamily: T.font, fontWeight: 600, fontSize: 10.5, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 12 }}>{children}</p>;
}

function Card({ children, danger, style, themeColors }: { children: React.ReactNode; danger?: boolean; style?: React.CSSProperties; themeColors: ThemeColors }) {
  const T = makeTheme(themeColors);
  return (
    <div style={{ background: danger ? T.redDim : T.surface, border: `1px solid ${danger ? T.redBorder : T.border}`, marginBottom: 16, ...style }}>
      {children}
    </div>
  );
}

function PH({ title, description, action, themeColors }: { title: string; description: string; action?: React.ReactNode; themeColors: ThemeColors }) {
  const T = makeTheme(themeColors);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 26 }}>
      <div>
        <h2 style={{ fontFamily: T.font, fontWeight: 600, fontSize: 18, color: T.text, letterSpacing: '-0.025em', marginBottom: 4 }}>{title}</h2>
        <p style={{ fontFamily: T.font, fontSize: 13, color: T.textSub, lineHeight: 1.55 }}>{description}</p>
      </div>
      {action && <div style={{ flexShrink: 0, marginTop: 2 }}>{action}</div>}
    </div>
  );
}

const HR = ({ themeColors }: { themeColors: ThemeColors }) => {
  const T = makeTheme(themeColors);
  return <div style={{ height: 1, background: T.borderFaint, margin: '22px 0' }} />;
};

type ModalProps = {
  title: string;
  subtitle: string;
  onClose: () => void;
  onConfirm: (password: string) => void;
  error?: string;
  confirmLabel?: string;
  themeColors: ThemeColors;
};

function Modal({ title, subtitle, onClose, onConfirm, error, confirmLabel, themeColors }: ModalProps) {
  const T = makeTheme(themeColors);
  const W = 504;
  const H = 315;
  const H_HEAD = 72;
  const H_FOOT = 64;
  const H_BODY = H - H_HEAD - H_FOOT;

  const [val, setVal] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(false);
  const [shk, setShk] = useState(false);

  const go = () => {
    if (val.length < 1) {
      setErr(true);
      setShk(true);
      setTimeout(() => setShk(false), 450);
      return;
    }
    onConfirm(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') go();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px) saturate(0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'overlayIn .18s ease' }}>
      <div style={{
        width: W, height: H,
        minWidth: W, maxWidth: W,
        minHeight: H, maxHeight: H,
        overflow: 'hidden',
        background: T.surface,
        border: `1px solid ${T.border}`,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 40px 100px rgba(0,0,0,0.75)',
        animation: shk ? 'shake .42s ease' : 'modalIn .22s cubic-bezier(0.32,0.72,0,1)',
      }}>
        <div style={{
          width: W, height: H_HEAD,
          padding: '0 22px',
          borderBottom: `1px solid ${T.borderFaint}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          overflow: 'hidden',
        }}>
          <div>
            <p style={{ fontFamily: T.font, fontWeight: 600, fontSize: 15, color: T.text, letterSpacing: '-0.02em', marginBottom: subtitle ? 3 : 0 }}>{title}</p>
            {subtitle && <p style={{ fontFamily: T.font, fontSize: 12, color: T.textSub, lineHeight: 1.4 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, display: 'flex', padding: 4, flexShrink: 0 }}>
            <IX size={15} />
          </button>
        </div>

        <div style={{
          width: W, height: H_BODY,
          padding: '20px 22px 0',
          overflow: 'hidden',
        }}>
          <Label themeColors={themeColors}>Current password</Label>
          <Inp
            type={show ? 'text' : 'password'}
            value={val}
            onChange={e => { setVal(e.target.value); setErr(false); }}
            placeholder="••••••••••••"
            autoFocus
            themeColors={themeColors}
            style={{ borderColor: err || error ? T.red : undefined, background: err || error ? T.redDim : T.bg }}
            suffix={
              <button onClick={() => setShow(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, display: 'flex', padding: 0 }}>
                {show ? <IEyeOff size={13} /> : <IEye size={13} />}
              </button>
            }
            onKeyDown={handleKeyDown}
          />
          <p style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: T.font, fontSize: 12, color: T.redText,
            marginTop: 8, height: 18,
            visibility: err || error ? 'visible' : 'hidden',
          }}>
            <IWarn size={12} /> {error || 'Incorrect password — try again.'}
          </p>
        </div>

        <div style={{
          width: W, height: 64,
          padding: '0 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
          borderTop: `1px solid ${T.borderFaint}`,
          overflow: 'hidden',
        }}>
          <Btn onClick={onClose} themeColors={themeColors}>Cancel</Btn>
          <Btn variant="primary" onClick={go} themeColors={themeColors}>
            {confirmLabel || 'Continue'} <IChevron size={13} />
          </Btn>
        </div>
      </div>
    </div>
  );
}

type PasswordModalState = {
  open: boolean;
  title: string;
  subtitle: string;
  confirmLabel?: string;
  onConfirm: (password: string) => void;
};

export function SecurityTab({
  userData,
  themeColors,
  t,
  onVerifyPassword,
  onRemoveEmail,
  onRemovePhone,
  onGetMfaVerifications,
  onGenerateTotpSecret,
  onAddMfaVerification,
  onDeleteMfaVerification,
  onGenerateBackupCodes,
  onGetBackupCodes,
  onSuccess,
  onError,
}: SecurityTabProps) {
  const T = makeTheme(themeColors);
  const [mfaVerifications, setMfaVerifications] = useState<MfaVerification[]>([]);
  const [mfaLoading, setMfaLoading] = useState(false);

  const [passwordModal, setPasswordModal] = useState<PasswordModalState>({
    open: false,
    title: '',
    subtitle: '',
    onConfirm: () => {},
  });

  const [mfaVerificationState, setMfaVerificationState] = useState<{
    operation: 'add-totp' | 'delete-mfa' | 'generate-backup' | 'view-backup' | null;
    verificationId: string | null;
    targetMfaId: string | null;
    step: 'password' | 'complete' | null;
  }>({
    operation: null,
    verificationId: null,
    targetMfaId: null,
    step: null,
  });

  const [totpSecret, setTotpSecret] = useState<{ secret: string; secretQrCode: string } | null>(null);
  const [totpVerificationCode, setTotpVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [mfaPassword, setMfaPassword] = useState('');

  const loadMfaVerifications = useCallback(async () => {
    setMfaLoading(true);
    try {
      const verifications = await onGetMfaVerifications();
      setMfaVerifications(verifications);
    } catch (error) {
      onError(error instanceof Error ? error.message : t.mfa.loadFailed);
    } finally {
      setMfaLoading(false);
    }
  }, [onGetMfaVerifications, onError, t.mfa.loadFailed]);

  useEffect(() => { loadMfaVerifications(); }, [loadMfaVerifications]);

  const openPasswordModal = (title: string, subtitle: string, onConfirm: (password: string) => void, confirmLabel?: string) => {
    setPasswordModal({ open: true, title, subtitle, confirmLabel, onConfirm });
  };

  const handleStartTotpEnrollment = useCallback(() => {
    setMfaVerificationState({ operation: 'add-totp', verificationId: null, targetMfaId: null, step: 'password' });
    setTotpSecret(null);
    setTotpVerificationCode('');
  }, []);

  const handleVerifyPasswordForMfa = useCallback(async (password: string) => {
    setMfaLoading(true);
    try {
      const identityResponse = await onVerifyPassword(password);
      const identityId = identityResponse.verificationRecordId;

      if (mfaVerificationState.operation === 'add-totp') {
        const secret = await onGenerateTotpSecret();
        setTotpSecret(secret);
        setMfaVerificationState(prev => ({ ...prev, verificationId: identityId, step: 'complete' }));
      } else if (mfaVerificationState.operation === 'generate-backup') {
        const result = await onGenerateBackupCodes(identityId);
        setBackupCodes(result.codes);
        setShowBackupCodes(true);
        setMfaVerificationState(prev => ({ ...prev, verificationId: identityId, step: 'complete' }));
        onSuccess(t.mfa.backupCodesGenerated);
      } else if (mfaVerificationState.operation === 'view-backup') {
        const result = await onGetBackupCodes(identityId);
        setBackupCodes(result.codes.map(c => c.code));
        setShowBackupCodes(true);
        setMfaVerificationState(prev => ({ ...prev, verificationId: identityId, step: 'complete' }));
      } else if (mfaVerificationState.operation === 'delete-mfa' && mfaVerificationState.targetMfaId) {
        await onDeleteMfaVerification(mfaVerificationState.targetMfaId, identityId);
        onSuccess(t.mfa.factorRemoved);
        cancelMfaOperation();
        await loadMfaVerifications();
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : t.mfa.verificationFailed);
      cancelMfaOperation();
    } finally {
      setMfaLoading(false);
    }
  }, [mfaVerificationState, onVerifyPassword, onGenerateTotpSecret, onGenerateBackupCodes, onGetBackupCodes, onDeleteMfaVerification, loadMfaVerifications, onSuccess, onError, t]);

  const handleCompleteTotpEnrollment = useCallback(async () => {
    if (!totpSecret || !totpVerificationCode || !mfaVerificationState.verificationId) { onError(t.mfa.missingVerification); return; }
    setMfaLoading(true);
    try {
      await onAddMfaVerification({ type: 'Totp', payload: { secret: totpSecret.secret, code: totpVerificationCode } }, mfaVerificationState.verificationId);
      onSuccess(t.mfa.totpEnrolled);
      cancelMfaOperation();
      await loadMfaVerifications();
    } catch (err) { onError(err instanceof Error ? err.message : t.mfa.totpVerificationFailed); }
    finally { setMfaLoading(false); }
  }, [totpSecret, totpVerificationCode, mfaVerificationState.verificationId, onAddMfaVerification, loadMfaVerifications, onSuccess, onError, t]);

  const cancelMfaOperation = useCallback(() => {
    setMfaVerificationState({ operation: null, verificationId: null, targetMfaId: null, step: null });
    setMfaPassword('');
    setTotpSecret(null);
    setTotpVerificationCode('');
    setBackupCodes(null);
    setShowBackupCodes(false);
  }, []);

  const downloadBackupCodesTxt = useCallback(() => {
    if (!backupCodes) return;
    const text = backupCodes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onSuccess(t.mfa.backupCodesDownloaded);
  }, [backupCodes, onSuccess, t]);

  const getTotpUri = useCallback(() => {
    if (!totpSecret) return '';
    const accountName = userData.profile?.givenName || userData.username || 'user';
    return `otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent(accountName)}?secret=${totpSecret.secret}&issuer=${encodeURIComponent(ISSUER)}`;
  }, [totpSecret, userData.profile?.givenName, userData.username]);

  const formatDate = (date: string) => new Date(date).toLocaleString();

  const handleRemoveEmail = () => {
    openPasswordModal(
      t.security.removeEmail || 'Remove email',
      t.security.removeEmailConfirm || 'Enter your password to remove this email address.',
      async (password) => {
        try {
          const identityResponse = await onVerifyPassword(password);
          await onRemoveEmail(identityResponse.verificationRecordId);
          onSuccess(t.profile.emailRemoved);
        } catch (err) {
          onError(err instanceof Error ? err.message : t.profile.updateFailed);
        }
      }
    );
  };

  const handleRemovePhone = () => {
    openPasswordModal(
      t.security.removePhone || 'Remove phone',
      t.security.removePhoneConfirm || 'Enter your password to remove this phone number.',
      async (password) => {
        try {
          const identityResponse = await onVerifyPassword(password);
          await onRemovePhone(identityResponse.verificationRecordId);
          onSuccess(t.profile.phoneRemoved);
        } catch (err) {
          onError(err instanceof Error ? err.message : t.profile.updateFailed);
        }
      }
    );
  };

  const handleDeleteMfa = (mfaId: string) => {
    setMfaVerificationState({ operation: 'delete-mfa', targetMfaId: mfaId, verificationId: null, step: 'password' });
  };

  return (
    <div style={{ animation: 'fadeUp .2s ease' }}>
      {passwordModal.open && (
        <Modal
          title={passwordModal.title}
          subtitle={passwordModal.subtitle}
          confirmLabel={passwordModal.confirmLabel}
          onClose={() => setPasswordModal(prev => ({ ...prev, open: false }))}
          onConfirm={(password) => {
            passwordModal.onConfirm(password);
            setPasswordModal(prev => ({ ...prev, open: false }));
          }}
          themeColors={themeColors}
        />
      )}

      <PH title={t.security.title} description={t.security.description} themeColors={themeColors} />

      <SL themeColors={themeColors}>Two-factor authentication</SL>
      <Card style={{ marginBottom: 18 }} themeColors={themeColors}>
        <div style={{ padding: '15px 18px', borderBottom: mfaVerifications.length > 0 ? `1px solid ${T.borderFaint}` : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <p style={{ fontFamily: T.font, fontWeight: 500, fontSize: 13, color: T.text }}>Authenticator app</p>
                {mfaVerifications.length > 0 && <Badge variant="success" themeColors={themeColors}><ICheck size={9} /> Active</Badge>}
              </div>
              <p style={{ fontFamily: T.font, fontSize: 12, color: T.textMuted }}>TOTP via Google Authenticator, Authy, or 1Password.</p>
            </div>
            <Toggle
              checked={mfaVerifications.length > 0}
              onChange={v => {
                if (!v && mfaVerifications.length > 0) {
                  openPasswordModal(
                    'Disable 2FA',
                    'Enter your password to disable two-factor authentication.',
                    async (password) => {
                      await handleVerifyPasswordForMfa(password);
                    }
                  );
                }
              }}
              themeColors={themeColors}
            />
          </div>
        </div>
        {mfaVerifications.length > 0 && (
          <div style={{ padding: '10px 18px', background: T.bg, display: 'flex', gap: 7, borderBottom: `1px solid ${T.borderFaint}` }}>
            <Btn size="sm" variant="secondary" onClick={() => {
              openPasswordModal(
                'View recovery codes',
                'Enter your password to view your backup codes.',
                async (password) => {
                  await handleVerifyPasswordForMfa(password);
                }
              );
            }} themeColors={themeColors}>
              <IKey size={12} /> View recovery codes
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => {
              openPasswordModal(
                'Reconfigure TOTP',
                'Enter your password before setting up a new authenticator.',
                async (password) => {
                  await handleVerifyPasswordForMfa(password);
                }
              );
            }} themeColors={themeColors}>
              <IRefresh size={12} /> Reconfigure
            </Btn>
          </div>
        )}
        <div style={{ padding: '15px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontFamily: T.font, fontWeight: 500, fontSize: 13, color: T.text, marginBottom: 3 }}>SMS backup</p>
              <p style={{ fontFamily: T.font, fontSize: 12, color: T.textMuted }}>Receive a one-time code by text as a fallback.</p>
            </div>
            <Toggle checked={false} onChange={() => {}} themeColors={themeColors} />
          </div>
        </div>
      </Card>

      <SL themeColors={themeColors}>Contact & credentials</SL>
      <Card style={{ marginBottom: 18 }} themeColors={themeColors}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: `1px solid ${T.borderFaint}`, gap: 16 }}>
          <div>
            <p style={{ fontFamily: T.font, fontWeight: 500, fontSize: 13, color: T.text, marginBottom: 3 }}>{t.security.email}</p>
            <p style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>{userData.primaryEmail || t.profile.notSet}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            {userData.primaryEmail ? (
              <>
                <Badge variant="success" themeColors={themeColors}><ICheck size={9} /> Verified</Badge>
                <Btn size="sm" variant="danger" onClick={handleRemoveEmail} themeColors={themeColors}>{t.profile.remove}</Btn>
              </>
            ) : (
              <Btn size="sm" themeColors={themeColors}>{t.profile.add}</Btn>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: `1px solid ${T.borderFaint}`, gap: 16 }}>
          <div>
            <p style={{ fontFamily: T.font, fontWeight: 500, fontSize: 13, color: T.text, marginBottom: 3 }}>{t.security.phone}</p>
            <p style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>{userData.primaryPhone || t.profile.notSet}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            {userData.primaryPhone ? (
              <>
                <Badge variant="success" themeColors={themeColors}><ICheck size={9} /> Verified</Badge>
                <Btn size="sm" variant="danger" onClick={handleRemovePhone} themeColors={themeColors}>{t.profile.remove}</Btn>
              </>
            ) : (
              <Btn size="sm" themeColors={themeColors}>{t.profile.add}</Btn>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', gap: 16 }}>
          <div>
            <p style={{ fontFamily: T.font, fontWeight: 500, fontSize: 13, color: T.text, marginBottom: 3 }}>{t.security.password}</p>
            <p style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>Last changed 34 days ago</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <Btn size="sm" onClick={() => {
              openPasswordModal(
                'Change password',
                'Enter your current password to set a new one.',
                async (password) => {
                  onSuccess('Password change feature coming soon');
                }
              );
            }} themeColors={themeColors}>{t.security.changePassword}</Btn>
          </div>
        </div>
      </Card>

      <SL themeColors={themeColors}>MFA Factors</SL>
      <Card style={{ marginBottom: 18 }} themeColors={themeColors}>
        {mfaLoading && <div style={{ padding: 20, textAlign: 'center', color: T.textMuted, fontSize: 11 }}>{t.common.loading}</div>}
        {!mfaLoading && mfaVerifications.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: T.textMuted, fontSize: 11 }}>{t.mfa.noFactors}</div>}
        {!mfaLoading && mfaVerifications.map(mfa => (
          <div key={mfa.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: `1px solid ${T.borderFaint}` }}>
            <div>
              <div style={{ fontFamily: T.mono, fontWeight: 600, fontSize: 11, color: T.text }}>{mfa.type}{mfa.name && ` - ${mfa.name}`}</div>
              <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textMuted, marginTop: 2 }}>{t.mfa.created}: {formatDate(mfa.createdAt)}</div>
            </div>
            {mfa.type !== 'BackupCode' && (
              <Btn size="sm" variant="danger" onClick={() => handleDeleteMfa(mfa.id)} themeColors={themeColors}>{t.mfa.remove}</Btn>
            )}
          </div>
        ))}
        {mfaVerificationState.step === 'password' && mfaVerificationState.operation === 'delete-mfa' && (
          <div style={{ padding: 12, background: T.bg, borderTop: `1px solid ${T.borderFaint}` }}>
            <p style={{ fontFamily: T.font, fontSize: 11, color: T.textSub, marginBottom: 8 }}>{t.mfa.verifyPasswordToRemoveFactor}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Inp
                type="password"
                placeholder={t.mfa.enterPasswordPlaceholder}
                onChange={(e) => {
                  const password = e.target.value;
                  setMfaPassword(password);
                }}
                style={{ flex: 1 }}
                themeColors={themeColors}
              />
              <Btn variant="danger" onClick={() => handleVerifyPasswordForMfa(mfaPassword)} disabled={mfaLoading} themeColors={themeColors}>{mfaLoading ? t.common.loading : t.verification.verifyPassword}</Btn>
              <Btn onClick={cancelMfaOperation} themeColors={themeColors}>{t.common.close}</Btn>
            </div>
          </div>
        )}
      </Card>

      <SL themeColors={themeColors}>Backup codes</SL>
      <Card style={{ marginBottom: 18 }} themeColors={themeColors}>
        {mfaVerificationState.step === 'password' && (mfaVerificationState.operation === 'generate-backup' || mfaVerificationState.operation === 'view-backup') && (
          <div style={{ padding: 16 }}>
            <p style={{ fontFamily: T.font, fontSize: 11, color: T.textSub, marginBottom: 8 }}>{mfaVerificationState.operation === 'generate-backup' ? t.mfa.verifyPasswordToGenerateBackupCodes : t.mfa.verifyPasswordToViewBackupCodes}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Inp
                type="password"
                placeholder={t.mfa.enterPasswordPlaceholder}
                onChange={(e) => setMfaPassword(e.target.value)}
                style={{ flex: 1 }}
                themeColors={themeColors}
              />
              <Btn variant="primary" onClick={() => handleVerifyPasswordForMfa(mfaPassword)} disabled={mfaLoading} themeColors={themeColors}>{mfaLoading ? t.common.loading : t.verification.verifyPassword}</Btn>
              <Btn onClick={cancelMfaOperation} themeColors={themeColors}>{t.common.close}</Btn>
            </div>
          </div>
        )}
        {showBackupCodes && backupCodes && (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {backupCodes.map((code, idx) => (
                <div key={idx} style={{ fontFamily: T.mono, fontSize: 11, color: T.text, padding: 6, background: T.bg, borderRadius: 3, border: `1px solid ${T.border}` }}>{code}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={downloadBackupCodesTxt} themeColors={themeColors}>{t.mfa.downloadTxt}</Btn>
              <Btn onClick={() => { cancelMfaOperation(); if (mfaVerificationState.operation === 'generate-backup') loadMfaVerifications(); }} themeColors={themeColors}>{mfaVerificationState.operation === 'generate-backup' ? t.mfa.finishAndSave : t.mfa.hide}</Btn>
            </div>
          </div>
        )}
        {!showBackupCodes && !mfaVerificationState.step && (
          <div style={{ padding: 16, display: 'flex', gap: 8 }}>
            <Btn onClick={() => {
              openPasswordModal(
                'Generate backup codes',
                'Enter your password to generate new backup codes.',
                async (password) => {
                  await handleVerifyPasswordForMfa(password);
                }
              );
            }} themeColors={themeColors}>{t.mfa.generateNewCodes}</Btn>
            {mfaVerifications.some(v => v.type === 'BackupCode') && (
              <Btn onClick={() => {
                openPasswordModal(
                  'View backup codes',
                  'Enter your password to view your existing backup codes.',
                  async (password) => {
                    await handleVerifyPasswordForMfa(password);
                  }
                );
              }} themeColors={themeColors}>{t.mfa.viewExisting}</Btn>
            )}
          </div>
        )}
      </Card>

      <Card danger style={{ padding: '16px 20px' }} themeColors={themeColors}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div>
            <p style={{ fontFamily: T.font, fontWeight: 600, fontSize: 13, color: T.redText, marginBottom: 3 }}>Delete account</p>
            <p style={{ fontFamily: T.font, fontSize: 12, color: adjustColor(themeColors.accentRed, 40), lineHeight: 1.55 }}>Permanently removes your account and all associated data. This cannot be undone.</p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <Btn variant="danger" size="sm" onClick={() => {
              openPasswordModal(
                'Delete account',
                'This is permanent. Enter your password to confirm.',
                async (password) => {
                  onSuccess('Delete account feature coming soon');
                },
                'Delete'
              );
            }} themeColors={themeColors}>
              <ITrash size={12} /> Delete account
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
