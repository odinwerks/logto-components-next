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

function PageHeader({ title, description, themeColors }: { title: string; description: string; themeColors: ThemeColors }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <h2 style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontWeight: 600, fontSize: 18, color: themeColors.textPrimary, marginBottom: 4 }}>
        {title}
      </h2>
      <p style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontSize: 13, color: themeColors.textSecondary, lineHeight: 1.55 }}>
        {description}
      </p>
    </div>
  );
}

function SectionLabel({ children, themeColors }: { children: React.ReactNode; themeColors: ThemeColors }) {
  return (
    <p style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontWeight: 600, fontSize: 10.5, color: themeColors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 12, marginTop: 24 }}>
      {children}
    </p>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', marginBottom: 16, ...style }}>
      {children}
    </div>
  );
}

function Btn({ children, variant = 'secondary', size = 'md', onClick, disabled, style }: { children: React.ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md'; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties }) {
  const sz = size === 'sm' ? { p: '5px 13px', fs: 12 } : { p: '8px 17px', fs: 13 };
  const vr = { primary: { bg: '#2d5bbf', color: '#fff', border: '#2550aa' }, secondary: { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: 'var(--border)' }, ghost: { bg: 'transparent', color: 'var(--text-tertiary)', border: 'transparent' }, danger: { bg: '#1a0c0c', color: '#b03535', border: '#341414' } };
  const v = vr[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{ display: 'inline-flex', alignItems: 'center', gap: sz.fs < 13 ? 5 : 7, padding: sz.p, fontSize: sz.fs, fontFamily: 'var(--font-ibm-plex-mono)', fontWeight: 500, background: v.bg, color: v.color, border: `1px solid ${v.border}`, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}>
      {children}
    </button>
  );
}

export function SecurityTab({
  userData,
  themeColors,
  t,
  onVerifyPassword,
  onSendEmailVerification,
  onSendPhoneVerification,
  onVerifyCode,
  onUpdateEmail,
  onUpdatePhone,
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
  const [mfaVerifications, setMfaVerifications] = useState<MfaVerification[]>([]);
  const [mfaLoading, setMfaLoading] = useState(false);

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

  const handleStartTotpEnrollment = useCallback(() => {
    setMfaVerificationState({ operation: 'add-totp', verificationId: null, targetMfaId: null, step: 'password' });
    setMfaPassword('');
    setTotpSecret(null);
    setTotpVerificationCode('');
  }, []);

  const handleVerifyPasswordForMfa = useCallback(async () => {
    if (!mfaPassword) { onError(t.mfa.passwordRequired); return; }
    setMfaLoading(true);
    try {
      const identityResponse = await onVerifyPassword(mfaPassword);
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
  }, [mfaPassword, mfaVerificationState, onVerifyPassword, onGenerateTotpSecret, onGenerateBackupCodes, onGetBackupCodes, onDeleteMfaVerification, loadMfaVerifications, onSuccess, onError, t]);

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

  return (
    <div>
      <PageHeader title={t.security.title} description={t.security.description} themeColors={themeColors} />

      {/* Email & Phone */}
      <SectionLabel themeColors={themeColors}>{t.security.contactAndCredentials}</SectionLabel>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: `1px solid ${themeColors.borderColor}` }}>
          <div>
            <p style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontWeight: 500, fontSize: 13, color: themeColors.textPrimary }}>{t.security.email}</p>
            <p style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontSize: 11, color: themeColors.textTertiary }}>{userData.primaryEmail || t.profile.notSet}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {userData.primaryEmail ? (
              <Btn size="sm" variant="danger" onClick={async () => { try { await onRemoveEmail(''); onSuccess(t.profile.emailRemoved); } catch (e) { onError(t.profile.updateFailed); } }}>{t.profile.remove}</Btn>
            ) : <Btn size="sm">{t.profile.add}</Btn>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontWeight: 500, fontSize: 13, color: themeColors.textPrimary }}>{t.security.phone}</p>
            <p style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontSize: 11, color: themeColors.textTertiary }}>{userData.primaryPhone || t.profile.notSet}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {userData.primaryPhone ? (
              <Btn size="sm" variant="danger" onClick={async () => { try { await onRemovePhone(''); onSuccess(t.profile.phoneRemoved); } catch (e) { onError(t.profile.updateFailed); } }}>{t.profile.remove}</Btn>
            ) : <Btn size="sm">{t.profile.add}</Btn>}
          </div>
        </div>
      </Card>

      {/* Password */}
      <SectionLabel themeColors={themeColors}>{t.security.password}</SectionLabel>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontWeight: 500, fontSize: 13, color: themeColors.textPrimary }}>{t.security.password}</p>
            <p style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontSize: 11, color: themeColors.textTertiary }}>{t.security.passwordLastChanged}: 34 days ago</p>
          </div>
          <Btn size="sm">{t.security.changePassword}</Btn>
        </div>
      </Card>

      {/* MFA Factors */}
      <SectionLabel themeColors={themeColors}>{t.mfa.enrolledFactors}</SectionLabel>
      <Card>
        {mfaLoading && <div style={{ padding: 20, textAlign: 'center', color: themeColors.textTertiary, fontSize: 11 }}>{t.common.loading}</div>}
        {!mfaLoading && mfaVerifications.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: themeColors.textTertiary, fontSize: 11 }}>{t.mfa.noFactors}</div>}
        {!mfaLoading && mfaVerifications.map(mfa => (
          <div key={mfa.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderBottom: `1px solid ${themeColors.borderColor}` }}>
            <div>
              <div style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontWeight: 600, fontSize: 11, color: themeColors.textPrimary }}>{mfa.type}{mfa.name && ` - ${mfa.name}`}</div>
              <div style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontSize: 9, color: themeColors.textTertiary, marginTop: 2 }}>{t.mfa.created}: {formatDate(mfa.createdAt)}</div>
            </div>
            {mfa.type !== 'BackupCode' && (
              <Btn size="sm" variant="danger" onClick={() => { if (confirm(t.mfa.confirmRemoveFactor.replace('${mfa.type}', mfa.type))) { setMfaVerificationState({ operation: 'delete-mfa', targetMfaId: mfa.id, verificationId: null, step: 'password' }); setMfaPassword(''); } }}>{t.mfa.remove}</Btn>
            )}
          </div>
        ))}
        {mfaVerificationState.step === 'password' && mfaVerificationState.operation === 'delete-mfa' && (
          <div style={{ padding: 12, background: themeColors.bgPage, borderTop: `1px solid ${themeColors.borderColor}` }}>
            <p style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontSize: 11, color: themeColors.textSecondary, marginBottom: 8 }}>{t.mfa.verifyPasswordToRemoveFactor}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="password" value={mfaPassword} onChange={e => setMfaPassword(e.target.value)} placeholder={t.mfa.enterPasswordPlaceholder} style={{ flex: 1, padding: 8, background: themeColors.bgSecondary, border: `1px solid ${themeColors.borderColor}`, borderRadius: 4, color: themeColors.textPrimary, fontSize: 12, fontFamily: 'var(--font-ibm-plex-mono)' }} />
              <Btn variant="danger" onClick={handleVerifyPasswordForMfa} disabled={mfaLoading}>{mfaLoading ? t.common.loading : t.verification.verifyPassword}</Btn>
              <Btn onClick={cancelMfaOperation}>{t.common.close}</Btn>
            </div>
          </div>
        )}
      </Card>

      {/* TOTP Enrollment */}
      <SectionLabel themeColors={themeColors}>{t.mfa.totp} - {t.mfa.totpDescription}</SectionLabel>
      <Card>
        {mfaVerificationState.operation === 'add-totp' && mfaVerificationState.step === 'password' && (
          <div style={{ padding: 16 }}>
            <p style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontSize: 11, color: themeColors.textSecondary, marginBottom: 8 }}>{t.mfa.verifyPasswordToGenerateTotp}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="password" value={mfaPassword} onChange={e => setMfaPassword(e.target.value)} placeholder={t.mfa.enterPasswordPlaceholder} style={{ flex: 1, padding: 8, background: themeColors.bgPage, border: `1px solid ${themeColors.borderColor}`, borderRadius: 4, color: themeColors.textPrimary, fontSize: 12, fontFamily: 'var(--font-ibm-plex-mono)' }} />
              <Btn variant="primary" onClick={handleVerifyPasswordForMfa} disabled={mfaLoading}>{mfaLoading ? t.common.loading : t.verification.verifyPassword}</Btn>
              <Btn onClick={cancelMfaOperation}>{t.common.close}</Btn>
            </div>
          </div>
        )}
        {mfaVerificationState.operation === 'add-totp' && mfaVerificationState.step === 'complete' && totpSecret && (
          <div style={{ padding: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}><QRCodeSVG value={getTotpUri()} size={180} /></div>
            <p style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontSize: 10, color: themeColors.textTertiary, marginBottom: 12, wordBreak: 'break-all' }}>{t.mfa.cantScan} {t.mfa.enterManually} <code style={{ background: themeColors.bgTertiary, padding: '2px 6px', borderRadius: 3 }}>{totpSecret.secret}</code></p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={totpVerificationCode} onChange={e => setTotpVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))} placeholder={t.mfa.enterCodePlaceholder} maxLength={6} style={{ flex: 1, padding: 8, background: themeColors.bgPage, border: `1px solid ${themeColors.borderColor}`, borderRadius: 4, color: themeColors.textPrimary, fontSize: 14, fontFamily: 'var(--font-ibm-plex-mono)', letterSpacing: 4, textAlign: 'center' }} />
              <Btn variant="primary" onClick={handleCompleteTotpEnrollment} disabled={totpVerificationCode.length !== 6 || mfaLoading}>{mfaLoading ? t.common.loading : t.mfa.verifyAndEnroll}</Btn>
              <Btn onClick={cancelMfaOperation}>{t.common.close}</Btn>
            </div>
          </div>
        )}
        {!mfaVerificationState.operation && <div style={{ padding: 16 }}><Btn onClick={handleStartTotpEnrollment} disabled={mfaLoading}>{t.mfa.generateTotpSecret}</Btn></div>}
      </Card>

      {/* Backup Codes */}
      <SectionLabel themeColors={themeColors}>{t.mfa.backupCodes}</SectionLabel>
      <Card>
        {mfaVerificationState.step === 'password' && (mfaVerificationState.operation === 'generate-backup' || mfaVerificationState.operation === 'view-backup') && (
          <div style={{ padding: 16 }}>
            <p style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontSize: 11, color: themeColors.textSecondary, marginBottom: 8 }}>{mfaVerificationState.operation === 'generate-backup' ? t.mfa.verifyPasswordToGenerateBackupCodes : t.mfa.verifyPasswordToViewBackupCodes}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="password" value={mfaPassword} onChange={e => setMfaPassword(e.target.value)} placeholder={t.mfa.enterPasswordPlaceholder} style={{ flex: 1, padding: 8, background: themeColors.bgPage, border: `1px solid ${themeColors.borderColor}`, borderRadius: 4, color: themeColors.textPrimary, fontSize: 12, fontFamily: 'var(--font-ibm-plex-mono)' }} />
              <Btn variant="primary" onClick={handleVerifyPasswordForMfa} disabled={mfaLoading}>{mfaLoading ? t.common.loading : t.verification.verifyPassword}</Btn>
              <Btn onClick={cancelMfaOperation}>{t.common.close}</Btn>
            </div>
          </div>
        )}
        {showBackupCodes && backupCodes && (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {backupCodes.map((code, idx) => (
                <div key={idx} style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontSize: 11, color: themeColors.textPrimary, padding: 6, background: themeColors.bgPage, borderRadius: 3, border: `1px solid ${themeColors.borderColor}` }}>{code}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={downloadBackupCodesTxt}>{t.mfa.downloadTxt}</Btn>
              <Btn onClick={() => { cancelMfaOperation(); if (mfaVerificationState.operation === 'generate-backup') loadMfaVerifications(); }}>{mfaVerificationState.operation === 'generate-backup' ? t.mfa.finishAndSave : t.mfa.hide}</Btn>
            </div>
          </div>
        )}
        {!showBackupCodes && !mfaVerificationState.step && (
          <div style={{ padding: 16, display: 'flex', gap: 8 }}>
            <Btn onClick={() => { setBackupCodes(null); setShowBackupCodes(false); setMfaVerificationState({ operation: 'generate-backup', verificationId: null, targetMfaId: null, step: 'password' }); setMfaPassword(''); }}>{t.mfa.generateNewCodes}</Btn>
            {mfaVerifications.some(v => v.type === 'BackupCode') && (
              <Btn onClick={() => { setBackupCodes(null); setShowBackupCodes(false); setMfaVerificationState({ operation: 'view-backup', verificationId: null, targetMfaId: null, step: 'password' }); setMfaPassword(''); }}>{t.mfa.viewExisting}</Btn>
            )}
          </div>
        )}
      </Card>

      {/* Delete Account */}
      <SectionLabel themeColors={themeColors}>{t.security.deleteAccount}</SectionLabel>
      <Card>
        <div style={{ padding: 16 }}>
          <p style={{ fontFamily: 'var(--font-ibm-plex-mono)', fontSize: 12, color: themeColors.textTertiary, marginBottom: 12 }}>{t.security.deleteAccountDescription}</p>
          <Btn variant="danger">{t.security.deleteAccount}</Btn>
        </div>
      </Card>
    </div>
  );
}
