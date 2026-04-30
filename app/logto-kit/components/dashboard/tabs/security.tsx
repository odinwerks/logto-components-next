'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { UserData, MfaVerification, MfaVerificationPayload } from '../../../logic/types';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';
import { adj, tk } from '../../handlers/theme-helpers';
import { Check, X, ChevronRight, AlertTriangle, Key, Trash2, Plus, Eye, EyeOff, RefreshCw, Lock, Shield } from 'lucide-react';
import { Button } from '../../shared/Button';
import { Input } from '../../shared/Input';
import { FlowModal, BackupCodesModal } from '../shared/FlowModal';
import { Card, HR, IconBox, SL } from '../shared/ContactRow';
import { readEnv } from '../../../logic/env';

interface SecurityTabProps {
  userData: UserData;
  theme: ThemeSpec;
  t: Translations;
  onVerifyPassword: (password: string) => Promise<{ verificationRecordId: string }>;
  onGetMfaVerifications: () => Promise<MfaVerification[]>;
  onGenerateTotpSecret: () => Promise<{ secret: string }>;
  onAddMfaVerification: (verification: MfaVerificationPayload, identityVerificationRecordId: string) => Promise<void>;
  onDeleteMfaVerification: (verificationId: string, identityVerificationRecordId: string) => Promise<void>;
  onReplaceTotpVerification: (secret: string, code: string, identityVerificationRecordId: string) => Promise<void>;
  onGenerateBackupCodes: (identityVerificationRecordId: string) => Promise<{ codes: string[] }>;
  onUpdatePassword: (newPassword: string, identityVerificationRecordId: string) => Promise<void>;
  onDeleteAccount: (identityVerificationRecordId: string) => Promise<void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const ISSUER = readEnv('MFA_ISSUER') || 'Logto';

type ModalStep =
  | { kind: 'password' }
  | { kind: 'loading'; message: string }
  | { kind: 'code'; destination: string; verificationId: string; identityVerificationId: string }
  | { kind: 'totp-scan'; secret: string; totpUri: string; identityVerificationId: string }
  | { kind: 'new-password'; verificationRecordId: string };

export function SecurityTab({
  userData, theme, t,
  onVerifyPassword,
  onGetMfaVerifications, onGenerateTotpSecret,
  onAddMfaVerification, onDeleteMfaVerification,
  onReplaceTotpVerification,
  onGenerateBackupCodes,
  onUpdatePassword,
  onDeleteAccount,
  onSuccess, onError,
}: SecurityTabProps) {
  const tc = theme.colors;
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
      if (totpFactor) {
        await onReplaceTotpVerification(secret, code, identityVerificationId);
      } else {
        await onAddMfaVerification({ type: 'Totp', payload: { secret, code } }, identityVerificationId);
      }
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
      await onDeleteAccount(verificationRecordId);
      // Sign-out is POST now (Phase 3); navigate via a programmatic form.
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/auth/sign-out';
      document.body.appendChild(form);
      form.submit();
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
          theme={theme}
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
          theme={theme}
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
          theme={theme}
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
          theme={theme}
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
              onError(err instanceof Error ? err.message : (t.security.passwordChangeFailed || 'Password change failed'));
              setPwStep(null);
            }
          }}
          onClose={() => setPwStep(null)}
          theme={theme}
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
          theme={theme}
          t={t}
        />
      )}

      {/* ── Page description ── */}
      <div style={{ marginBottom: '1.625rem' }}>
        <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.65 }}>
          {t.security.description}
        </p>
      </div>

      {/* ── Password ── */}
      <SL theme={theme}>{t.security.password || 'Password'}</SL>
      <Card theme={theme}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <IconBox theme={theme}><Lock size={'0.9375rem'} color={T.muted} strokeWidth={1.5} /></IconBox>
            <div>
              <p style={{ fontFamily: T.font, fontWeight: 500, fontSize: '0.8125rem', color: T.text, marginBottom: '0.0625rem' }}>
                {t.security.password || 'Password'}
              </p>
              <p style={{ fontFamily: T.mono, fontSize: '0.6875rem', color: T.muted }}>••••••••••••</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setPwStep({ kind: 'password' })} theme={theme}>
            {t.security.changePassword}
          </Button>
        </div>
      </Card>

      {/* ── Two-factor authentication ── */}
      <SL theme={theme}>Two-factor authentication</SL>
      <Card theme={theme}>
        <div style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.8125rem', alignItems: 'flex-start' }}>
              <IconBox theme={theme} color={totpFactor ? 'blue' : undefined}>
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
                  <Button size="sm" variant="ghost" onClick={openTotp} theme={theme}>
                    <RefreshCw size={'0.6875rem'} strokeWidth={1.5} /> Reconfigure
                  </Button>
                  <Button size="sm" variant="danger" onClick={openDelTotp} theme={theme}>
                    <Trash2 size={'0.6875rem'} strokeWidth={1.5} /> {t.mfa.remove}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="primary" onClick={openTotp} theme={theme}>
                  <Plus size={'0.6875rem'} color={theme.mode === 'dark' ? '#fff' : theme.colors.bgPrimary} strokeWidth={1.5} /> {t.mfa.generateTotpSecret}
                </Button>
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
      <SL theme={theme}>Backup codes</SL>
      <Card theme={theme}>
        <div style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.8125rem', alignItems: 'center' }}>
              <IconBox theme={theme} color={backupFactor ? 'green' : undefined}>
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
              <Button size="sm" onClick={() => openBackup()} theme={theme}>
                <RefreshCw size={'0.6875rem'} strokeWidth={1.5} /> {t.mfa.generateNewCodes}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Danger zone ── */}
      <div style={{ marginTop: '0.375rem' }}>
        <SL theme={theme}>{t.security.dangerZone}</SL>
        <Card danger theme={theme}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', gap: '1.25rem' }}>
            <div>
              <p style={{ fontFamily: T.font, fontWeight: 600, fontSize: '0.8125rem', color: T.text, marginBottom: '0.125rem' }}>
                {t.security.deleteAccount}
              </p>
              <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.55 }}>
                {t.security.deleteAccountDescription}
              </p>
            </div>
            <Button variant="danger" size="sm" style={{ flexShrink: 0 }}
              onClick={() => setDeleteStep({ kind: 'password' })} theme={theme}>
              {t.security.deleteAccount}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}