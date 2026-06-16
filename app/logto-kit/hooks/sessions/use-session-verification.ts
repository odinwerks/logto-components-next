'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { LogtoSession } from '../../logic/types';
import type { DataResult } from '../../logic/actions/safe';

export type VerifyPasswordFn = (
  password: string,
) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;

export type GetSessionsFn = (
  verificationRecordId: string,
  verificationTimestamp: number,
) => Promise<DataResult<LogtoSession[]>>;

export interface UseSessionVerificationOptions {
  onVerifyPassword: VerifyPasswordFn;
  onGetSessions: GetSessionsFn;
  onError: (message: string) => void;
}

export interface UseSessionVerificationResult {
  verificationRecordId: string | null;
  verificationExpiry: number;
  /** Derived: verificationRecordId !== null && Date.now() < verificationExpiry */
  isVerificationValid: boolean;
  /** Seconds remaining until verification expires, updated every second via setInterval */
  timeRemaining: number;
  sessions: LogtoSession[];
  loading: boolean;
  viewState: 'unverified' | 'loaded';
  verificationError: string;
  verifyAndLoad: (password: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  loadSessionsWith: (recordId: string, expiry: number) => Promise<void>;
  resetVerification: () => void;
}

/** Auth error codes that should force re-verification */
const AUTH_ERRORS = new Set(['VERIFICATION_FAILED', 'UNAUTHORIZED']);

export function useSessionVerification({
  onVerifyPassword,
  onGetSessions,
  onError,
}: UseSessionVerificationOptions): UseSessionVerificationResult {
  const [verificationRecordId, setVerificationRecordId] = useState<string | null>(null);
  const [verificationExpiry, setVerificationExpiry] = useState<number>(0);
  const [sessions, setSessions] = useState<LogtoSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewState, setViewState] = useState<'unverified' | 'loaded'>('unverified');
  const [verificationError, setVerificationError] = useState<string>('');

  // Store callbacks in refs to avoid stale closures (use-avatar-upload.ts pattern)
  const onVerifyPasswordRef = useRef(onVerifyPassword);
  const onGetSessionsRef = useRef(onGetSessions);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onVerifyPasswordRef.current = onVerifyPassword;
    onGetSessionsRef.current = onGetSessions;
    onErrorRef.current = onError;
  }, [onVerifyPassword, onGetSessions, onError]);

  // Track current time in state so isVerificationValid and timeRemaining stay reactive without
  // calling Date.now() directly in render (which would be an impure function call).
  const [now, setNow] = useState<number>(() => Date.now());

  // Tick `now` once per second while verification is active
  useEffect(() => {
    if (!verificationExpiry) return;
    const id = setInterval(() => { setNow(Date.now()); }, 1000);
    return () => clearInterval(id);
  }, [verificationExpiry]);

  // Derived per render — uses reactive `now` to avoid impure Date.now() call in render body
  const isVerificationValid = useMemo(
    () => verificationRecordId !== null && now < verificationExpiry,
    [verificationRecordId, now, verificationExpiry],
  );

  // Derived seconds-remaining counter (0 when expired or no verification active)
  const timeRemaining = useMemo(
    () => (verificationExpiry ? Math.max(0, Math.floor((verificationExpiry - now) / 1000)) : 0),
    [verificationExpiry, now],
  );

  const resetVerification = useCallback(() => {
    setVerificationRecordId(null);
    setVerificationExpiry(0);
    setViewState('unverified');
    setVerificationError('');
  }, []);

  // Auto-expiry: schedule reset when verification expires
  useEffect(() => {
    if (!verificationRecordId || !verificationExpiry) return;
    const timeUntilExpiry = verificationExpiry - Date.now();
    if (timeUntilExpiry <= 0) {
      // Defer to avoid synchronous setState inside effect body
      const t = setTimeout(() => { resetVerification(); }, 0);
      return () => clearTimeout(t);
    }
    const timer = setTimeout(() => {
      resetVerification();
    }, timeUntilExpiry);
    return () => clearTimeout(timer);
  }, [verificationRecordId, verificationExpiry, resetVerification]);

  // Time remaining countdown is now derived from `now` via useMemo above — no extra effect needed.

  const verifyAndLoad = useCallback(async (password: string): Promise<void> => {
    setLoading(true);
    setVerificationError('');

    const verifyResult = await onVerifyPasswordRef.current(password);
    if (!verifyResult.ok) {
      setVerificationError(verifyResult.error);
      setLoading(false);
      return;
    }

    const { verificationRecordId: vid, verificationTimestamp: ts } = verifyResult.data;
    setVerificationRecordId(vid);
    setVerificationExpiry(ts); // ts IS the expiresAt (future epoch ms)

    const sessionsResult = await onGetSessionsRef.current(vid, ts);
    if (!sessionsResult.ok) {
      // Bug 2 fix: on sessions fetch failure, reset verification so viewState stays 'unverified'
      onErrorRef.current(sessionsResult.error);
      setVerificationRecordId(null);
      setVerificationExpiry(0);
      setLoading(false);
      return;
    }

    setSessions(sessionsResult.data);
    setViewState('loaded');
    setLoading(false);
  }, []);

  const loadSessionsWith = useCallback(async (recordId: string, expiry: number): Promise<void> => {
    setLoading(true);
    const r = await onGetSessionsRef.current(recordId, expiry);
    if (!r.ok) {
      // Bug 3 fix: auth errors reset to unverified; other errors keep viewState 'loaded'
      if (AUTH_ERRORS.has(r.error)) {
        setViewState('unverified');
        setVerificationRecordId(null);
        setVerificationExpiry(0);
      } else {
        onErrorRef.current(r.error);
      }
      setLoading(false);
      return;
    }
    setSessions(r.data);
    setLoading(false);
  }, []);

  const loadSessions = useCallback(async (): Promise<void> => {
    // No-op if verification is not valid
    if (!verificationRecordId || Date.now() >= verificationExpiry) return;
    await loadSessionsWith(verificationRecordId, verificationExpiry);
  }, [verificationRecordId, verificationExpiry, loadSessionsWith]);

  return {
    verificationRecordId,
    verificationExpiry,
    isVerificationValid,
    timeRemaining,
    sessions,
    loading,
    viewState,
    verificationError,
    verifyAndLoad,
    loadSessions,
    loadSessionsWith,
    resetVerification,
  };
}
