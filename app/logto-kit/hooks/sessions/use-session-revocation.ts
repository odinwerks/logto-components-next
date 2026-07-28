'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ActionResult, DataResult } from '../../logic/actions/safe';

export type RevokeSessionFn = (
  sessionId: string,
  identityVerificationRecordId: string,
  revokeGrantsTarget?: 'all' | 'firstParty',
) => Promise<ActionResult>;

export type RevokeAllSessionsFn = (
  verificationRecordId: string,
) => Promise<ActionResult>;

export type ReloadSessionsFn = (recordId: string) => Promise<void>;

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
  revokeModalStep: { kind: 'password' } | null;
  revokeLoading: boolean;
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
    { kind: 'password' } | null
  >(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Persists the revoke target through failed attempts so retries send the correct session ID (Bug 1 fix)
  const revokeTargetRef = useRef<{ kind: 'single'; id: string } | { kind: 'all' } | null>(null);
  // Cancellation can be followed by a new revoke while an earlier callback is
  // still pending. Keep stale callbacks from mutating the new flow's state.
  const nextRevokeAttemptIdRef = useRef(0);
  const activeRevokeAttemptIdRef = useRef<number | null>(null);
  // Cancellation must make the UI immediately retryable, but cannot cancel an
  // already-dispatched destructive request. Keep that request's target locked
  // until it settles so a same-target retry cannot issue a duplicate revoke.
  const inFlightRevokeTargetsRef = useRef(new Set<string>());

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
    setRevokeLoading(false);
  }, [revokingId, revokingAll]);

  const handleRevokePassword = useCallback(async (password: string): Promise<void> => {
    // The UI disables the submit control while loading, but keep the state
    // machine safe if the callback is invoked twice before React re-renders.
    if (activeRevokeAttemptIdRef.current !== null) return;

    const target = revokeTargetRef.current;
    const targetKey = target
      ? target.kind === 'all'
        ? 'all'
        : `single:${target.id}`
      : null;
    if (targetKey && inFlightRevokeTargetsRef.current.has(targetKey)) return;

    const attemptId = ++nextRevokeAttemptIdRef.current;
    activeRevokeAttemptIdRef.current = attemptId;
    const isActiveAttempt = () => activeRevokeAttemptIdRef.current === attemptId;
    setRevokeLoading(true);
    setRevokeError('');

    // HOOK-002: outer try/catch/finally guarantees ALL loading/idle flags reset on
    // business-error (!ok), transport rejection, and reload rejection alike.
    // The target is retained for retry on failure (not cleared); cleared only on success.
    let revokeSucceeded = false;
    let inFlightTargetKey: string | null = null;
    try {
      // Read latest verification credentials from refs
      let vid = verificationRecordIdRef.current;
      let vts = verificationExpiryRef.current;

      // Re-verify if credentials are missing or expired
      if (!vid || Date.now() >= vts) {
        const verifyResult = await onVerifyPasswordRef.current(password);
        if (!isActiveAttempt()) return;
        if (!verifyResult.ok) {
          setRevokeError(verifyResult.error);
          return;
        }
        vid = verifyResult.data.verificationRecordId;
        vts = verifyResult.data.verificationTimestamp;
      }

      if (!target) {
        setRevokeModalStep(null);
        return;
      }

      if (target.kind === 'all') {
        setRevokingAll(true);
        setGcAllLoading(true);
        const dispatchedTargetKey = 'all';
        inFlightTargetKey = dispatchedTargetKey;
        inFlightRevokeTargetsRef.current.add(dispatchedTargetKey);
        const revokeResult = await onRevokeAllOtherSessionsRef.current(vid);
        if (!isActiveAttempt()) return;
        if (!revokeResult.ok) {
          setRevokeError(revokeResult.error);
          return;
        }
      } else {
        // Single session revocation
        const dispatchedTargetKey = `single:${target.id}`;
        inFlightTargetKey = dispatchedTargetKey;
        inFlightRevokeTargetsRef.current.add(dispatchedTargetKey);
        const revokeResult = await onRevokeSessionRef.current(target.id, vid, 'firstParty');
        if (!isActiveAttempt()) return;
        if (!revokeResult.ok) {
          setRevokeError(revokeResult.error);
          return;
        }
      }

      // Success path — revoke succeeded; reload then tear down.
      // NOTE: destructive calls use the record ID (`vid`) only, never a client
      // timestamp — server-sealed verification model is preserved (BUG-001).
      revokeSucceeded = true;
      onSuccessRef.current('Session revoked successfully');
      await onReloadSessionsRef.current(vid);
      if (!isActiveAttempt()) return;
    } catch (err) {
      // HOOK-002: transport/rejected callback fallback. Surface the error and
      // retain the target + modal for retry. finally resets every loading flag.
      if (isActiveAttempt()) {
        setRevokeError(err instanceof Error ? err.message : 'Unexpected error');
      }
    } finally {
      // This guard tracks the dispatched operation rather than its UI attempt,
      // so it is deliberately cleared even after cancelRevoke invalidates the
      // active attempt.
      if (inFlightTargetKey) {
        inFlightRevokeTargetsRef.current.delete(inFlightTargetKey);
      }
      // cancelRevoke invalidates the active attempt. A stale completion must
      // not reset a newer target or overwrite its error/loading state.
      if (!isActiveAttempt()) return;
      activeRevokeAttemptIdRef.current = null;
      // Always reset loading/idle flags so the UI can never get stuck.
      setRevokeLoading(false);
      setRevokingAll(false);
      setGcAllLoading(false);
      if (revokeSucceeded) {
        // Revoke (and reload) completed: tear down modal + target.
        setRevokeModalStep(null);
        revokeTargetRef.current = null;
        setRevokingId(null);
      } else {
        // Failure/rejection: clear the per-session spinner but retain target +
        // modal so the user can retry the SAME session (Bug 1 / LOG-003).
        setRevokingId(null);
      }
    }
  }, []);

  const cancelRevoke = useCallback(() => {
    // HOOK-002: clear ALL flags (previously left revokingAll/gcAllLoading stuck,
    // which also blocked closeGcAllModal and startRevoke guards).
    activeRevokeAttemptIdRef.current = null;
    setShowGcAllModal(false);
    setRevokeModalStep(null);
    setRevokeLoading(false);
    setRevokingAll(false);
    setGcAllLoading(false);
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
    setRevokeLoading(false);
  }, []);

  return {
    revokingId,
    revokingAll,
    showGcAllModal,
    gcAllLoading,
    revokeError,
    revokeModalStep,
    revokeLoading,
    startRevoke,
    handleRevokePassword,
    cancelRevoke,
    openGcAllModal,
    closeGcAllModal,
    confirmGcAll,
  };
}
