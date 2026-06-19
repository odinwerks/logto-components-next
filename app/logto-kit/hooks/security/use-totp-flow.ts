'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ActionResult, DataResult } from '../../logic/actions/safe';
import type { MfaVerification, MfaVerificationPayload, UserData } from '../../logic/types';
import { useAsyncGuard } from '../use-async-guard';
import type { VerificationToken } from './types';

const ISSUER = process.env.NEXT_PUBLIC_MFA_ISSUER || 'Logto';

export type TotpFlowMode = 'setup' | 'remove';

export interface UseTotpFlowOptions {
  userData: UserData;
  totpFactor: MfaVerification | undefined;
  onVerifyPassword: (
    pw: string,
  ) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  onGenerateTotpSecret: () => Promise<DataResult<{ secret: string }>>;
  onAddMfaVerification: (
    v: MfaVerificationPayload,
    recordId: string,
    ts: number,
  ) => Promise<ActionResult>;
  onDeleteMfaVerification: (
    verificationId: string,
    recordId: string,
    ts: number,
  ) => Promise<ActionResult>;
  onReplaceTotpVerification: (
    secret: string,
    code: string,
    recordId: string,
    ts: number,
  ) => Promise<ActionResult>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onRefreshMfa: () => Promise<void>;
  t: { mfa: Record<string, string>; security: Record<string, string> };
}

export interface UseTotpFlowResult {
  step: 'password' | 'setup' | 'loading' | null;
  mode: TotpFlowMode;
  error: string;
  totpUri: string | null;
  identityToken: VerificationToken | null;
  open: (mode?: TotpFlowMode) => void;
  close: () => void;
  switchToRemove: () => void;
  handlePassword: (pw: string) => Promise<void>;
  handleActivate: (code: string) => Promise<void>;
}

export function useTotpFlow({
  userData,
  totpFactor,
  onVerifyPassword,
  onGenerateTotpSecret,
  onAddMfaVerification,
  onDeleteMfaVerification,
  onReplaceTotpVerification,
  onSuccess,
  onError,
  onRefreshMfa,
  t,
}: UseTotpFlowOptions): UseTotpFlowResult {
  const [step, setStep] = useState<'password' | 'setup' | 'loading' | null>(null);
  const [mode, setMode] = useState<TotpFlowMode>('setup');
  const [error, setError] = useState<string>('');
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [identityToken, setIdentityToken] = useState<VerificationToken | null>(null);

  const guard = useAsyncGuard();

  // Callback refs
  const onVerifyPasswordRef = useRef(onVerifyPassword);
  const onGenerateTotpSecretRef = useRef(onGenerateTotpSecret);
  const onAddMfaVerificationRef = useRef(onAddMfaVerification);
  const onDeleteMfaVerificationRef = useRef(onDeleteMfaVerification);
  const onReplaceTotpVerificationRef = useRef(onReplaceTotpVerification);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onRefreshMfaRef = useRef(onRefreshMfa);
  const tRef = useRef(t);
  useEffect(() => {
    onVerifyPasswordRef.current = onVerifyPassword;
    onGenerateTotpSecretRef.current = onGenerateTotpSecret;
    onAddMfaVerificationRef.current = onAddMfaVerification;
    onDeleteMfaVerificationRef.current = onDeleteMfaVerification;
    onReplaceTotpVerificationRef.current = onReplaceTotpVerification;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    onRefreshMfaRef.current = onRefreshMfa;
    tRef.current = t;
  }, [
    onVerifyPassword,
    onGenerateTotpSecret,
    onAddMfaVerification,
    onDeleteMfaVerification,
    onReplaceTotpVerification,
    onSuccess,
    onError,
    onRefreshMfa,
    t,
  ]);

  // Refs for derived data that should not change during async ops
  const totpFactorRef = useRef(totpFactor);
  const userDataRef = useRef(userData);
  useEffect(() => {
    totpFactorRef.current = totpFactor;
    userDataRef.current = userData;
  }, [totpFactor, userData]);

  const open = useCallback(
    (flowMode: TotpFlowMode = 'setup') => {
      guard.bump();
      setMode(flowMode);
      setStep('password');
      setError('');
      setTotpUri(null);
      setSecret(null);
      setIdentityToken(null);
    },
    [guard],
  );

  const close = useCallback(() => {
    guard.bump();
    setStep(null);
    setError('');
    setTotpUri(null);
    setSecret(null);
    setIdentityToken(null);
  }, [guard]);

  const switchToRemove = useCallback(() => {
    setMode('remove');
  }, []);

  const handlePassword = useCallback(
    async (pw: string) => {
      const capturedGen = guard.capture();
      setStep('loading');
      setError('');

      const verifyResult = await onVerifyPasswordRef.current(pw);
      if (guard.isStale(capturedGen)) return;

      if (!verifyResult.ok) {
        setError(verifyResult.error);
        setStep('password');
        return;
      }

      const token: VerificationToken = {
        verificationRecordId: verifyResult.data.verificationRecordId,
        verificationTimestamp: verifyResult.data.verificationTimestamp,
      };

      const currentMode = mode;

      if (currentMode === 'remove') {
        const currentTotpFactor = totpFactorRef.current;
        if (!currentTotpFactor) {
          setStep(null);
          return;
        }
        const deleteResult = await onDeleteMfaVerificationRef.current(
          currentTotpFactor.id,
          token.verificationRecordId,
          token.verificationTimestamp,
        );
        if (guard.isStale(capturedGen)) return;

        if (!deleteResult.ok) {
          onErrorRef.current(deleteResult.error);
          setStep(null);
          return;
        }

        setStep(null);
        await onRefreshMfaRef.current();
        onSuccessRef.current(tRef.current.mfa.factorRemoved);
        return;
      }

      // setup mode: generate secret
      setIdentityToken(token);
      const secretResult = await onGenerateTotpSecretRef.current();
      if (guard.isStale(capturedGen)) return;

      if (!secretResult.ok) {
        onErrorRef.current(secretResult.error);
        setStep(null);
        return;
      }

      const generatedSecret = secretResult.data.secret;
      const currentUserData = userDataRef.current;
      const account =
        currentUserData.profile?.givenName || currentUserData.username || 'user';
      const uri = `otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent(account)}?secret=${generatedSecret}&issuer=${encodeURIComponent(ISSUER)}`;

      setSecret(generatedSecret);
      setTotpUri(uri);
      setStep('setup');
    },
    [guard, mode],
  );

  const handleActivate = useCallback(
    async (code: string) => {
      const capturedGen = guard.capture();
      setStep('loading');

      const currentTotpFactor = totpFactorRef.current;
      const currentSecret = secret;
      const currentToken = identityToken;

      if (!currentSecret || !currentToken) {
        setStep(null);
        return;
      }

      let result: ActionResult;
      if (currentTotpFactor) {
        result = await onReplaceTotpVerificationRef.current(
          currentSecret,
          code,
          currentToken.verificationRecordId,
          currentToken.verificationTimestamp,
        );
      } else {
        result = await onAddMfaVerificationRef.current(
          { type: 'Totp', payload: { code, secret: currentSecret } },
          currentToken.verificationRecordId,
          currentToken.verificationTimestamp,
        );
      }

      if (guard.isStale(capturedGen)) return;

      if (!result.ok) {
        onErrorRef.current(result.error);
        setStep(null);
        return;
      }

      setStep(null);
      await onRefreshMfaRef.current();
      onSuccessRef.current(tRef.current.mfa.totpEnrolled);
    },
    [guard, secret, identityToken],
  );

  return {
    step,
    mode,
    error,
    totpUri,
    identityToken,
    open,
    close,
    switchToRemove,
    handlePassword,
    handleActivate,
  };
}
