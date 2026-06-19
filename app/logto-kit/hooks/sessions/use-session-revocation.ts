'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ActionResult, DataResult } from '../../logic/actions/safe';

export type RevokeSessionFn = (
  sessionId: string,
  identityVerificationRecordId: string,
  verificationTimestamp: number,
  revokeGrantsTarget?: 'all' | 'firstParty',
) => Promise<ActionResult>;

export type RevokeAllSessionsFn = (
  verificationRecordId: string,
  verificationTimestamp: number,
) => Promise<ActionResult>;

export type ReloadSessionsFn = (recordId: string, expiry: number) => Promise<void>;

export interface UseSessionRevocationOptions {
  verificationRecordId: string | null;
  verificationExpiry: number;
  onVerifyPassword: (
    password: string,
  ) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  onRevokeSession: RevokeSessionFn;
  onRevokeAllOtherSessions: RevokeAllSessionsFn;
  onReloadSessions: ReloadSessionsFn;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export interface UseSessionRevocationResult {
  revokingId: string | null;
  revokingAll: boolean;
  showGcAllModal: boolean;
  gcAllLoading: boolean;
  revokeError: string;
  revokeModalStep: { kind: 'password' } | { kind: 'loading'; message: string } | null;
  startRevoke: (sessionId: string) => void;
  handleRevokePassword: (password: string) => Promise<void>;
  cancelRevoke: () => void;
  openGcAllModal: () => void;
  closeGcAllModal: () => void;
  confirmGcAll: () => void;
}

export function useSessionRevocation({
  verificationRecordId,
  verificationExpiry,
  onVerifyPassword,
  onRevokeSession,
  onRevokeAllOtherSessions,
  onReloadSessions,
  onSuccess,
  onError,
}: UseSessionRevocationOptions): UseSessionRevocationResult {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [showGcAllModal, setShowGcAllModal] = useState(false);
  const [gcAllLoading, setGcAllLoading] = useState(false);
  const [revokeError, setRevokeError] = useState<string>('');
  const [revokeModalStep, setRevokeModalStep] = useState<
    { kind: 'password' } | { kind: 'loading'; message: string } | null
  >(null);

  // Persists the revoke target through failed attempts so retries send the correct session ID (Bug 1 fix)
  const revokeTargetRef = useRef<{ kind: 'single'; id: string } | { kind: 'all' } | null>(null);

  // Store verification credentials in refs so handleRevokePassword reads the latest value
  const verificationRecordIdRef = useRef(verificationRecordId);
  const verificationExpiryRef = useRef(verificationExpiry);
  useEffect(() => {
    verificationRecordIdRef.current = verificationRecordId;
    verificationExpiryRef.current = verificationExpiry;
  }, [verificationRecordId, verificationExpiry]);

  // Store callbacks in refs (use-avatar-upload.ts pattern)
  const onVerifyPasswordRef = useRef(onVerifyPassword);
  const onRevokeSessionRef = useRef(onRevokeSession);
  const onRevokeAllOtherSessionsRef = useRef(onRevokeAllOtherSessions);
  const onReloadSessionsRef = useRef(onReloadSessions);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onVerifyPasswordRef.current = onVerifyPassword;
    onRevokeSessionRef.current = onRevokeSession;
    onRevokeAllOtherSessionsRef.current = onRevokeAllOtherSessions;
    onReloadSessionsRef.current = onReloadSessions;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [
    onVerifyPassword,
    onRevokeSession,
    onRevokeAllOtherSessions,
    onReloadSessions,
    onSuccess,
    onError,
  ]);

  const startRevoke = useCallback((sessionId: string) => {
    // Guard: prevent overwriting revokeTarget if one is already active
    if (revokeTargetRef.current !== null) return;
    // Guard: prevent starting if already revoking
    if (revokingId !== null || revokingAll) return;

    revokeTargetRef.current = { kind: 'single', id: sessionId };
    setRevokingId(sessionId);
    setRevokeError('');
    setRevokeModalStep({ kind: 'password' });
  }, [revokingId, revokingAll]);

  const handleRevokePassword = useCallback(async (password: string): Promise<void> => {
    setRevokeModalStep({ kind: 'loading', message: 'Processing...' });
    setRevokeError('');

    // Read latest verification credentials from refs
    let vid = verificationRecordIdRef.current;
    let vts = verificationExpiryRef.current;

    // Re-verify if credentials are missing or expired
    if (!vid || Date.now() >= vts) {
      const verifyResult = await onVerifyPasswordRef.current(password);
      if (!verifyResult.ok) {
        setRevokeError(verifyResult.error);
        setRevokeModalStep({ kind: 'password' });
        // Clear revokingId in finally-equivalent path
        setRevokingId(null);
        return;
      }
      vid = verifyResult.data.verificationRecordId;
      vts = verifyResult.data.verificationTimestamp;
    }

    const target = revokeTargetRef.current;
    if (!target) {
      setRevokeModalStep(null);
      return;
    }

    if (target.kind === 'all') {
      setRevokingAll(true);
      setGcAllLoading(true);
      const revokeResult = await onRevokeAllOtherSessionsRef.current(vid, vts);
      if (!revokeResult.ok) {
        setRevokeError(revokeResult.error);
        setRevokeModalStep({ kind: 'password' });
        setRevokingAll(false);
        setGcAllLoading(false);
        return;
      }
    } else {
      // Single session revocation
      let singleOk = false;
      try {
        const revokeResult = await onRevokeSessionRef.current(target.id, vid, vts, 'firstParty');
        if (!revokeResult.ok) {
          setRevokeError(revokeResult.error);
          setRevokeModalStep({ kind: 'password' });
          return;
        }
        singleOk = true;
      } finally {
        // Bug LOG-003 fix: clear revokingId in finally, not just success path
        if (!singleOk) {
          setRevokingId(null);
        }
      }
    }

    // Success path
    onSuccessRef.current('Session revoked successfully');
    await onReloadSessionsRef.current(vid, vts);
    setRevokeModalStep(null);
    revokeTargetRef.current = null;
    setRevokingId(null);
    setRevokingAll(false);
    setGcAllLoading(false);
  }, []);

  const cancelRevoke = useCallback(() => {
    setRevokeModalStep(null);
    revokeTargetRef.current = null;
    setRevokingId(null);
    setRevokeError('');
  }, []);

  const openGcAllModal = useCallback(() => {
    setShowGcAllModal(true);
  }, []);

  const closeGcAllModal = useCallback(() => {
    // No-op if GC All is currently loading
    if (revokingAll) return;
    setShowGcAllModal(false);
  }, [revokingAll]);

  const confirmGcAll = useCallback(() => {
    revokeTargetRef.current = { kind: 'all' };
    setShowGcAllModal(false);
    setRevokeModalStep({ kind: 'password' });
    setRevokeError('');
  }, []);

  return {
    revokingId,
    revokingAll,
    showGcAllModal,
    gcAllLoading,
    revokeError,
    revokeModalStep,
    startRevoke,
    handleRevokePassword,
    cancelRevoke,
    openGcAllModal,
    closeGcAllModal,
    confirmGcAll,
  };
}
