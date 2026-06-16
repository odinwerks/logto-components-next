'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { DataResult } from '../../logic/actions/safe';
import { useAsyncGuard } from '../use-async-guard';

export interface UseAccountDeletionFlowOptions {
  onVerifyPassword: (
    pw: string,
  ) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  onDeleteAccount: (recordId: string, ts: number) => Promise<{ ok: true } | { ok: false; error: string }>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  t: { mfa: Record<string, string>; security: Record<string, string> };
}

export interface UseAccountDeletionFlowResult {
  step: 'password' | 'loading' | null;
  error: string;
  showFarewell: boolean;
  open: () => void;
  close: () => void;
  handlePassword: (pw: string) => Promise<void>;
  dismissFarewell: () => void;
}

export function useAccountDeletionFlow({
  onVerifyPassword,
  onDeleteAccount,
  onSuccess,
  onError,
  t,
}: UseAccountDeletionFlowOptions): UseAccountDeletionFlowResult {
  const [step, setStep] = useState<'password' | 'loading' | null>(null);
  const [error, setError] = useState<string>('');
  const [showFarewell, setShowFarewell] = useState<boolean>(false);

  const guard = useAsyncGuard();

  // Callback refs
  const onVerifyPasswordRef = useRef(onVerifyPassword);
  const onDeleteAccountRef = useRef(onDeleteAccount);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const tRef = useRef(t);
  useEffect(() => {
    onVerifyPasswordRef.current = onVerifyPassword;
    onDeleteAccountRef.current = onDeleteAccount;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    tRef.current = t;
  }, [onVerifyPassword, onDeleteAccount, onSuccess, onError, t]);

  const open = useCallback(() => {
    guard.bump();
    setStep('password');
    setError('');
  }, [guard]);

  const close = useCallback(() => {
    guard.bump();
    setStep(null);
    setError('');
  }, [guard]);

  const handlePassword = useCallback(
    async (pw: string) => {
      const capturedGen = guard.capture();
      setStep('loading');
      setError('');

      // Step 1: verify password
      const verifyResult = await onVerifyPasswordRef.current(pw);
      if (guard.isStale(capturedGen)) return;

      if (!verifyResult.ok) {
        setError(verifyResult.error);
        setStep('password');
        return;
      }

      const { verificationRecordId, verificationTimestamp } = verifyResult.data;

      // Step 2: delete account
      setStep('loading');
      const deleteResult = await onDeleteAccountRef.current(
        verificationRecordId,
        verificationTimestamp,
      );
      if (guard.isStale(capturedGen)) return;

      if (!deleteResult.ok) {
        onErrorRef.current(deleteResult.error);
        setStep(null);
        return;
      }

      onSuccessRef.current(tRef.current.security.accountDeleted);
      setStep(null);
      setShowFarewell(true);
    },
    [guard],
  );

  const dismissFarewell = useCallback(() => {
    setShowFarewell(false);
  }, []);

  return {
    step,
    error,
    showFarewell,
    open,
    close,
    handlePassword,
    dismissFarewell,
  };
}
