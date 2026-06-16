'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser';
import type { ActionResult, DataResult } from '../../logic/actions/safe';
import { useAsyncGuard } from '../use-async-guard';
import type { VerificationToken } from './types';

export interface UsePasskeysFlowOptions {
  onVerifyPassword: (
    pw: string,
  ) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  onRequestWebAuthnRegistration: () => Promise<
    DataResult<{ registrationOptions: unknown; verificationRecordId: string }>
  >;
  onVerifyAndLinkWebAuthn: (
    payload: unknown,
    verRecordId: string,
    idRecordId: string,
    ts: number,
  ) => Promise<ActionResult>;
  onDeleteMfaVerification: (
    id: string,
    recordId: string,
    ts: number,
  ) => Promise<ActionResult>;
  onRenamePasskey: (
    id: string,
    name: string,
    recordId: string,
    ts: number,
  ) => Promise<ActionResult>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onRefreshMfa: () => Promise<void>;
  t: { mfa: Record<string, string>; security: Record<string, string> };
}

export interface UsePasskeysFlowResult {
  // Register flow
  registerStep: 'password' | 'loading' | null;
  registerError: string;
  // Delete flow (desktop)
  deleteStep: 'password' | 'loading' | null;
  deleteError: string;
  passkeyToDelete: string | null;
  // Rename flow (desktop)
  renameStep: 'password' | 'rename' | 'loading' | null;
  renameError: string;
  passkeyToRename: string | null;
  identityToken: VerificationToken | null;
  // Unified mobile action flow
  actionStep: 'password' | 'rename' | 'loading' | null;
  actionError: string;
  actionMode: 'rename' | 'remove';
  actionPasskeyId: string | null;
  actionIdentityToken: VerificationToken | null;
  // WebAuthn support detection
  webAuthnSupported: boolean;
  // Register actions
  openRegister: () => void;
  closeRegister: () => void;
  handleRegisterPassword: (pw: string) => Promise<void>;
  // Delete actions (desktop)
  openDelete: (passkeyId: string) => void;
  closeDelete: () => void;
  handleDeletePassword: (pw: string) => Promise<void>;
  // Rename actions (desktop)
  openRename: (passkeyId: string) => void;
  closeRename: () => void;
  handleRenamePassword: (pw: string) => Promise<void>;
  handleRenameSubmit: (name: string) => Promise<void>;
  // Unified mobile action
  openAction: (passkeyId: string, mode: 'rename' | 'remove') => void;
  closeAction: () => void;
  switchActionMode: (mode: 'rename' | 'remove') => void;
  handleActionPassword: (pw: string) => Promise<void>;
  handleActionRenameSubmit: (name: string) => Promise<void>;
}

export function usePasskeysFlow({
  onVerifyPassword,
  onRequestWebAuthnRegistration,
  onVerifyAndLinkWebAuthn,
  onDeleteMfaVerification,
  onRenamePasskey,
  onSuccess,
  onError,
  onRefreshMfa,
  t,
}: UsePasskeysFlowOptions): UsePasskeysFlowResult {
  // Register flow state
  const [registerStep, setRegisterStep] = useState<'password' | 'loading' | null>(null);
  const [registerError, setRegisterError] = useState<string>('');

  // Delete flow state
  const [deleteStep, setDeleteStep] = useState<'password' | 'loading' | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');
  const [passkeyToDelete, setPasskeyToDelete] = useState<string | null>(null);

  // Rename flow state
  const [renameStep, setRenameStep] = useState<'password' | 'rename' | 'loading' | null>(null);
  const [renameError, setRenameError] = useState<string>('');
  const [passkeyToRename, setPasskeyToRename] = useState<string | null>(null);
  const [identityToken, setIdentityToken] = useState<VerificationToken | null>(null);

  // Unified action flow state
  const [actionStep, setActionStep] = useState<'password' | 'rename' | 'loading' | null>(null);
  const [actionError, setActionError] = useState<string>('');
  const [actionMode, setActionMode] = useState<'rename' | 'remove'>('rename');
  const [actionPasskeyId, setActionPasskeyId] = useState<string | null>(null);
  const [actionIdentityToken, setActionIdentityToken] = useState<VerificationToken | null>(null);

  // WebAuthn support detection — lazy initializer avoids setState-in-effect
  const [webAuthnSupported] = useState<boolean>(() => {
    try {
      return browserSupportsWebAuthn();
    } catch {
      return false;
    }
  });

  // 4 separate generation counters
  const registerGuard = useAsyncGuard();
  const renameGuard = useAsyncGuard();
  const deleteGuard = useAsyncGuard();
  const actionGuard = useAsyncGuard();

  // Callback refs
  const onVerifyPasswordRef = useRef(onVerifyPassword);
  const onRequestWebAuthnRegistrationRef = useRef(onRequestWebAuthnRegistration);
  const onVerifyAndLinkWebAuthnRef = useRef(onVerifyAndLinkWebAuthn);
  const onDeleteMfaVerificationRef = useRef(onDeleteMfaVerification);
  const onRenamePasskeyRef = useRef(onRenamePasskey);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onRefreshMfaRef = useRef(onRefreshMfa);
  const tRef = useRef(t);
  useEffect(() => {
    onVerifyPasswordRef.current = onVerifyPassword;
    onRequestWebAuthnRegistrationRef.current = onRequestWebAuthnRegistration;
    onVerifyAndLinkWebAuthnRef.current = onVerifyAndLinkWebAuthn;
    onDeleteMfaVerificationRef.current = onDeleteMfaVerification;
    onRenamePasskeyRef.current = onRenamePasskey;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    onRefreshMfaRef.current = onRefreshMfa;
    tRef.current = t;
  }, [
    onVerifyPassword,
    onRequestWebAuthnRegistration,
    onVerifyAndLinkWebAuthn,
    onDeleteMfaVerification,
    onRenamePasskey,
    onSuccess,
    onError,
    onRefreshMfa,
    t,
  ]);

  // =========================================================================
  // Register flow
  // =========================================================================

  const openRegister = useCallback(() => {
    registerGuard.bump();
    setRegisterStep('password');
    setRegisterError('');
  }, [registerGuard]);

  const closeRegister = useCallback(() => {
    registerGuard.bump();
    setRegisterStep(null);
    setRegisterError('');
  }, [registerGuard]);

  const handleRegisterPassword = useCallback(
    async (pw: string) => {
      const capturedGen = registerGuard.capture();
      setRegisterStep('loading');
      setRegisterError('');

      // Step 1: verify password
      const verifyResult = await onVerifyPasswordRef.current(pw);
      if (registerGuard.isStale(capturedGen)) return;

      if (!verifyResult.ok) {
        setRegisterError(verifyResult.error);
        setRegisterStep('password');
        return;
      }

      const idToken: VerificationToken = {
        verificationRecordId: verifyResult.data.verificationRecordId,
        verificationTimestamp: verifyResult.data.verificationTimestamp,
      };

      // Step 2: request WebAuthn registration
      setRegisterStep('loading');
      const registrationResult = await onRequestWebAuthnRegistrationRef.current();
      if (registerGuard.isStale(capturedGen)) return;

      if (!registrationResult.ok) {
        onErrorRef.current(registrationResult.error);
        setRegisterStep(null);
        return;
      }

      const { registrationOptions, verificationRecordId: webAuthnRecordId } = registrationResult.data;

      // Step 3: perform WebAuthn ceremony
      try {
        if (registerGuard.isStale(capturedGen)) return;

        setRegisterStep('loading');
        const registrationResponse = await startRegistration({ optionsJSON: registrationOptions as Parameters<typeof startRegistration>[0]['optionsJSON'] });
        if (registerGuard.isStale(capturedGen)) return;

        // Step 4: verify and link
        setRegisterStep('loading');
        const linkResult = await onVerifyAndLinkWebAuthnRef.current(
          registrationResponse,
          webAuthnRecordId,
          idToken.verificationRecordId,
          idToken.verificationTimestamp,
        );
        if (registerGuard.isStale(capturedGen)) return;

        if (!linkResult.ok) {
          onErrorRef.current(linkResult.error);
          setRegisterStep(null);
          return;
        }

        onSuccessRef.current(tRef.current.mfa.passkeyAdded);
        setRegisterStep(null);
        await onRefreshMfaRef.current();
      } catch (err) {
        if (registerGuard.isStale(capturedGen)) return;
        if (err instanceof Error && err.name === 'NotAllowedError') {
          // User dismissed WebAuthn prompt — close silently
          setRegisterStep(null);
          return;
        }
        onErrorRef.current(err instanceof Error ? err.message : String(err));
        setRegisterStep(null);
      }
    },
    [registerGuard],
  );

  // =========================================================================
  // Delete flow (desktop)
  // =========================================================================

  const openDelete = useCallback(
    (passkeyId: string) => {
      deleteGuard.bump();
      setPasskeyToDelete(passkeyId);
      setDeleteStep('password');
      setDeleteError('');
    },
    [deleteGuard],
  );

  const closeDelete = useCallback(() => {
    deleteGuard.bump();
    setDeleteStep(null);
    setDeleteError('');
    setPasskeyToDelete(null);
  }, [deleteGuard]);

  const handleDeletePassword = useCallback(
    async (pw: string) => {
      const capturedGen = deleteGuard.capture();
      setDeleteStep('loading');
      setDeleteError('');

      const verifyResult = await onVerifyPasswordRef.current(pw);
      if (deleteGuard.isStale(capturedGen)) return;

      if (!verifyResult.ok) {
        setDeleteError(verifyResult.error);
        setDeleteStep('password');
        return;
      }

      const { verificationRecordId, verificationTimestamp } = verifyResult.data;
      const currentPasskeyId = passkeyToDelete;
      if (!currentPasskeyId) {
        setDeleteStep(null);
        return;
      }

      const deleteResult = await onDeleteMfaVerificationRef.current(
        currentPasskeyId,
        verificationRecordId,
        verificationTimestamp,
      );
      if (deleteGuard.isStale(capturedGen)) return;

      if (!deleteResult.ok) {
        onErrorRef.current(deleteResult.error);
        setDeleteStep(null);
        return;
      }

      onSuccessRef.current(tRef.current.mfa.passkeyDeleted);
      setDeleteStep(null);
      setPasskeyToDelete(null);
      await onRefreshMfaRef.current();
    },
    [deleteGuard, passkeyToDelete],
  );

  // =========================================================================
  // Rename flow (desktop)
  // =========================================================================

  const openRename = useCallback(
    (passkeyId: string) => {
      renameGuard.bump();
      setPasskeyToRename(passkeyId);
      setRenameStep('password');
      setRenameError('');
      setIdentityToken(null);
    },
    [renameGuard],
  );

  const closeRename = useCallback(() => {
    renameGuard.bump();
    setRenameStep(null);
    setRenameError('');
    setPasskeyToRename(null);
    setIdentityToken(null);
  }, [renameGuard]);

  const handleRenamePassword = useCallback(
    async (pw: string) => {
      const capturedGen = renameGuard.capture();
      setRenameStep('loading');
      setRenameError('');

      const verifyResult = await onVerifyPasswordRef.current(pw);
      if (renameGuard.isStale(capturedGen)) return;

      if (!verifyResult.ok) {
        setRenameError(verifyResult.error);
        setRenameStep('password');
        return;
      }

      const token: VerificationToken = {
        verificationRecordId: verifyResult.data.verificationRecordId,
        verificationTimestamp: verifyResult.data.verificationTimestamp,
      };
      setIdentityToken(token);
      setRenameStep('rename');
    },
    [renameGuard],
  );

  const handleRenameSubmit = useCallback(
    async (name: string) => {
      const capturedGen = renameGuard.capture();
      setRenameStep('loading');

      const currentPasskeyId = passkeyToRename;
      const currentToken = identityToken;
      if (!currentPasskeyId || !currentToken) {
        setRenameStep(null);
        return;
      }

      const result = await onRenamePasskeyRef.current(
        currentPasskeyId,
        name,
        currentToken.verificationRecordId,
        currentToken.verificationTimestamp,
      );
      if (renameGuard.isStale(capturedGen)) return;

      if (!result.ok) {
        onErrorRef.current(result.error);
        setRenameStep(null);
        return;
      }

      onSuccessRef.current(tRef.current.mfa.passkeyRenamed);
      setRenameStep(null);
      setPasskeyToRename(null);
      setIdentityToken(null);
      await onRefreshMfaRef.current();
    },
    [renameGuard, passkeyToRename, identityToken],
  );

  // =========================================================================
  // Unified mobile action flow
  // =========================================================================

  const openAction = useCallback(
    (passkeyId: string, mode: 'rename' | 'remove') => {
      actionGuard.bump();
      setActionPasskeyId(passkeyId);
      setActionMode(mode);
      setActionStep('password');
      setActionError('');
      setActionIdentityToken(null);
    },
    [actionGuard],
  );

  const closeAction = useCallback(() => {
    actionGuard.bump();
    setActionStep(null);
    setActionError('');
    setActionPasskeyId(null);
    setActionIdentityToken(null);
  }, [actionGuard]);

  const switchActionMode = useCallback((mode: 'rename' | 'remove') => {
    setActionMode(mode);
  }, []);

  const handleActionPassword = useCallback(
    async (pw: string) => {
      const capturedGen = actionGuard.capture();
      setActionStep('loading');
      setActionError('');

      const verifyResult = await onVerifyPasswordRef.current(pw);
      if (actionGuard.isStale(capturedGen)) return;

      if (!verifyResult.ok) {
        setActionError(verifyResult.error);
        setActionStep('password');
        return;
      }

      const token: VerificationToken = {
        verificationRecordId: verifyResult.data.verificationRecordId,
        verificationTimestamp: verifyResult.data.verificationTimestamp,
      };

      const currentActionMode = actionMode;
      const currentPasskeyId = actionPasskeyId;

      if (currentActionMode === 'remove') {
        if (!currentPasskeyId) {
          setActionStep(null);
          return;
        }
        const deleteResult = await onDeleteMfaVerificationRef.current(
          currentPasskeyId,
          token.verificationRecordId,
          token.verificationTimestamp,
        );
        if (actionGuard.isStale(capturedGen)) return;

        if (!deleteResult.ok) {
          onErrorRef.current(deleteResult.error);
          setActionStep(null);
          return;
        }

        onSuccessRef.current(tRef.current.mfa.passkeyDeleted);
        setActionStep(null);
        setActionPasskeyId(null);
        await onRefreshMfaRef.current();
      } else {
        // rename mode: just store token and go to rename step
        setActionIdentityToken(token);
        setActionStep('rename');
      }
    },
    [actionGuard, actionMode, actionPasskeyId],
  );

  const handleActionRenameSubmit = useCallback(
    async (name: string) => {
      const capturedGen = actionGuard.capture();
      setActionStep('loading');

      const currentPasskeyId = actionPasskeyId;
      const currentToken = actionIdentityToken;
      if (!currentPasskeyId || !currentToken) {
        setActionStep(null);
        return;
      }

      const result = await onRenamePasskeyRef.current(
        currentPasskeyId,
        name,
        currentToken.verificationRecordId,
        currentToken.verificationTimestamp,
      );
      if (actionGuard.isStale(capturedGen)) return;

      if (!result.ok) {
        onErrorRef.current(result.error);
        setActionStep(null);
        return;
      }

      onSuccessRef.current(tRef.current.mfa.passkeyRenamed);
      setActionStep(null);
      setActionPasskeyId(null);
      setActionIdentityToken(null);
      await onRefreshMfaRef.current();
    },
    [actionGuard, actionPasskeyId, actionIdentityToken],
  );

  return {
    registerStep,
    registerError,
    deleteStep,
    deleteError,
    passkeyToDelete,
    renameStep,
    renameError,
    passkeyToRename,
    identityToken,
    actionStep,
    actionError,
    actionMode,
    actionPasskeyId,
    actionIdentityToken,
    webAuthnSupported,
    openRegister,
    closeRegister,
    handleRegisterPassword,
    openDelete,
    closeDelete,
    handleDeletePassword,
    openRename,
    closeRename,
    handleRenamePassword,
    handleRenameSubmit,
    openAction,
    closeAction,
    switchActionMode,
    handleActionPassword,
    handleActionRenameSubmit,
  };
}
