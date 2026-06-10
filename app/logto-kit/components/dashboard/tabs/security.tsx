'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { UserData, MfaVerification, MfaVerificationPayload } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import { Check, Key, Plus, RefreshCw, Lock, Shield, Fingerprint, Pencil } from 'lucide-react';
import { Button } from '../../shared/Button';
import { FlowModal, BackupCodesModal, type ModalStep } from '../shared/FlowModal';
import { Card, HR, IconBox, SL } from '../shared/ContactRow';
import { readEnv } from '../../../logic/env';
import { captureMessage } from '../../../logic/capture-message';
import type { ActionResult, DataResult } from '../../../logic/actions/safe';

interface SecurityTabProps {
  userData: UserData;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  mobmode?: number;
  onVerifyPassword: (password: string) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  onGetMfaVerifications: () => Promise<DataResult<MfaVerification[]>>;
  onGenerateTotpSecret: () => Promise<DataResult<{ secret: string }>>;
  onAddMfaVerification: (verification: MfaVerificationPayload, identityVerificationRecordId: string, verificationTimestamp: number) => Promise<ActionResult>;
  onDeleteMfaVerification: (verificationId: string, identityVerificationRecordId: string, verificationTimestamp: number) => Promise<ActionResult>;
  onReplaceTotpVerification: (secret: string, code: string, identityVerificationRecordId: string, verificationTimestamp: number) => Promise<ActionResult>;
  onGenerateBackupCodes: (identityVerificationRecordId: string, verificationTimestamp: number) => Promise<DataResult<{ codes: string[] }>>;
  onUpdatePassword: (newPassword: string, identityVerificationRecordId: string, verificationTimestamp: number) => Promise<ActionResult>;
  onDeleteAccount: (identityVerificationRecordId: string, verificationRecordTimestamp: number) => Promise<ActionResult>;
  onRequestWebAuthnRegistration: () => Promise<DataResult<{ registrationOptions: unknown; verificationRecordId: string }>>;
  onVerifyAndLinkWebAuthn: (payload: unknown, verificationRecordId: string, identityVerificationRecordId: string, verificationTimestamp: number) => Promise<ActionResult>;
  onRenamePasskey: (verificationId: string, name: string, identityVerificationRecordId: string, verificationTimestamp: number) => Promise<ActionResult>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const ISSUER = process.env.NEXT_PUBLIC_MFA_ISSUER || 'Logto';

export function SecurityTab({
  userData, mode, colors, t, mobmode,
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
  const isMobile = mobmode === 1;
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

  // ── Abort refs (prevent reopened modals after close during loading) ──
  const totpGenRef = useRef(0);
  const backupGenRef = useRef(0);
  const deleteGenRef = useRef(0);
  const passkeyRegGenRef = useRef(0);
  const renameGenRef = useRef(0);
  const delPasskeyGenRef = useRef(0);
  const pwChangeGenRef = useRef(0);
  const passkeyActionGenRef = useRef(0);

  // ── MFA list ──
  const [mfaList, setMfaList] = useState<MfaVerification[]>([]);
  const [mfaLoading, setMfaLoading] = useState(false);

  const loadMfaFn = useCallback(async () => {
    setMfaLoading(true);
    const r = await onGetMfaVerifications();
    if (!r.ok) { onError(r.error); setMfaList([]); setMfaLoading(false); return; }
    setMfaList(r.data);
    setMfaLoading(false);
  }, [onGetMfaVerifications, onError]);

  const loadMfaRef = useRef(loadMfaFn);
  useEffect(() => {
    loadMfaRef.current = loadMfaFn;
  }, [loadMfaFn]);

  // Load MFA list once on mount (via ref to avoid dep on unstable callbacks)
  useEffect(() => { loadMfaRef.current(); }, []);

  // Also expose a manual reload that respects latest props
  const refreshMfa = useCallback(() => {
    return loadMfaRef.current();
  }, []);

  const totpFactor   = mfaList.find(v => v.type === 'Totp');
  const backupFactor = mfaList.find(v => v.type === 'BackupCode');
  const webAuthnFactors = mfaList.filter(v => v.type === 'WebAuthn');
  // Logto requires at least one other MFA factor before backup codes can be enrolled.
  const hasOtherMfaFactor = mfaList.some(v => v.type === 'Totp' || v.type === 'WebAuthn');

  const fmt = (d: string) => new Date(d).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  // ── TOTP modal ──
  const [totpStep, setTotpStep] = useState<ModalStep | null>(null);
  const [totpPwErr, setTotpPwErr] = useState('');
  const [totpMode, setTotpMode] = useState<'setup' | 'remove'>('setup');

  const openTotp = () => { ++totpGenRef.current; setTotpStep({ kind: 'password' }); setTotpMode('setup'); setTotpPwErr(''); };
  const closeTotp = () => { totpGenRef.current++; setTotpStep(null); setTotpMode('setup'); };

  const handleTotpPassword = async (pw: string) => {
    const totpGen = totpGenRef.current;
    setTotpPwErr('');
    if (totpMode === 'remove') {
      if (!totpFactor) return;
      setTotpStep({ kind: 'loading', message: t.mfa.verifying });
      const identityResult = await onVerifyPassword(pw);
      if (totpGenRef.current !== totpGen) return;
      if (!identityResult.ok) { setTotpPwErr(identityResult.error); setTotpStep({ kind: 'password' }); return; }
      const delResult = await onDeleteMfaVerification(totpFactor.id, identityResult.data.verificationRecordId, identityResult.data.verificationTimestamp);
      if (totpGenRef.current !== totpGen) return;
      if (!delResult.ok) { onError(delResult.error); setTotpStep({ kind: 'password' }); return; }
      onSuccess(t.mfa.factorRemoved);
      closeTotp();
      await refreshMfa();
      return;
    }
    setTotpStep({ kind: 'loading', message: t.mfa.verifying });
    const identityResult = await onVerifyPassword(pw);
    if (totpGenRef.current !== totpGen) return;
    if (!identityResult.ok) { setTotpPwErr(identityResult.error); setTotpStep({ kind: 'password' }); return; }
    setTotpStep({ kind: 'loading', message: t.mfa.generatingSecret });
    const secretResult = await onGenerateTotpSecret();
    if (totpGenRef.current !== totpGen) return;
    if (!secretResult.ok) { onError(secretResult.error); closeTotp(); return; }
    const { secret } = secretResult.data;
    const account = userData.profile?.givenName || userData.username || 'user';
    const totpUri = `otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}`;
    setTotpStep({ kind: 'totp-scan', secret, totpUri, identityVerificationId: identityResult.data.verificationRecordId, verificationTimestamp: identityResult.data.verificationTimestamp });
  };

  const handleTotpActivate = async (code: string, secret: string, identityVerificationId: string, verificationTimestamp: number) => {
    const totpGen = totpGenRef.current;
    setTotpStep({ kind: 'loading', message: t.mfa.activating });
    let r: ActionResult;
    if (totpFactor) {
      r = await onReplaceTotpVerification(secret, code, identityVerificationId, verificationTimestamp);
    } else {
      r = await onAddMfaVerification({ type: 'Totp', payload: { secret, code } }, identityVerificationId, verificationTimestamp);
    }
    if (totpGenRef.current !== totpGen) return;
    if (!r.ok) { onError(r.error); closeTotp(); return; }
    onSuccess(t.mfa.totpEnrolled);
    closeTotp();
    await refreshMfa();
  };

  // ── Backup codes ──
  const [backupStep, setBackupStep] = useState<ModalStep | null>(null);
  const [backupPwErr, setBackupPwErr] = useState('');
  const [backupCodes, setBackupCodes] = useState<Array<{ code: string; used: boolean }> | null>(null);

  const openBackup = () => { ++backupGenRef.current; setBackupPwErr(''); setBackupStep({ kind: 'value' }); };
  const closeBackupModal = () => { backupGenRef.current++; setBackupPwErr(''); setBackupStep(null); };
  const closeCodesModal = async () => { setBackupCodes(null); await refreshMfa(); };

  const handleBackupPw = async (pw: string) => {
    const backupGen = backupGenRef.current;
    setBackupPwErr('');
    setBackupStep({ kind: 'loading', message: t.mfa.generatingCodes });
    const identityResult = await onVerifyPassword(pw);
    if (backupGenRef.current !== backupGen) return;
    if (!identityResult.ok) { setBackupPwErr(identityResult.error); setBackupStep({ kind: 'password' }); return; }
    const codesResult = await onGenerateBackupCodes(identityResult.data.verificationRecordId, identityResult.data.verificationTimestamp);
    if (backupGenRef.current !== backupGen) return;
    if (!codesResult.ok) { onError(codesResult.error); closeBackupModal(); return; }
    setBackupCodes(codesResult.data.codes.map(code => ({ code, used: false })));
    closeBackupModal();
  };

  // ── Password change modal ──
  const [pwStep, setPwStep] = useState<ModalStep | null>(null);
  const [pwChangeErr, setPwChangeErr] = useState('');

  // ── Delete account modal ──
  const [deleteStep, setDeleteStep] = useState<ModalStep | null>(null);
  const [deletePwErr, setDeletePwErr] = useState('');
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDeleteAccount = async (pw: string) => {
    const deleteGen = deleteGenRef.current;
    setDeletePwErr('');
    setDeleteStep({ kind: 'loading', message: t.mfa.verifying });
    const identityResult = await onVerifyPassword(pw);
    if (deleteGenRef.current !== deleteGen) return;
    if (!identityResult.ok) { setDeletePwErr(identityResult.error); setDeleteStep({ kind: 'password' }); return; }

    setDeleteStep({ kind: 'loading', message: t.security.deletingAccount });
    const deleteResult = await onDeleteAccount(
      identityResult.data.verificationRecordId,
      identityResult.data.verificationTimestamp,  // server-derived, from Logto's expiresAt
    );
    if (deleteGenRef.current !== deleteGen) return;
    if (!deleteResult.ok) { onError(deleteResult.error); setDeleteStep(null); return; }

    setDeleteStep({ kind: 'loading', message: t.security.accountDeleted });
    onSuccess(t.security.accountDeleted);

    const rawDelay = parseInt(readEnv('DELETE_REDIRECT_DELAY') || '3000', 10);
    const delayMs = Number.isFinite(rawDelay) && rawDelay >= 0 ? rawDelay : 3000;
    redirectTimerRef.current = setTimeout(() => {
      window.location.href = '/';
    }, delayMs);
  };

  // Cleanup redirect timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  // ── Passkey registration ──
  const [passkeyRegStep, setPasskeyRegStep] = useState<ModalStep | null>(null);
  const [passkeyRegPwErr, setPasskeyRegPwErr] = useState('');
  const [webAuthnSupported, setWebAuthnSupported] = useState(true); // optimistic default

  useEffect(() => {
    import('@simplewebauthn/browser')
      .then(({ browserSupportsWebAuthn }) => {
        setWebAuthnSupported(browserSupportsWebAuthn());
      })
      .catch(() => {
        setWebAuthnSupported(false);
      });
  }, []);

  // ── Passkey deletion ──
  const [delPasskeyStep, setDelPasskeyStep] = useState<ModalStep | null>(null);
  const [delPasskeyPwErr, setDelPasskeyPwErr] = useState('');
  const [passkeyToDelete, setPasskeyToDelete] = useState<string | null>(null);

  // ── Passkey rename ──
  const [renamePasskeyStep, setRenamePasskeyStep] = useState<ModalStep | null>(null);
  const [renamePasskeyPwErr, setRenamePasskeyPwErr] = useState('');
  const [passkeyToRename, setPasskeyToRename] = useState<string | null>(null);

  // ── Passkey action (mobile unified rename/remove modal) ──
  const [passkeyActionMode, setPasskeyActionMode] = useState<'rename' | 'remove'>('rename');
  const [passkeyActionStep, setPasskeyActionStep] = useState<ModalStep | null>(null);
  const [passkeyActionPwErr, setPasskeyActionPwErr] = useState('');
  const [passkeyActionId, setPasskeyActionId] = useState<string | null>(null);

  const handlePasskeyRegPassword = async (pw: string) => {
    const passkeyRegGen = passkeyRegGenRef.current;
    setPasskeyRegPwErr('');
    setPasskeyRegStep({ kind: 'loading', message: t.mfa.verifying });
    const identityResult = await onVerifyPassword(pw);
    if (passkeyRegGenRef.current !== passkeyRegGen) return;
    if (!identityResult.ok) { setPasskeyRegPwErr(identityResult.error); setPasskeyRegStep({ kind: 'password' }); return; }
    setPasskeyRegStep({ kind: 'loading', message: t.mfa.checkDevice });
    const registrationResult = await onRequestWebAuthnRegistration();
    if (passkeyRegGenRef.current !== passkeyRegGen) return;
    if (!registrationResult.ok) { onError(registrationResult.error); setPasskeyRegStep(null); return; }
    const { registrationOptions, verificationRecordId } = registrationResult.data;
    try {
      // Dynamic import - if chunk fails to load, error is caught below
      const { startRegistration } = await import('@simplewebauthn/browser');
      // browser ceremony - native prompt appears here
      const registrationResponse = await startRegistration({ optionsJSON: registrationOptions as Parameters<typeof startRegistration>[0]['optionsJSON'] });
      if (passkeyRegGenRef.current !== passkeyRegGen) return;
      setPasskeyRegStep({ kind: 'loading', message: t.mfa.linkingPasskey });
      const linkResult = await onVerifyAndLinkWebAuthn(registrationResponse, verificationRecordId, identityResult.data.verificationRecordId, identityResult.data.verificationTimestamp);
      if (passkeyRegGenRef.current !== passkeyRegGen) return;
      if (!linkResult.ok) { onError(linkResult.error); setPasskeyRegStep(null); return; }
      onSuccess(t.mfa.passkeyAdded);
      setPasskeyRegStep(null);
      await refreshMfa();
    } catch (err) {
      // User cancelled the browser's WebAuthn prompt - close silently
      if (err instanceof Error && (err.name === 'NotAllowedError' || err.message.includes('not allowed'))) {
        setPasskeyRegStep(null);
        return;
      }
      onError(captureMessage(err));
      setPasskeyRegStep(null);
    }
  };

  const handleDelPasskeyPw = async (pw: string) => {
    const delPasskeyGen = delPasskeyGenRef.current;
    if (!passkeyToDelete) return;
    setDelPasskeyPwErr('');
    setDelPasskeyStep({ kind: 'loading', message: t.mfa.removing });
    const identityResult = await onVerifyPassword(pw);
    if (delPasskeyGenRef.current !== delPasskeyGen) return;
    if (!identityResult.ok) { setDelPasskeyPwErr(identityResult.error); setDelPasskeyStep({ kind: 'password' }); return; }
    const delResult = await onDeleteMfaVerification(passkeyToDelete, identityResult.data.verificationRecordId, identityResult.data.verificationTimestamp);
    if (delPasskeyGenRef.current !== delPasskeyGen) return;
    if (!delResult.ok) { onError(delResult.error); setDelPasskeyStep(null); setPasskeyToDelete(null); return; }
    onSuccess(t.mfa.passkeyDeleted);
    setDelPasskeyStep(null);
    setPasskeyToDelete(null);
    await refreshMfa();
  };

  const handleRenamePasskeyPw = async (pw: string) => {
    const renameGen = renameGenRef.current;
    if (!passkeyToRename) return;
    setRenamePasskeyPwErr('');
    setRenamePasskeyStep({ kind: 'loading', message: t.mfa.verifying });
    const identityResult = await onVerifyPassword(pw);
    if (renameGenRef.current !== renameGen) return;
    if (!identityResult.ok) { setRenamePasskeyPwErr(identityResult.error); setRenamePasskeyStep({ kind: 'password' }); return; }
    setRenamePasskeyStep({ kind: 'rename-passkey', verificationRecordId: identityResult.data.verificationRecordId, passkeyId: passkeyToRename, verificationTimestamp: identityResult.data.verificationTimestamp });
  };

  const handleRenamePasskeySubmit = async (name: string, passkeyId: string, verificationRecordId: string, verificationTimestamp: number) => {
    const renameGen = renameGenRef.current;
    setRenamePasskeyStep({ kind: 'loading', message: t.mfa.verifying });
    const r = await onRenamePasskey(passkeyId, name, verificationRecordId, verificationTimestamp);
    if (renameGenRef.current !== renameGen) return;
    if (!r.ok) { onError(r.error); setRenamePasskeyStep(null); setPasskeyToRename(null); return; }
    onSuccess(t.mfa.passkeyRenamed);
    setRenamePasskeyStep(null);
    setPasskeyToRename(null);
    await refreshMfa();
  };

  // ── Unified mobile passkey action handler ──
  const handlePasskeyActionPw = async (pw: string) => {
    const passkeyActionGen = passkeyActionGenRef.current;
    if (!passkeyActionId) return;
    setPasskeyActionPwErr('');
    if (passkeyActionMode === 'remove') {
      setPasskeyActionStep({ kind: 'loading', message: t.mfa.removing });
      const identityResult = await onVerifyPassword(pw);
      if (passkeyActionGenRef.current !== passkeyActionGen) return;
      if (!identityResult.ok) { setPasskeyActionPwErr(identityResult.error); setPasskeyActionStep({ kind: 'password' }); return; }
      const delResult = await onDeleteMfaVerification(passkeyActionId, identityResult.data.verificationRecordId, identityResult.data.verificationTimestamp);
      if (passkeyActionGenRef.current !== passkeyActionGen) return;
      if (!delResult.ok) { onError(delResult.error); setPasskeyActionStep(null); setPasskeyActionId(null); return; }
      onSuccess(t.mfa.passkeyDeleted);
      setPasskeyActionStep(null);
      setPasskeyActionId(null);
      await refreshMfa();
      return;
    }
    setPasskeyActionStep({ kind: 'loading', message: t.mfa.verifying });
    const identityResult = await onVerifyPassword(pw);
    if (passkeyActionGenRef.current !== passkeyActionGen) return;
    if (!identityResult.ok) { setPasskeyActionPwErr(identityResult.error); setPasskeyActionStep({ kind: 'password' }); return; }
    setPasskeyActionStep({ kind: 'rename-passkey', verificationRecordId: identityResult.data.verificationRecordId, passkeyId: passkeyActionId, verificationTimestamp: identityResult.data.verificationTimestamp });
  };

  const handlePasskeyActionRenameSubmit = async (name: string, passkeyId: string, verificationRecordId: string, verificationTimestamp: number) => {
    const passkeyActionGen = passkeyActionGenRef.current;
    setPasskeyActionStep({ kind: 'loading', message: t.mfa.verifying });
    const r = await onRenamePasskey(passkeyId, name, verificationRecordId, verificationTimestamp);
    if (passkeyActionGenRef.current !== passkeyActionGen) return;
    if (!r.ok) { onError(r.error); setPasskeyActionStep(null); setPasskeyActionId(null); return; }
    onSuccess(t.mfa.passkeyRenamed);
    setPasskeyActionStep(null);
    setPasskeyActionId(null);
    await refreshMfa();
  };

  return (
    <div>
      {/* TOTP setup / remove modal */}
      {totpStep && (
        <FlowModal
          title={totpMode === 'remove'
            ? t.security.removeAuthenticator
            : totpFactor ? t.security.reconfigureAuthenticator : t.mfa.totp}
          subtitle={totpMode === 'remove'
            ? t.security.removeAuthenticatorDesc
            : totpFactor ? t.security.reconfigureAuthenticatorDesc : t.mfa.totpDescription}
          step={totpStep}
          onPasswordSubmit={handleTotpPassword}
          onTotpSubmit={handleTotpActivate}
          onClose={closeTotp}
          passwordError={totpPwErr}
          headerExtra={totpMode === 'setup' && totpFactor && totpStep.kind === 'password' ? (
            <button
              onClick={() => { setTotpMode('remove'); setTotpPwErr(''); }}
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
          mode={mode}
          colors={colors}
          t={t}
          mobmode={mobmode}
        />
      )}

      {/* Backup codes - password modal */}
      {backupStep && (
        <FlowModal
          title={t.security.generateBackupCodesTitle}
          subtitle={t.mfa.verifyPasswordToGenerateBackupCodes}
          step={backupStep}
          onValueSubmit={() => { setBackupPwErr(''); setBackupStep({ kind: 'password' }); }}
          valueSubmitLabel={t.security.generateBackupCodesCta}
          onPasswordSubmit={handleBackupPw}
          onClose={closeBackupModal}
          passwordError={backupPwErr}
          extra={backupStep.kind === 'value' ? (
            <p style={{ fontFamily: T.font, fontSize: '0.8125rem', fontWeight: 700, color: T.text, lineHeight: 1.55, margin: 0 }}>
              {t.security.generateBackupCodesConfirm}
            </p>
          ) : undefined}
          hideFooterClose
          mode={mode}
          colors={colors}
          t={t}
          mobmode={mobmode}
        />
      )}

      {/* Backup codes - display modal */}
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
          passwordError={pwChangeErr}
          onPasswordSubmit={async (pw) => {
            const pwChangeGen = pwChangeGenRef.current;
            setPwChangeErr('');
            setPwStep({ kind: 'loading', message: t.mfa.verifying });
            const pwResult = await onVerifyPassword(pw);
            if (pwChangeGenRef.current !== pwChangeGen) return;
            if (!pwResult.ok) { setPwChangeErr(pwResult.error); setPwStep({ kind: 'password' }); return; }
            setPwStep({ kind: 'new-password', verificationRecordId: pwResult.data.verificationRecordId, verificationTimestamp: pwResult.data.verificationTimestamp });
          }}
          onNewPasswordSubmit={async (newPw, verificationRecordId, verificationTimestamp) => {
            const pwChangeGen = pwChangeGenRef.current;
            setPwStep({ kind: 'loading', message: t.mfa.changingPassword });
            const result = await onUpdatePassword(newPw, verificationRecordId, verificationTimestamp);
            if (pwChangeGenRef.current !== pwChangeGen) return;
            if (result.ok) {
              onSuccess(t.security.passwordChanged);
            } else {
              onError(result.error);
            }
            setPwStep(null);
          }}
          onClose={() => { pwChangeGenRef.current++; setPwStep(null); }}
          hideFooterClose
          mode={mode}
          colors={colors}
          t={t}
          mobmode={mobmode}
        />
      )}

      {/* Delete account modal */}
      {deleteStep && (
        <FlowModal
          title={t.security.deleteAccount}
          subtitle={t.security.confirmDeleteAccount}
          step={deleteStep}
          passwordError={deletePwErr}
          onPasswordSubmit={handleDeleteAccount}
          onClose={() => { deleteGenRef.current++; setDeletePwErr(''); setDeleteStep(null); }}
          danger
          hideFooterClose
          mode={mode}
          colors={colors}
          t={t}
          mobmode={mobmode}
        />
      )}

      {/* Register passkey modal */}
      {passkeyRegStep && (
        <FlowModal
          title={t.mfa.registerPasskey}
          subtitle={t.mfa.registerPasskeyDesc}
          step={passkeyRegStep}
          passwordError={passkeyRegPwErr}
          onPasswordSubmit={handlePasskeyRegPassword}
          onClose={() => { passkeyRegGenRef.current++; setPasskeyRegPwErr(''); setPasskeyRegStep(null); }}
          hideFooterClose
          mode={mode}
          colors={colors}
          t={t}
          mobmode={mobmode}
        />
      )}

      {/* Delete passkey modal (desktop) */}
      {!isMobile && delPasskeyStep && (
        <FlowModal
          title={t.mfa.deletePasskey}
          subtitle={t.mfa.deletePasskeyDesc}
          step={delPasskeyStep}
          passwordError={delPasskeyPwErr}
          onPasswordSubmit={handleDelPasskeyPw}
          onClose={() => { delPasskeyGenRef.current++; setDelPasskeyPwErr(''); setDelPasskeyStep(null); setPasskeyToDelete(null); }}
          danger
          hideFooterClose
          mode={mode}
          colors={colors}
          t={t}
          mobmode={mobmode}
        />
      )}

      {/* Rename passkey modal (desktop) */}
      {!isMobile && renamePasskeyStep && (
        <FlowModal
          title={t.mfa.renamePasskey}
          subtitle={t.mfa.renamePasskeyDesc}
          step={renamePasskeyStep}
          passwordError={renamePasskeyPwErr}
          onPasswordSubmit={handleRenamePasskeyPw}
          onRenamePasskeySubmit={handleRenamePasskeySubmit}
          onClose={() => { renameGenRef.current++; setRenamePasskeyPwErr(''); setRenamePasskeyStep(null); setPasskeyToRename(null); }}
          hideFooterClose
          mode={mode}
          colors={colors}
          t={t}
          mobmode={mobmode}
        />
      )}

      {/* Unified passkey action modal (mobile) */}
      {isMobile && passkeyActionStep && (
        <FlowModal
          title={passkeyActionMode === 'remove' ? t.mfa.deletePasskey : t.mfa.renamePasskey}
          subtitle={passkeyActionMode === 'remove' ? t.mfa.deletePasskeyDesc : t.mfa.renamePasskeyDesc}
          step={passkeyActionStep}
          passwordError={passkeyActionPwErr}
          onPasswordSubmit={handlePasskeyActionPw}
          onRenamePasskeySubmit={handlePasskeyActionRenameSubmit}
          onClose={() => { passkeyActionGenRef.current++; setPasskeyActionPwErr(''); setPasskeyActionStep(null); setPasskeyActionId(null); }}
          danger={passkeyActionMode === 'remove'}
          hideFooterClose
          headerExtra={passkeyActionMode === 'rename' && passkeyActionStep.kind === 'password' ? (
            <button
              onClick={() => { setPasskeyActionMode('remove'); }}
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
          mode={mode}
          colors={colors}
          t={t}
          mobmode={mobmode}
        />
      )}



      {/* ── Password ── */}
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
          {isMobile ? (
            <button onClick={() => { ++pwChangeGenRef.current; setPwChangeErr(''); setPwStep({ kind: 'password' }); }} aria-label={t.security.changePassword} style={{
              width: '2rem', height: '2rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: c.bgTertiary, border: `1px solid ${c.borderColor}`,
              borderRadius: '0.25rem', cursor: 'pointer', color: c.textSecondary, padding: 0,
            }}>
              <Pencil size={14} strokeWidth={1.5} />
            </button>
          ) : (
            <Button size="sm" onClick={() => { ++pwChangeGenRef.current; setPwChangeErr(''); setPwStep({ kind: 'password' }); }} mode={mode} colors={colors}>
              {t.security.changePassword}
            </Button>
          )}
        </div>
      </Card>

      {/* ── Two-factor authentication ── */}
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
                isMobile ? (
                  <button onClick={openTotp} aria-label={t.security.reconfigure} style={{
                    width: '2rem', height: '2rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: c.bgTertiary, border: `1px solid ${c.borderColor}`,
                    borderRadius: '0.25rem', cursor: 'pointer', color: c.textSecondary, padding: 0,
                  }}>
                    <RefreshCw size={14} strokeWidth={1.5} />
                  </button>
                ) : (
                  <Button size="sm" onClick={openTotp} mode={mode} colors={colors}>
                    {t.security.reconfigure}
                  </Button>
                )
              ) : isMobile ? (
                <button onClick={openTotp} aria-label={t.mfa.generateTotpSecret} style={{
                  width: '2rem', height: '2rem', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: c.accentBlue, border: `1px solid ${c.accentBlue}`,
                  borderRadius: '0.25rem', cursor: 'pointer', color: '#fff', padding: 0,
                }}>
                  <Plus size={14} strokeWidth={1.5} />
                </button>
              ) : (
                <Button size="sm" variant="primary" onClick={openTotp} mode={mode} colors={colors}>
                  {t.mfa.generateTotpSecret}
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
              {isMobile ? (
                <button
                  onClick={() => {
                    if (!hasOtherMfaFactor) { onError(t.mfa.backupCodesRequireOtherFactor); return; }
                    openBackup();
                  }}
                  title={!hasOtherMfaFactor ? t.mfa.backupCodesRequireOtherFactor : undefined}
                  style={{
                    width: '2rem', height: '2rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: c.bgTertiary, border: `1px solid ${c.borderColor}`,
                    borderRadius: '0.25rem',
                    cursor: !hasOtherMfaFactor ? 'not-allowed' : 'pointer',
                    color: !hasOtherMfaFactor ? c.textTertiary : c.textSecondary,
                    opacity: !hasOtherMfaFactor ? 0.45 : 1,
                    padding: 0,
                  }}
                >
                  <RefreshCw size={14} strokeWidth={1.5} />
                </button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    if (!hasOtherMfaFactor) { onError(t.mfa.backupCodesRequireOtherFactor); return; }
                    openBackup();
                  }}
                  disabled={!hasOtherMfaFactor}
                  mode={mode}
                  colors={colors}
                >
                  {t.security.generateBackupCodesTitle}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Passkeys ── */}
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
            {isMobile ? (
              <button onClick={() => {
                if (!webAuthnSupported) {
                  onError(t.mfa.webauthnNotSupported);
                  return;
                }
                ++passkeyRegGenRef.current;
                setPasskeyRegPwErr('');
                setPasskeyRegStep({ kind: 'password' });
              }} aria-label={t.mfa.addPasskey} style={{
                width: '2rem', height: '2rem', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: c.accentBlue, border: `1px solid ${c.accentBlue}`,
                borderRadius: '0.25rem', cursor: 'pointer', color: '#fff', padding: 0,
              }}>
                <Plus size={14} strokeWidth={1.5} />
              </button>
            ) : (
              <Button size="sm" variant="primary" onClick={() => {
                if (!webAuthnSupported) {
                  onError(t.mfa.webauthnNotSupported);
                  return;
                }
                ++passkeyRegGenRef.current;
                setPasskeyRegPwErr('');
                setPasskeyRegStep({ kind: 'password' });
              }} mode={mode} colors={colors}>
                {t.mfa.addPasskey}
              </Button>
            )}
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
                {isMobile ? (
                  <button onClick={() => { ++passkeyActionGenRef.current; setPasskeyActionPwErr(''); setPasskeyActionId(passkey.id); setPasskeyActionMode('rename'); setPasskeyActionStep({ kind: 'password' }); }} aria-label={t.profile.edit} style={{
                    width: '2rem', height: '2rem',
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: c.bgTertiary, border: `1px solid ${c.borderColor}`,
                    borderRadius: '0.25rem', cursor: 'pointer', color: c.textSecondary, padding: 0,
                  }}>
                    <Pencil size={14} strokeWidth={1.5} />
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                    <Button size="sm" variant="ghost" onClick={() => { ++renameGenRef.current; setRenamePasskeyPwErr(''); setPasskeyToRename(passkey.id); setRenamePasskeyStep({ kind: 'password' }); }} mode={mode} colors={colors}>
                      {t.profile.edit}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => { ++delPasskeyGenRef.current; setDelPasskeyPwErr(''); setPasskeyToDelete(passkey.id); setDelPasskeyStep({ kind: 'password' }); }} mode={mode} colors={colors}>
                      {t.mfa.remove}
                    </Button>
                  </div>
                )}
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
              onClick={() => { ++deleteGenRef.current; setDeletePwErr(''); setDeleteStep({ kind: 'password' }); }} mode={mode} colors={colors}>
              {t.security.deleteAccount}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
