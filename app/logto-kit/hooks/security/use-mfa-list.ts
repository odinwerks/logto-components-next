'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { DataResult } from '../../logic/actions/safe';
import type { MfaVerification } from '../../logic/types';

export interface UseMfaListOptions {
  onGetMfaVerifications: () => Promise<DataResult<MfaVerification[]>>;
  onError: (message: string) => void;
}

export interface UseMfaListResult {
  mfaList: MfaVerification[];
  isLoading: boolean;
  totpFactor: MfaVerification | undefined;
  backupFactor: MfaVerification | undefined;
  webAuthnFactors: MfaVerification[];
  hasOtherMfaFactor: boolean;
  refresh: () => Promise<void>;
}

export function useMfaList({
  onGetMfaVerifications,
  onError,
}: UseMfaListOptions): UseMfaListResult {
  const [mfaList, setMfaList] = useState<MfaVerification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Callback refs to avoid stale closures
  const onGetMfaVerificationsRef = useRef(onGetMfaVerifications);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onGetMfaVerificationsRef.current = onGetMfaVerifications;
    onErrorRef.current = onError;
  }, [onGetMfaVerifications, onError]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await onGetMfaVerificationsRef.current();
      if (result.ok) {
        setMfaList(result.data);
      } else {
        onErrorRef.current(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    void refresh();
  }, [refresh]);

  // Derived selectors
  const totpFactor = mfaList.find((v) => v.type === 'Totp');
  const backupFactor = mfaList.find((v) => v.type === 'BackupCode');
  const webAuthnFactors = mfaList.filter((v) => v.type === 'WebAuthn');
  const hasOtherMfaFactor = mfaList.some((v) => v.type === 'Totp' || v.type === 'WebAuthn');

  return {
    mfaList,
    isLoading,
    totpFactor,
    backupFactor,
    webAuthnFactors,
    hasOtherMfaFactor,
    refresh,
  };
}
