'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { DataResult } from '../../logic/actions/safe';
import { useAsyncGuard } from '../use-async-guard';
import type { VerificationToken } from './types';

export interface UsePasswordChangeFlowOptions {
  onVerifyPassword: (
    pw: string,
  ) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  onUpdatePassword: (newPw: string, recordId: string, ts: number) => Promise<{ ok: true } | { ok: false; error: string }>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  t: { mfa: Record<string, string>; security: Record<string, string> };
}

export interface UsePasswordChangeFlowResult {
  step: 'password' | 'new-password' | 'loading' | null;
  error: string;
  identityToken: VerificationToken | null;
  open: () => void;
  close: () => void;
  handleCurrentPassword: (pw: string) => Promise<void>;
  handleNewPassword: (newPw: string) => Promise<void>;
}

export function usePasswordChangeFlow({
  onVerifyPassword,
  onUpdatePassword,
  onSuccess,
  onError,
  t,
}: UsePasswordChangeFlowOptions): UsePasswordChangeFlowResult {
  const [step, setStep] = useState<'password' | 'new-password' | 'loading' | null>(null);
  const [error, setError] = useState<string>('');
  const [identityToken, setIdentityToken] = useState<VerificationToken | null>(null);

  const guard = useAsyncGuard();

  // Callback refs
  const onVerifyPasswordRef = useRef(onVerifyPassword);
  const onUpdatePasswordRef = useRef(onUpdatePassword);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const tRef = useRef(t);
  useEffect(() => {
    onVerifyPasswordRef.current = onVerifyPassword;
    onUpdatePasswordRef.current = onUpdatePassword;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    tRef.current = t;
  }, [onVerifyPassword, onUpdatePassword, onSuccess, onError, t]);

  const open = useCallback(() => {
    guard.bump();
    setStep('password');
    setError('');
    setIdentityToken(null);
  }, [guard]);

  const close = useCallback(() => {
    guard.bump();
    setStep(null);
    setError('');
    setIdentityToken(null);
  }, [guard]);

  const handleCurrentPassword = useCallback(
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
      setIdentityToken(token);
      setStep('new-password');
    },
    [guard],
  );

  const handleNewPassword = useCallback(
    async (newPw: string) => {
      const capturedGen = guard.capture();
      setStep('loading');

      const currentToken = identityToken;
      if (!currentToken) {
        setStep(null);
        return;
      }

      const result = await onUpdatePasswordRef.current(
        newPw,
        currentToken.verificationRecordId,
        currentToken.verificationTimestamp,
      );
      if (guard.isStale(capturedGen)) return;

      if (!result.ok) {
        onErrorRef.current(result.error);
        setStep(null);
        return;
      }

      onSuccessRef.current(tRef.current.security.passwordChanged);
      setStep(null);
      setIdentityToken(null);
    },
    [guard, identityToken],
  );

  return {
    step,
    error,
    identityToken,
    open,
    close,
    handleCurrentPassword,
    handleNewPassword,
  };
}
