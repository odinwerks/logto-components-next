'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { UserData, MfaVerification, MfaVerificationPayload } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import { Check, X, ChevronRight, AlertTriangle, Key, Trash2, Plus, Eye, EyeOff, RefreshCw, Lock, Shield, Fingerprint, Pencil } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';
import { Button } from '../../shared/Button';
import { Input } from '../../shared/Input';
import { FlowModal, BackupCodesModal, type ModalStep } from '../shared/FlowModal';
import { Card, HR, IconBox, SL } from '../shared/ContactRow';
import { readEnv } from '../../../logic/env';

interface SecurityTabProps {
  userData: UserData;
  mode: 'dark' | 'light';
  colors: ThemeColors;
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
  onRequestWebAuthnRegistration: () => Promise<{ registrationOptions: unknown; verificationRecordId: string }>;
  onVerifyAndLinkWebAuthn: (payload: unknown, verificationRecordId: string, identityVerificationRecordId: string) => Promise<void>;
  onRenamePasskey: (verificationId: string, name: string, identityVerificationRecordId: string) => Promise<void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const ISSUER = readEnv('MFA_ISSUER') || 'Logto';

export function SecurityTab({
  userData, mode, colors, t,
  onVerifyPassword,
  onGetMfaVerifications, onGenerateTotpSecret,
  onAddMfaVerification, onDeleteMfaVerification,
  onReplaceTotpVerification,
  onGenerateBackupCodes,
  onUpdatePassword,
  onDeleteAccount,
  onRequestWebAuthnRegistration,
  onVerifyAndLinkWebAuthn,
  onRenamePasskey,
  onSuccess, onError,
}: SecurityTabProps) {
  const c = colors;
  const T = {
    font: "'DM Sans', system-ui, sans-serif",
    mono: "'IBM Plex Mono', 'Courier New', monospace",
    text: c.textPrimary,
    sub: c.textSecondary,
    muted: c.textTertiary,
    bg: c.bgPrimary,
    surface: c.bgSecondary,
    raised: c.bgTertiary,
    border: c.borderColor,
    borderFaint: `${c.borderColor}80`,
    greenDim: `${c.accentGreen}1a`,
    greenText: c.accentGreen,
    blueDim: `${c.accentBlue}1a`,
    blueText: c.accentBlue,
    blue: c.accentBlue,
    redDim: c.errorBg,
    redText: c.accentRed,
    redBorder: `${c.accentRed}4d`,
    red: c.accentRed,
    amberDim: c.warningBg,
    amberText: c.accentYellow,
  };
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
  const webAuthnFactors = mfaList.filter(v => v.type === 'WebAuthn');

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

  // ── Passkey registration ──
  const [passkeyRegStep, setPasskeyRegStep] = useState<ModalStep | null>(null);
  const [webAuthnSupported, setWebAuthnSupported] = useState(true); // optimistic default

  useEffect(() => {
    import('@simplewebauthn/browser').then(({ browserSupportsWebAuthn }) => {
      setWebAuthnSupported(browserSupportsWebAuthn());
    });
  }, []);

  // ── Passkey deletion ──
  const [delPasskeyStep, setDelPasskeyStep] = useState<ModalStep | null>(null);
  const [passkeyToDelete, setPasskeyToDelete] = useState<string | null>(null);

  // ── Passkey rename ──
  const [renamePasskeyStep, setRenamePasskeyStep] = useState<ModalStep | null>(null);
  const [passkeyToRename, setPasskeyToRename] = useState<string | null>(null);

  const handlePasskeyRegPassword = async (pw: string) => {
    setPasskeyRegStep({ kind: 'loading', message: t.mfa.verifying });
    try {
      const identity = await onVerifyPassword(pw);
      setPasskeyRegStep({ kind: 'loading', message: t.mfa.checkDevice });
      const { registrationOptions, verificationRecordId } = await onRequestWebAuthnRegistration();
      // browser ceremony — native prompt appears here
      const registrationResponse = await startRegistration({ optionsJSON: registrationOptions as Parameters<typeof startRegistration>[0]['optionsJSON'] });
      setPasskeyRegStep({ kind: 'loading', message: t.mfa.linkingPasskey });
      await onVerifyAndLinkWebAuthn(registrationResponse, verificationRecordId, identity.verificationRecordId);
      onSuccess(t.mfa.passkeyAdded);
      setPasskeyRegStep(null);
      await loadMfa();
    } catch (err) {
      // User cancelled the browser's WebAuthn prompt — close silently
      if (err instanceof Error && (err.name === 'NotAllowedError' || err.message.includes('not allowed'))) {
        setPasskeyRegStep(null);
        return;
      }
      onError(err instanceof Error ? err.message : t.mfa.verificationFailed);
      setPasskeyRegStep(null);
    }
  };

  const handleDelPasskeyPw = async (pw: string) => {
    if (!passkeyToDelete) return;
    setDelPasskeyStep({ kind: 'loading', message: t.mfa.removing });
    try {
      const identity = await onVerifyPassword(pw);
      await onDeleteMfaVerification(passkeyToDelete, identity.verificationRecordId);
      onSuccess(t.mfa.passkeyDeleted);
      setDelPasskeyStep(null);
      setPasskeyToDelete(null);
      await loadMfa();
    } catch (err) {
      onError(err instanceof Error ? err.message : t.mfa.verificationFailed);
      setDelPasskeyStep(null);
      setPasskeyToDelete(null);
    }
  };

  const handleRenamePasskeyPw = async (pw: string) => {
    if (!passkeyToRename) return;
    setRenamePasskeyStep({ kind: 'loading', message: t.mfa.verifying });
    try {
      const identity = await onVerifyPassword(pw);
      setRenamePasskeyStep({ kind: 'rename-passkey', verificationRecordId: identity.verificationRecordId, passkeyId: passkeyToRename });
    } catch (err) {
      onError(err instanceof Error ? err.message : t.mfa.verificationFailed);
      setRenamePasskeyStep(null);
      setPasskeyToRename(null);
    }
  };

  const handleRenamePasskeySubmit = async (name: string, passkeyId: string, verificationRecordId: string) => {
    setRenamePasskeyStep({ kind: 'loading', message: t.mfa.verifying });
    try {
      await onRenamePasskey(passkeyId, name, verificationRecordId);
      onSuccess(t.mfa.passkeyRenamed);
      setRenamePasskeyStep(null);
      setPasskeyToRename(null);
      await loadMfa();
    } catch (err) {
      onError(err instanceof Error ? err.message : t.mfa.verificationFailed);
      setRenamePasskeyStep(null);
      setPasskeyToRename(null);
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
        mode={mode}
        colors={colors}
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
      mode={mode}
      colors={colors}
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
      mode={mode}
      colors={colors}
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
      mode={mode}
      colors={colors}
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
      mode={mode}
      colors={colors}
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
      mode={mode}
      colors={colors}
      t={t}
        />
      )}

      {/* Register passkey modal */}
      {passkeyRegStep && (
        <FlowModal
          title={t.mfa.registerPasskey}
          subtitle={t.mfa.registerPasskeyDesc}
          step={passkeyRegStep}
      onPasswordSubmit={handlePasskeyRegPassword}
      onClose={() => setPasskeyRegStep(null)}
      mode={mode}
      colors={colors}
      t={t}
        />
      )}

      {/* Delete passkey modal */}
      {delPasskeyStep && (
        <FlowModal
          title={t.mfa.deletePasskey}
          subtitle={t.mfa.deletePasskeyDesc}
          step={delPasskeyStep}
          onPasswordSubmit={handleDelPasskeyPw}
      onClose={() => { setDelPasskeyStep(null); setPasskeyToDelete(null); }}
      danger
      mode={mode}
      colors={colors}
      t={t}
        />
      )}

      {/* Rename passkey modal */}
      {renamePasskeyStep && (
        <FlowModal
          title={t.mfa.renamePasskey}
          subtitle={t.mfa.renamePasskeyDesc}
          step={renamePasskeyStep}
          onPasswordSubmit={handleRenamePasskeyPw}
      onRenamePasskeySubmit={handleRenamePasskeySubmit}
      onClose={() => { setRenamePasskeyStep(null); setPasskeyToRename(null); }}
      mode={mode}
      colors={colors}
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
      <SL colors={colors}>{t.security.password || 'Password'}</SL>
      <Card mode={mode} colors={colors}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <IconBox mode={mode} colors={colors}><Lock size={'0.9375rem'} color={T.muted} strokeWidth={1.5} /></IconBox>
            <div>
              <p style={{ fontFamily: T.font, fontWeight: 500, fontSize: '0.8125rem', color: T.text, marginBottom: '0.0625rem' }}>
                {t.security.password || 'Password'}
              </p>
              <p style={{ fontFamily: T.mono, fontSize: '0.6875rem', color: T.muted }}>••••••••••••</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setPwStep({ kind: 'password' })} mode={mode} colors={colors}>
            {t.security.changePassword}
          </Button>
        </div>
      </Card>

      {/* ── Two-factor authentication ── */}
      <SL colors={colors}>{t.security.twoFactorAuth}</SL>
      <Card mode={mode} colors={colors}>
        <div style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.8125rem', alignItems: 'flex-start' }}>
              <IconBox mode={mode} colors={colors} color={totpFactor ? 'blue' : undefined}>
                <Shield size={'1rem'} color={totpFactor ? T.blueText : T.muted} strokeWidth={1.5} />
              </IconBox>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5625rem', marginBottom: '0.1875rem' }}>
                  <p style={{ fontFamily: T.font, fontWeight: 500, fontSize: '0.8125rem', color: T.text }}>
                    {t.mfa.authenticatorApp}
                  </p>
                  {totpFactor && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      padding: '0.125rem 0.5rem', fontSize: '0.625rem', fontFamily: T.mono,
                      background: T.greenDim, color: T.greenText,
                      border: `1px solid ${mode === 'dark' ? '#006e41' : '#009159'}44`,
                      letterSpacing: 0.2,
                    }}>
                      <Check size={'0.5625rem'} color={T.greenText} strokeWidth={1.5} /> {t.mfa.authenticatorActive}
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
                  <Button size="sm" variant="ghost" onClick={openTotp} mode={mode} colors={colors}>
                    <RefreshCw size={'0.6875rem'} strokeWidth={1.5} /> {t.security.reconfigure}
                  </Button>
                  <Button size="sm" variant="danger" onClick={openDelTotp} mode={mode} colors={colors}>
                    <Trash2 size={'0.6875rem'} strokeWidth={1.5} /> {t.mfa.remove}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="primary" onClick={openTotp} mode={mode} colors={colors}>
                  <Plus size={'0.6875rem'} color={mode === 'dark' ? '#fff' : colors.bgPrimary} strokeWidth={1.5} /> {t.mfa.generateTotpSecret}
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
      <SL colors={colors}>{t.mfa.backupCodesTitle}</SL>
      <Card mode={mode} colors={colors}>
        <div style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.8125rem', alignItems: 'center' }}>
              <IconBox mode={mode} colors={colors} color={backupFactor ? 'green' : undefined}>
                <Key size={'0.9375rem'} color={backupFactor ? T.greenText : T.muted} strokeWidth={1.5} />
              </IconBox>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5625rem', marginBottom: '0.1875rem' }}>
                  <p style={{ fontFamily: T.font, fontWeight: 500, fontSize: '0.8125rem', color: T.text }}>
                    {t.mfa.recoveryCodes}
                  </p>
                  {backupFactor?.remainCodes !== undefined && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      padding: '0.125rem 0.5rem', fontSize: '0.625rem', fontFamily: T.mono,
                      background: T.raised, color: T.sub,
                      border: `1px solid ${T.border}`, letterSpacing: 0.2,
                    }}>
                      {backupFactor.remainCodes} {t.mfa.remaining}
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.muted, lineHeight: 1.55 }}>
                  {t.mfa.singleUseCodes}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
              <Button size="sm" onClick={() => openBackup()} mode={mode} colors={colors}>
                <RefreshCw size={'0.6875rem'} strokeWidth={1.5} /> {t.mfa.generateNewCodes}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Passkeys ── */}
      <SL colors={colors}>{t.mfa.passkeys}</SL>
      <Card mode={mode} colors={colors}>
        <div style={{ padding: '1rem 1.25rem' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: webAuthnFactors.length > 0 ? '0.875rem' : 0 }}>
            <div style={{ display: 'flex', gap: '0.8125rem', alignItems: 'center' }}>
              <IconBox mode={mode} colors={colors} color={webAuthnFactors.length > 0 ? 'blue' : undefined}>
                <Fingerprint size={'0.9375rem'} color={webAuthnFactors.length > 0 ? T.blueText : T.muted} strokeWidth={1.5} />
              </IconBox>
              <div>
                <p style={{ fontFamily: T.font, fontWeight: 500, fontSize: '0.8125rem', color: T.text }}>
                  {t.mfa.passkeys}
                </p>
                <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.muted, lineHeight: 1.55 }}>
                  {t.mfa.passkeyDescription}
                </p>
                {!webAuthnSupported && (
                  <p style={{ fontFamily: T.mono, fontSize: '0.625rem', color: T.muted, marginTop: '0.25rem' }}>
                    {t.mfa.webauthnNotSupported}
                  </p>
                )}
              </div>
            </div>
            <Button size="sm" variant="primary" onClick={() => {
              if (!webAuthnSupported) {
                onError(t.mfa.webauthnNotSupported);
                return;
              }
              setPasskeyRegStep({ kind: 'password' });
            }} mode={mode} colors={colors}>
              <Plus size={'0.6875rem'} color={mode === 'dark' ? '#fff' : colors.bgPrimary} strokeWidth={1.5} /> {t.mfa.addPasskey}
            </Button>
          </div>

          {/* Passkey list */}
          {webAuthnFactors.map((passkey, idx) => (
            <div key={passkey.id}>
              {idx > 0 && <HR colors={colors} />}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', paddingTop: idx > 0 ? '0.875rem' : 0 }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', minWidth: 0 }}>
                  <IconBox mode={mode} colors={colors} color="blue">
                    <Key size={'0.9375rem'} color={T.blueText} strokeWidth={1.5} />
                  </IconBox>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: T.font, fontWeight: 500, fontSize: '0.8125rem', color: T.text, marginBottom: '0.0625rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {passkey.name || t.mfa.passkey}
                    </p>
                    <p style={{ fontFamily: T.mono, fontSize: '0.625rem', color: T.muted }}>
                      {t.mfa.created}: {fmt(passkey.createdAt)}
                      {passkey.lastUsedAt && ` · ${t.mfa.lastUsed}: ${fmt(passkey.lastUsedAt)}`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                  <Button size="sm" variant="ghost" onClick={() => { setPasskeyToRename(passkey.id); setRenamePasskeyStep({ kind: 'password' }); }} mode={mode} colors={colors}>
                    <Pencil size={'0.6875rem'} strokeWidth={1.5} /> {t.profile.edit}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => { setPasskeyToDelete(passkey.id); setDelPasskeyStep({ kind: 'password' }); }} mode={mode} colors={colors}>
                    <Trash2 size={'0.6875rem'} strokeWidth={1.5} /> {t.mfa.remove}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Danger zone ── */}
      <div style={{ marginTop: '0.375rem' }}>
        <SL colors={colors}>{t.security.dangerZone}</SL>
        <Card danger mode={mode} colors={colors}>
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
              onClick={() => setDeleteStep({ kind: 'password' })} mode={mode} colors={colors}>
              {t.security.deleteAccount}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}