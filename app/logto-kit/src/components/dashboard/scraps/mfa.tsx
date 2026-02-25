'use client';

import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { UserData, MfaVerification, MfaVerificationPayload } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';

interface MfaTabProps {
  userData: UserData;
  themeColors: ThemeColors;
  t: Translations;
  onGetMfaVerifications: () => Promise<MfaVerification[]>;
  onGenerateTotpSecret: () => Promise<{ secret: string; secretQrCode: string }>;
  onAddMfaVerification: (
    verification: MfaVerificationPayload,
    identityVerificationRecordId: string
  ) => Promise<void>;
  onDeleteMfaVerification: (verificationId: string, identityVerificationRecordId: string) => Promise<void>;
  onGenerateBackupCodes: (identityVerificationRecordId: string) => Promise<{ codes: string[] }>;
  onGetBackupCodes: (identityVerificationRecordId: string) => Promise<{ codes: Array<{ code: string; usedAt: string | null }> }>;
  onVerifyPassword: (password: string) => Promise<{ verificationRecordId: string }>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const ISSUER = process.env.NEXT_PUBLIC_MFA_ISSUER || 'Logto';

export function MfaTab({
  userData,
  themeColors,
  t,
  onGetMfaVerifications,
  onGenerateTotpSecret,
  onAddMfaVerification,
  onDeleteMfaVerification,
  onGenerateBackupCodes,
  onGetBackupCodes,
  onVerifyPassword,
  onSuccess,
  onError,
}: MfaTabProps) {
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
  }, [onGetMfaVerifications, onError]);

  useEffect(() => {
    loadMfaVerifications();
  }, [loadMfaVerifications]);

  const handleStartTotpEnrollment = useCallback(() => {
    setMfaVerificationState({
      operation: 'add-totp',
      verificationId: null,
      targetMfaId: null,
      step: 'password',
    });
    setMfaPassword('');
    setTotpSecret(null);
    setTotpVerificationCode('');
  }, []);

  const handleVerifyPasswordForMfa = useCallback(async () => {
    if (!mfaPassword) {
      onError(t.mfa.passwordRequired);
      return;
    }

    setMfaLoading(true);
    try {
      const identityResponse = await onVerifyPassword(mfaPassword);
      const identityId = identityResponse.verificationRecordId;

      if (mfaVerificationState.operation === 'add-totp') {
        const secret = await onGenerateTotpSecret();
        setTotpSecret(secret);
        setMfaVerificationState((prev) => ({
          ...prev,
          verificationId: identityId,
          step: 'complete',
        }));
      } else if (mfaVerificationState.operation === 'generate-backup') {
        const result = await onGenerateBackupCodes(identityId);
        setBackupCodes(result.codes);
        setShowBackupCodes(true);
        setMfaVerificationState((prev) => ({
          ...prev,
          verificationId: identityId,
          step: 'complete',
        }));
        onSuccess(t.mfa.backupCodesGenerated);
      } else if (mfaVerificationState.operation === 'view-backup') {
        const result = await onGetBackupCodes(identityId);
        setBackupCodes(result.codes.map((c) => c.code));
        setShowBackupCodes(true);
        setMfaVerificationState((prev) => ({
          ...prev,
          verificationId: identityId,
          step: 'complete',
        }));
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
  }, [
    mfaPassword,
    mfaVerificationState,
    onVerifyPassword,
    onGenerateTotpSecret,
    onGenerateBackupCodes,
    onGetBackupCodes,
    onDeleteMfaVerification,
    loadMfaVerifications,
    onSuccess,
    onError,
  ]);

  const handleCompleteTotpEnrollment = useCallback(async () => {
    if (!totpSecret || !totpVerificationCode || !mfaVerificationState.verificationId) {
      onError(t.mfa.missingVerification);
      return;
    }

    setMfaLoading(true);
    try {
      await onAddMfaVerification(
        { type: 'Totp', payload: { secret: totpSecret.secret, code: totpVerificationCode } },
        mfaVerificationState.verificationId
      );
      onSuccess(t.mfa.totpEnrolled);
      cancelMfaOperation();
      await loadMfaVerifications();
    } catch (err) {
      onError(err instanceof Error ? err.message : t.mfa.totpVerificationFailed);
    } finally {
      setMfaLoading(false);
    }
  }, [totpSecret, totpVerificationCode, mfaVerificationState.verificationId, onAddMfaVerification, loadMfaVerifications, onSuccess, onError]);

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

  const downloadBackupCodesHtml = useCallback(() => {
    if (!backupCodes) return;
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Backup Codes</title>
  <style>
    body { font-family: monospace; padding: 40px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
    h1 { color: #333; }
    .code { font-size: 18px; padding: 10px; background: #f0f0f0; margin: 5px 0; border-radius: 4px; }
    .warning { color: #d97706; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Backup Codes</h1>
    <p>Save these codes in a secure location. Each code can only be used once.</p>
    ${backupCodes.map((code) => `<div class="code">${code}</div>`).join('')}
    <p class="warning">Generated on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    onSuccess(t.mfa.backupCodesDownloadedHtml);
  }, [backupCodes, onSuccess, t]);

  const formatDate = (date: string) => new Date(date).toLocaleString();

  // Build TOTP URI with givenName from profile
  const getTotpUri = useCallback(() => {
    if (!totpSecret) return '';
    
    // Get givenName from profile, fallback to username, then to 'user'
    const accountName = userData.profile?.givenName 
      || userData.username 
      || 'user';

    return `otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent(accountName)}?secret=${totpSecret.secret}&issuer=${encodeURIComponent(ISSUER)}`;
  }, [totpSecret, userData.profile?.givenName, userData.username]);

  return (
    <div>
      {/* Enrolled MFA Factors */}
      <div
        style={{
          background: themeColors.bgSecondary,
          border: `1px solid ${themeColors.borderColor}`,
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3
            style={{
              margin: 0,
              color: themeColors.textPrimary,
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'var(--font-ibm-plex-mono)',
            }}
          >
            {t.mfa.enrolledFactors}
          </h3>
        </div>

        {mfaLoading && (
          <div style={{ color: themeColors.textSecondary, fontSize: '11px' }}>{t.common.loading}</div>
        )}

        {!mfaLoading && mfaVerifications.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: themeColors.textTertiary, fontSize: '11px' }}>
            {t.mfa.noFactors}
          </div>
        )}

        {!mfaLoading && mfaVerifications.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mfaVerifications.map((mfa) => (
              <div
                key={mfa.id}
                style={{
                  padding: '10px 12px',
                  background: themeColors.bgPrimary,
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div
                    style={{
                      color: themeColors.textPrimary,
                      fontSize: '11px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-ibm-plex-mono)',
                    }}
                  >
                    {mfa.type}
                    {mfa.name && ` - ${mfa.name}`}
                  </div>
                  <div
                    style={{
                      color: themeColors.textTertiary,
                      fontSize: '9px',
                      marginTop: '2px',
                      fontFamily: 'var(--font-ibm-plex-mono)',
                    }}
                  >
                    {t.mfa.created}: {formatDate(mfa.createdAt)}
                    {mfa.lastUsedAt && ` • ${t.mfa.lastUsed}: ${formatDate(mfa.lastUsedAt)}`}
                    {mfa.remainCodes !== undefined && ` • ${t.mfa.codesLeft}: ${mfa.remainCodes}`}
                  </div>
                </div>
                {mfa.type !== 'BackupCode' && (
                  <button
                    onClick={() => {
                      if (confirm(t.mfa.confirmRemoveFactor.replace('${mfa.type}', mfa.type))) {
                        setMfaVerificationState({
                          operation: 'delete-mfa',
                          targetMfaId: mfa.id,
                          verificationId: null,
                          step: 'password',
                        });
                        setMfaPassword('');
                      }
                    }}
                    style={{
                      padding: '4px 10px',
                      background: themeColors.accentRed,
                      color: '#fee2e2',
                      border: `1px solid ${themeColors.accentRed}`,
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontFamily: 'var(--font-ibm-plex-mono)',
                    }}
                  >
                    {t.mfa.remove}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {mfaVerificationState.step === 'password' && mfaVerificationState.operation === 'delete-mfa' && (
          <div style={{ marginTop: '12px', padding: '12px', background: themeColors.bgPrimary, borderRadius: '4px' }}>
            <div
              style={{
                color: themeColors.textSecondary,
                fontSize: '11px',
                marginBottom: '8px',
                fontFamily: 'var(--font-ibm-plex-mono)',
              }}
            >
              {t.mfa.verifyPasswordToRemoveFactor}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="password"
                value={mfaPassword}
                onChange={(e) => setMfaPassword(e.target.value)}
                placeholder={t.mfa.enterPasswordPlaceholder}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: themeColors.bgSecondary,
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '4px',
                  color: themeColors.textPrimary,
                  fontSize: '12px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                }}
              />
              <button
                onClick={handleVerifyPasswordForMfa}
                disabled={mfaLoading}
                style={{
                  padding: '8px 16px',
                  background: themeColors.accentRed,
                  color: '#fee2e2',
                  border: `1px solid ${themeColors.accentRed}`,
                  borderRadius: '4px',
                  cursor: mfaLoading ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                }}
              >
                {mfaLoading ? t.common.loading : t.verification.verifyPassword}
              </button>
              <button
                onClick={cancelMfaOperation}
                style={{
                  padding: '8px 16px',
                  background: themeColors.bgTertiary,
                  color: themeColors.textPrimary,
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                }}
              >
                {t.common.close}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TOTP Enrollment */}
      <div
        style={{
          background: themeColors.bgSecondary,
          border: `1px solid ${themeColors.borderColor}`,
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            margin: '0 0 12px 0',
            color: themeColors.textPrimary,
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'var(--font-ibm-plex-mono)',
          }}
        >
          {t.mfa.totp} {t.mfa.totpDescription}
        </h3>

        {mfaVerificationState.operation === 'add-totp' && mfaVerificationState.step === 'password' && (
          <div>
            <div
              style={{
                color: themeColors.textSecondary,
                fontSize: '11px',
                marginBottom: '8px',
                fontFamily: 'var(--font-ibm-plex-mono)',
              }}
            >
              {t.mfa.verifyPasswordToGenerateTotp}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="password"
                value={mfaPassword}
                onChange={(e) => setMfaPassword(e.target.value)}
                placeholder={t.mfa.enterPasswordPlaceholder}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: themeColors.bgPrimary,
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '4px',
                  color: themeColors.textPrimary,
                  fontSize: '12px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                }}
              />
              <button
                onClick={handleVerifyPasswordForMfa}
                disabled={mfaLoading}
                style={{
                  padding: '8px 16px',
                  background: themeColors.accentYellow,
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: mfaLoading ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                }}
              >
                {mfaLoading ? t.common.loading : t.verification.verifyPassword}
              </button>
              <button
                onClick={cancelMfaOperation}
                style={{
                  padding: '8px 16px',
                  background: themeColors.bgTertiary,
                  color: themeColors.textPrimary,
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                }}
              >
                {t.common.close}
              </button>
            </div>
          </div>
        )}

        {mfaVerificationState.operation === 'add-totp' && mfaVerificationState.step === 'complete' && totpSecret && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  color: themeColors.textSecondary,
                  fontSize: '11px',
                  marginBottom: '8px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                }}
              >
                {t.mfa.scanQrCode}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '12px',
                  background: '#fff',
                  borderRadius: '8px',
                  marginBottom: '12px',
                }}
              >
                <QRCodeSVG 
                  value={getTotpUri()} 
                  size={200} 
                />
              </div>
              <div
                style={{
                  color: themeColors.textTertiary,
                  fontSize: '10px',
                  marginBottom: '12px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                  wordBreak: 'break-all',
                }}
              >
                {t.mfa.cantScan} {t.mfa.enterManually}{' '}
                <code
                  style={{
                    background: themeColors.bgTertiary,
                    padding: '2px 6px',
                    borderRadius: '3px',
                  }}
                >
                  {totpSecret.secret}
                </code>
              </div>
            </div>

            <div>
              <div
                style={{
                  color: themeColors.textSecondary,
                  fontSize: '11px',
                  marginBottom: '8px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                }}
              >
                {t.mfa.enterCodeFromApp}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={totpVerificationCode}
                  onChange={(e) => setTotpVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  placeholder={t.mfa.enterCodePlaceholder}
                  maxLength={6}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: themeColors.bgPrimary,
                    border: `1px solid ${themeColors.borderColor}`,
                    borderRadius: '4px',
                    color: themeColors.textPrimary,
                    fontSize: '14px',
                    fontFamily: 'var(--font-ibm-plex-mono)',
                    letterSpacing: '4px',
                    textAlign: 'center',
                  }}
                />
                <button
                  onClick={handleCompleteTotpEnrollment}
                  disabled={totpVerificationCode.length !== 6 || mfaLoading}
                  style={{
                    padding: '8px 16px',
                    background: '#059669',
                    color: '#fff',
                    border: '1px solid #059669',
                    borderRadius: '4px',
                    cursor: totpVerificationCode.length !== 6 || mfaLoading ? 'not-allowed' : 'pointer',
                    fontSize: '11px',
                    fontFamily: 'var(--font-ibm-plex-mono)',
                    opacity: totpVerificationCode.length !== 6 || mfaLoading ? 0.6 : 1,
                  }}
                >
                  {mfaLoading ? t.common.loading : t.mfa.verifyAndEnroll}
                </button>
                <button
                  onClick={cancelMfaOperation}
                  style={{
                    padding: '8px 16px',
                    background: themeColors.bgTertiary,
                    color: themeColors.textPrimary,
                    border: `1px solid ${themeColors.borderColor}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontFamily: 'var(--font-ibm-plex-mono)',
                  }}
                >
                  {t.common.close}
                </button>
              </div>
            </div>
          </div>
        )}

        {!mfaVerificationState.operation && (
          <button
            onClick={handleStartTotpEnrollment}
            disabled={mfaLoading}
            style={{
              padding: '8px 16px',
              background: themeColors.bgTertiary,
              color: themeColors.textPrimary,
              border: `1px solid ${themeColors.borderColor}`,
              borderRadius: '4px',
              cursor: mfaLoading ? 'not-allowed' : 'pointer',
              fontSize: '11px',
              fontFamily: 'var(--font-ibm-plex-mono)',
            }}
          >
            {t.mfa.generateTotpSecret}
          </button>
        )}
      </div>

      {/* Backup Codes */}
      <div
        style={{
          background: themeColors.bgSecondary,
          border: `1px solid ${themeColors.borderColor}`,
          borderRadius: '6px',
          padding: '16px',
        }}
      >
        <h3
          style={{
            margin: '0 0 12px 0',
            color: themeColors.textPrimary,
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'var(--font-ibm-plex-mono)',
          }}
        >
          {t.mfa.backupCodes}
        </h3>

        {mfaVerificationState.step === 'password' &&
          (mfaVerificationState.operation === 'generate-backup' || mfaVerificationState.operation === 'view-backup') ? (
          <div>
            <div
              style={{
                color: themeColors.textSecondary,
                fontSize: '11px',
                marginBottom: '8px',
                fontFamily: 'var(--font-ibm-plex-mono)',
              }}
            >
              {mfaVerificationState.operation === 'generate-backup' ? t.mfa.verifyPasswordToGenerateBackupCodes : t.mfa.verifyPasswordToViewBackupCodes}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="password"
                value={mfaPassword}
                onChange={(e) => setMfaPassword(e.target.value)}
                placeholder={t.mfa.enterPasswordPlaceholder}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: themeColors.bgPrimary,
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '4px',
                  color: themeColors.textPrimary,
                  fontSize: '12px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                }}
              />
              <button
                onClick={handleVerifyPasswordForMfa}
                disabled={mfaLoading}
                style={{
                  padding: '8px 16px',
                  background: themeColors.accentYellow,
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: mfaLoading ? 'not-allowed' : 'pointer',
                  fontSize: '11px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                }}
              >
                {mfaLoading ? t.common.loading : t.verification.verifyPassword}
              </button>
              <button
                onClick={cancelMfaOperation}
                style={{
                  padding: '8px 16px',
                  background: themeColors.bgTertiary,
                  color: themeColors.textPrimary,
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                }}
              >
                {t.common.close}
              </button>
            </div>
          </div>
        ) : showBackupCodes && backupCodes ? (
          <div>
            <div
              style={{
                background: themeColors.bgPrimary,
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  color: themeColors.textTertiary,
                  fontSize: '10px',
                  marginBottom: '8px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                }}
              >
                {mfaVerificationState.operation === 'generate-backup' ? t.mfa.saveTheseCodes : t.mfa.existingCodes}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {backupCodes.map((code, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontFamily: 'var(--font-ibm-plex-mono)',
                      fontSize: '11px',
                      color: themeColors.textPrimary,
                      padding: '6px 8px',
                      background: themeColors.bgSecondary,
                      borderRadius: '3px',
                      border: `1px solid ${themeColors.borderColor}`,
                    }}
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={downloadBackupCodesTxt}
                style={{
                  padding: '8px 16px',
                  background: themeColors.bgTertiary,
                  color: themeColors.textPrimary,
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                }}
              >
                {t.mfa.downloadTxt}
              </button>
              <button
                onClick={downloadBackupCodesHtml}
                style={{
                  padding: '8px 16px',
                  background: themeColors.bgTertiary,
                  color: themeColors.textPrimary,
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                }}
              >
                {t.mfa.downloadHtml}
              </button>
              <button
                onClick={() => {
                  cancelMfaOperation();
                  if (mfaVerificationState.operation === 'generate-backup') {
                    loadMfaVerifications();
                  }
                }}
                style={{
                  padding: '8px 16px',
                  background:
                    mfaVerificationState.operation === 'generate-backup' ? '#059669' : themeColors.bgTertiary,
                  color: mfaVerificationState.operation === 'generate-backup' ? '#fff' : themeColors.textPrimary,
                  border: `1px solid ${
                    mfaVerificationState.operation === 'generate-backup' ? '#059669' : themeColors.borderColor
                  }`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                }}
              >
                {mfaVerificationState.operation === 'generate-backup' ? t.mfa.finishAndSave : t.mfa.hide}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setBackupCodes(null);
                setShowBackupCodes(false);
                setMfaVerificationState({
                  operation: 'generate-backup',
                  verificationId: null,
                  targetMfaId: null,
                  step: 'password',
                });
                setMfaPassword('');
              }}
              style={{
                padding: '8px 16px',
                background: themeColors.bgTertiary,
                color: themeColors.textPrimary,
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'var(--font-ibm-plex-mono)',
              }}
            >
              {t.mfa.generateNewCodes}
            </button>
            {mfaVerifications.some((v) => v.type === 'BackupCode') && (
              <button
                onClick={() => {
                  setBackupCodes(null);
                  setShowBackupCodes(false);
                  setMfaVerificationState({
                    operation: 'view-backup',
                    verificationId: null,
                    targetMfaId: null,
                    step: 'password',
                  });
                  setMfaPassword('');
                }}
                style={{
                  padding: '8px 16px',
                  background: themeColors.bgSecondary,
                  color: themeColors.textPrimary,
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontFamily: 'var(--font-ibm-plex-mono)',
                }}
              >
                {t.mfa.viewExisting}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}