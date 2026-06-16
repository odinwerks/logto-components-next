'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { DataResult } from '../../logic/actions/safe';
import { useAsyncGuard } from '../use-async-guard';

export interface UseBackupCodesFlowOptions {
  onVerifyPassword: (
    pw: string,
  ) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  onGenerateBackupCodes: (
    recordId: string,
    ts: number,
  ) => Promise<DataResult<{ codes: string[] }>>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onRefreshMfa: () => Promise<void>;
  t: { mfa: Record<string, string>; security: Record<string, string> };
}

export interface UseBackupCodesFlowResult {
  // Flow state
  step: 'confirm' | 'password' | 'loading' | null;
  error: string;
  // Generated codes display (separate state - shown after flow closes)
  generatedCodes: Array<{ code: string; used: boolean }> | null;
  // Actions
  open: () => void;
  close: () => void;
  dismissCodes: () => Promise<void>;
  proceedToPassword: () => void;
  handlePassword: (pw: string) => Promise<void>;
}

export function useBackupCodesFlow({
  onVerifyPassword,
  onGenerateBackupCodes,
  onSuccess,
  onError,
  onRefreshMfa,
  t,
}: UseBackupCodesFlowOptions): UseBackupCodesFlowResult {
  const [step, setStep] = useState<'confirm' | 'password' | 'loading' | null>(null);
  const [error, setError] = useState<string>('');
  const [generatedCodes, setGeneratedCodes] = useState<Array<{ code: string; used: boolean }> | null>(null);

  const guard = useAsyncGuard();

  // Callback refs
  const onVerifyPasswordRef = useRef(onVerifyPassword);
  const onGenerateBackupCodesRef = useRef(onGenerateBackupCodes);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onRefreshMfaRef = useRef(onRefreshMfa);
  const tRef = useRef(t);
  useEffect(() => {
    onVerifyPasswordRef.current = onVerifyPassword;
    onGenerateBackupCodesRef.current = onGenerateBackupCodes;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    onRefreshMfaRef.current = onRefreshMfa;
    tRef.current = t;
  }, [onVerifyPassword, onGenerateBackupCodes, onSuccess, onError, onRefreshMfa, t]);

  const open = useCallback(() => {
    guard.bump();
    setStep('confirm');
    setError('');
  }, [guard]);

  const close = useCallback(() => {
    guard.bump();
    setStep(null);
    setError('');
  }, [guard]);

  const proceedToPassword = useCallback(() => {
    setStep('password');
  }, []);

  const dismissCodes = useCallback(async () => {
    setGeneratedCodes(null);
    await onRefreshMfaRef.current();
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

      const { verificationRecordId, verificationTimestamp } = verifyResult.data;

      const codesResult = await onGenerateBackupCodesRef.current(
        verificationRecordId,
        verificationTimestamp,
      );
      if (guard.isStale(capturedGen)) return;

      if (!codesResult.ok) {
        onErrorRef.current(codesResult.error);
        setStep(null);
        return;
      }

      const codes = codesResult.data.codes.map((code) => ({ code, used: false }));
      setGeneratedCodes(codes);
      setStep(null);
      onSuccessRef.current(tRef.current.mfa.generatingCodes);
    },
    [guard],
  );

  return {
    step,
    error,
    generatedCodes,
    open,
    close,
    dismissCodes,
    proceedToPassword,
    handlePassword,
  };
}
