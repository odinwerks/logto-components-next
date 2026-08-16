'use client';

import { useState, useCallback, useRef, useEffect, useId } from 'react';
import type { UserData, PatToken, VerificationPurpose } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import { FONT_SANS, FONT_MONO } from '../../../themes';
import type { Translations } from '../../../locales';
import { KeyRound, Plus, Pencil, Trash2, RefreshCw, Copy, Check, AlertTriangle } from 'lucide-react';
import { Button } from '../../shared/Button';
import { Input } from '../../shared/Input';
import { AnimatePresence, Pulse } from '../../shared/motion';
import { FlowModal, PasswordVerifyModal, PasswordModalStep } from '../shared/FlowModal';
import { Card, IconBox, Lbl } from '../shared/primitives';
import type { ActionResult, DataResult } from '../../../logic/actions/safe';
import { mapErrorCode } from '../../../logic/map-error-toast';

// ─── Hardcoded design tokens ───
const DASHBOARD_RADIUS = '0';

const VERIFICATION_REJECTION_ERRORS = new Set([
  'VERIFICATION_EXPIRED',
  'VERIFICATION_FAILED',
  'VERIFICATION_REQUIRED',
  'MISSING_VERIFICATION',
]);

// Errors returned by the PAT list endpoint that invalidate the cached
// verification record and force re-verification (sessions-tab parity, extended
// with the purpose-scoped codes the server can now emit).
const LIST_INVALIDATION_ERRORS = new Set([
  'VERIFICATION_FAILED',
  'VERIFICATION_EXPIRED',
  'VERIFICATION_REQUIRED',
  'MISSING_VERIFICATION',
  'UNAUTHORIZED',
]);

/**
 * Canonical error-code → localized-message mapper (logic/map-error-toast).
 * Falls back through verbosity tiers so no untranslated codes are rendered.
 */
const mapError = (code: string, t: Translations): string => mapErrorCode(code, t);

/** Extract a safe error code from a rejected promise for localized display. */
function rejectedErrorCode(error: unknown, fallback: string): string {
  const codeLike = (value: string): string =>
    /^[A-Z][A-Z0-9_]*$/.test(value) ? value : fallback;

  if (typeof error === 'string') return codeLike(error);
  if (error instanceof Error && error.message) return codeLike(error.message);
  if (error && typeof error === 'object' && 'error' in error && typeof error.error === 'string') {
    return codeLike(error.error);
  }
  return fallback;
}

type PatExpiryPreset = 'never' | '30d' | '60d' | '90d' | '1y';

const EXPIRY_PRESETS: Array<{ id: PatExpiryPreset; days: number | null; labelKey: 'neverExpires' | 'expiry30Days' | 'expiry60Days' | 'expiry90Days' | 'expiry1Year' }> = [
  { id: 'never', days: null, labelKey: 'neverExpires' },
  { id: '30d', days: 30, labelKey: 'expiry30Days' },
  { id: '60d', days: 60, labelKey: 'expiry60Days' },
  { id: '90d', days: 90, labelKey: 'expiry90Days' },
  { id: '1y', days: 365, labelKey: 'expiry1Year' },
];

const DAY_MS = 86_400_000;

interface DevTabProps {
  userData: UserData;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  mobmode?: number;
  onGetPatTokens: (verificationRecordId: string) => Promise<DataResult<PatToken[]>>;
  onCreatePatToken: (name: string, expiresAt: number | null, verificationRecordId: string) => Promise<DataResult<{ token: PatToken; value: string }>>;
  onRenamePatToken: (currentName: string, name: string, verificationRecordId: string) => Promise<ActionResult>;
  onDeletePatToken: (name: string, verificationRecordId: string) => Promise<ActionResult>;
  onVerifyPassword: (password: string, purpose?: VerificationPurpose) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  /** Whether this tab is the currently-visible tab in the shell. Gates auto-open of PasswordVerifyModal. */
  isActive?: boolean;
  /** Called when the user closes/dismisses the view-purpose PasswordVerifyModal without successfully verifying. */
  onVerificationDismissed?: () => void;
}

type PendingMutation =
  | { kind: 'create'; name: string; expiresAt: number | null }
  | { kind: 'rename'; currentName: string; name: string }
  | { kind: 'delete'; name: string };

function formatDate(input: number | string): string {
  const date = typeof input === 'string' ? new Date(input) : new Date(input < 1e12 ? input * 1000 : input);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── CreatePatModal ──────────────────────────────────────────────────────────
function CreatePatModal({
  onCancel,
  onSubmit,
  loading,
  error,
  t,
  mode,
  colors,
}: {
  onCancel: () => void;
  onSubmit: (name: string, expiresAt: number | null) => void;
  loading: boolean;
  error: string;
  t: Translations;
  mode: 'dark' | 'light';
  colors: ThemeColors;
}) {
  const c = colors;
  const [name, setName] = useState('');
  const [preset, setPreset] = useState<PatExpiryPreset>('never');
  const [localError, setLocalError] = useState('');
  const inputId = useId();
  const errorId = useId();

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setLocalError(mapError('INVALID_PAT_NAME', t)); return; }
    if (trimmed.length > 256) { setLocalError(mapError('PAT_NAME_TOO_LONG', t)); return; }
    setLocalError('');
    const selected = EXPIRY_PRESETS.find((p) => p.id === preset);
    const expiresAt = selected?.days ? Date.now() + selected.days * DAY_MS : null;
    onSubmit(trimmed, expiresAt);
  };
  const close = () => { if (!loading) onCancel(); };

  return (
    <FlowModal
      title={t.dev.createToken}
      subtitle={t.dev.createDesc}
      step={{ kind: 'value' }}
      onValueSubmit={submit}
      valueSubmitDisabled={!name.trim()}
      valueSubmitLabel={t.dev.createToken}
      onPasswordSubmit={() => {}}
      onClose={close}
      loading={loading}
      mode={mode}
      colors={colors}
      t={t}
      extra={(
        <>
          <Lbl colors={colors} htmlFor={inputId}>{t.dev.tokenName}</Lbl>
          <Input
            id={inputId}
            value={name}
            onChange={(e) => { setName(e.target.value); setLocalError(''); }}
            placeholder={t.dev.namePlaceholder}
            hasError={!!localError || !!error}
            describedby={(localError || error) ? errorId : undefined}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim() && !loading) submit(); }}
            mode={mode}
            colors={colors}
            maxLength={256}
            disabled={loading}
          />
          {(localError || error) && (
            <div role="alert" id={errorId} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem', fontFamily: FONT_SANS, fontSize: '0.75rem', color: c.accentRed }}>
              <AlertTriangle size={13} color={c.accentRed} strokeWidth={1.5} /> {localError || error}
            </div>
          )}
          <div style={{ marginTop: '1rem' }}>
            <Lbl colors={colors}>{t.dev.expiresLabel}</Lbl>
            <div role="radiogroup" aria-label={t.dev.expiresLabel} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {EXPIRY_PRESETS.map((p) => {
                const isSelected = preset === p.id;
                return (
                  <button
                    key={p.id}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setPreset(p.id)}
                    disabled={loading}
                    style={{
                      padding: '0.3125rem 0.75rem',
                      fontSize: '0.6875rem',
                      fontFamily: FONT_SANS,
                      fontWeight: 500,
                      border: `1px solid ${isSelected ? c.accentBlue : c.borderColor}`,
                      background: isSelected ? `${c.accentBlue}1f` : 'transparent',
                      color: isSelected ? c.accentBlue : c.textSecondary,
                      borderRadius: '0.25rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    {t.dev[p.labelKey]}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    />
  );
}

// ─── RenamePatModal ──────────────────────────────────────────────────────────
function RenamePatModal({
  currentName,
  onCancel,
  onSubmit,
  loading,
  error,
  t,
  mode,
  colors,
}: {
  currentName: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
  loading: boolean;
  error: string;
  t: Translations;
  mode: 'dark' | 'light';
  colors: ThemeColors;
}) {
  const c = colors;
  const [name, setName] = useState(currentName);
  const [localError, setLocalError] = useState('');
  const inputId = useId();
  const errorId = useId();

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setLocalError(mapError('INVALID_PAT_NAME', t)); return; }
    if (trimmed.length > 256) { setLocalError(mapError('PAT_NAME_TOO_LONG', t)); return; }
    setLocalError('');
    onSubmit(trimmed);
  };
  const close = () => { if (!loading) onCancel(); };

  return (
    <FlowModal
      title={t.dev.renameTitle}
      subtitle={t.dev.renameDesc}
      step={{ kind: 'value' }}
      onValueSubmit={submit}
      valueSubmitDisabled={!name.trim()}
      valueSubmitLabel={t.dev.save}
      onPasswordSubmit={() => {}}
      onClose={close}
      loading={loading}
      mode={mode}
      colors={colors}
      t={t}
      extra={(
        <>
          <Lbl colors={colors} htmlFor={inputId}>{t.dev.newNameLabel}</Lbl>
          <Input
            id={inputId}
            value={name}
            onChange={(e) => { setName(e.target.value); setLocalError(''); }}
            hasError={!!localError || !!error}
            describedby={(localError || error) ? errorId : undefined}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim() && !loading) submit(); }}
            mode={mode}
            colors={colors}
            maxLength={256}
            disabled={loading}
          />
          {(localError || error) && (
            <div role="alert" id={errorId} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem', fontFamily: FONT_SANS, fontSize: '0.75rem', color: c.accentRed }}>
              <AlertTriangle size={13} color={c.accentRed} strokeWidth={1.5} /> {localError || error}
            </div>
          )}
        </>
      )}
    />
  );
}

// ─── DeletePatConfirmModal ───────────────────────────────────────────────────
function DeletePatConfirmModal({
  name,
  onCancel,
  onConfirm,
  loading,
  t,
  mode,
  colors,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
  t: Translations;
  mode: 'dark' | 'light';
  colors: ThemeColors;
}) {
  const close = () => { if (!loading) onCancel(); };

  return (
    <FlowModal
      title={t.dev.deleteTitle}
      subtitle={t.dev.deleteDesc.replace('{name}', name)}
      step={{ kind: 'value' }}
      onValueSubmit={onConfirm}
      valueSubmitLabel={t.dev.delete}
      onPasswordSubmit={() => {}}
      onClose={close}
      loading={loading}
      mode={mode}
      colors={colors}
      t={t}
      danger
    />
  );
}

// ─── PatValueModal (one-time token value) ────────────────────────────────────
function PatValueModal({
  value,
  onClose,
  t,
  mode,
  colors,
}: {
  value: string;
  onClose: () => void;
  t: Translations;
  mode: 'dark' | 'light';
  colors: ThemeColors;
}) {
  const c = colors;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — the user can still select the text manually.
    }
  };

  return (
    <FlowModal
      title={t.dev.valueTitle}
      step={{ kind: 'value' }}
      onPasswordSubmit={() => {}}
      onClose={onClose}
      hideValueSubmit
      mode={mode}
      colors={colors}
      t={t}
      extra={(
        <div style={{
          position: 'relative',
          background: c.bgPrimary,
          border: `1px solid ${c.borderColor}`,
          borderRadius: '0.25rem',
          padding: '0.625rem 3rem 0.625rem 0.75rem',
        }}>
          <pre style={{
            margin: 0,
            fontFamily: FONT_MONO,
            fontSize: '0.75rem',
            lineHeight: 1.5,
            color: c.textPrimary,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            userSelect: 'text',
          }}>
            {value}
          </pre>
          <button
            onClick={handleCopy}
            aria-label={copied ? t.common.copied : t.common.copy}
            title={t.common.copy}
            style={{
              position: 'absolute',
              top: '50%',
              right: '0.5rem',
              transform: 'translateY(-50%)',
              background: c.bgSecondary,
              border: `1px solid ${c.borderColor}`,
              borderRadius: '0.25rem',
              padding: '0.25rem',
              cursor: 'pointer',
              color: copied ? c.accentGreen : c.textTertiary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
          </button>
        </div>
      )}
    />
  );
}

// ─── DevTab ──────────────────────────────────────────────────────────────────
export function DevTab({
  userData: _userData,
  mode,
  colors,
  t,
  mobmode,
  isActive = false,
  onVerificationDismissed,
  onGetPatTokens,
  onCreatePatToken,
  onRenamePatToken,
  onDeletePatToken,
  onVerifyPassword,
  onSuccess,
  onError,
}: DevTabProps) {
  const isMobile = mobmode === 1;
  const c = colors;
  const T = {
    font: FONT_SANS,
    mono: FONT_MONO,
    text: c.textPrimary,
    sub: c.textSecondary,
    muted: c.textTertiary,
    bg: c.bgSecondary,
    raised: c.bgTertiary,
    border: c.borderColor,
  };

  const [tokens, setTokens] = useState<PatToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewState, setViewState] = useState<'unverified' | 'loaded'>('unverified');

  const [modalStep, setModalStep] = useState<PasswordModalStep | null>(null);
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalPurpose, setModalPurpose] = useState<'view' | 'action'>('view');
  /** True only while the mutation server call itself is in flight — the one non-cancelable phase. */
  const [mutationLoading, setMutationLoading] = useState(false);
  // Render-facing mirror of mutationRef ownership. The ref provides atomic
  // event/async guards; state drives disabled controls without reading refs
  // during render (and guarantees the lock state re-renders immediately).
  const [mutationOwned, setMutationOwned] = useState(false);

  const [verificationRecordId, setVerificationRecordId] = useState<string | null>(null);
  // verificationExpiry is the server-derived expiresAt (from onVerifyPassword),
  // used ONLY for client UX (auto-invalidate timer + isVerificationValid gate).
  // The authoritative staleness check runs server-side via the sealed
  // verification cookie; this client value is not trusted back.
  const [verificationExpiry, setVerificationExpiry] = useState<number>(0);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showRenameModal, setShowRenameModal] = useState<PatToken | null>(null);
  const [renameError, setRenameError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState<PatToken | null>(null);
  const [createdValue, setCreatedValue] = useState<{ token: PatToken; value: string } | null>(null);

  // Exclusive ownership of the staged/in-flight mutation. Starting a new
  // mutation while one exists is a no-op. The staged action survives every
  // recoverable failure so drafts and targets are preserved by construction.
  const mutationRef = useRef<PendingMutation | null>(null);
  // Generation counter (security.tsx pattern): bumped on open/close/reset.
  // Every async continuation after an await compares the captured generation
  // and silently aborts when stale.
  const opGenRef = useRef(0);
  // React loading state renders the lock, but same-turn Enter/click/direct
  // submissions need synchronous ownership before React can commit a render.
  // The object identity prevents an older generation's finally block from
  // releasing a newer generation's claim.
  const passwordSubmitLatchRef = useRef<{ gen: number; owner: symbol } | null>(null);
  // Identifies the latest list request so an older request cannot clear the
  // loading state owned by a newer one.
  const listRequestRef = useRef(0);
  // Dismissal latch: set when the user closes the view-purpose modal while
  // unverified. Suppresses auto-open until the tab is re-entered.
  const dismissedRef = useRef(false);

  // eslint-disable-next-line react-hooks/purity
  const isVerificationValid = Boolean(verificationRecordId && Date.now() < verificationExpiry);

  // True while the action-purpose password overlay is up: the source modal
  // underneath stays mounted but must be locked (loading/disabled).
  const actionOverlayOpen = modalStep !== null && modalPurpose === 'action';

  // Auto-invalidate verification when it expires, forcing re-verification
  useEffect(() => {
    if (!verificationRecordId || !verificationExpiry) return;
    const timeUntilExpiry = verificationExpiry - Date.now();
    if (timeUntilExpiry > 0) {
      const timer = setTimeout(() => {
        setTokens([]);
        setVerificationRecordId(null);
        setVerificationExpiry(0);
        setViewState('unverified');
      }, timeUntilExpiry);
      return () => clearTimeout(timer);
    }
  }, [verificationRecordId, verificationExpiry]);

  // Latch resets on tab re-entry.
  useEffect(() => {
    if (!isActive) dismissedRef.current = false;
  }, [isActive]);

  // Invalidate every continuation if the component is removed while an
  // operation is pending. React ignores state writes after unmount, but the
  // generation check also prevents a late verification from starting a PAT
  // mutation.
  useEffect(() => () => {
    opGenRef.current++;
  }, []);

  const invalidateView = useCallback(() => {
    setTokens([]);
    setViewState('unverified');
    setVerificationRecordId(null);
    setVerificationExpiry(0);
  }, []);

  const startViewVerification = useCallback(() => {
    opGenRef.current++;
    dismissedRef.current = false;
    setModalPurpose('view');
    setModalStep({ kind: 'password' });
    setModalError('');
    setModalLoading(false);
  }, []);

  // Auto-open password modal when the tab becomes active and is unverified —
  // unless the user explicitly dismissed it (latch).
  useEffect(() => {
    if (isActive && viewState === 'unverified' && !loading && !modalStep && !dismissedRef.current) {
      startViewVerification();
    }
  }, [isActive, viewState, loading, modalStep, startViewVerification]);

  const verifyAndLoad = useCallback(async (password: string, gen: number) => {
    let listRequest = 0;
    try {
      const verifyResult = await onVerifyPassword(password, 'view');
      if (opGenRef.current !== gen) return;
      if (!verifyResult.ok) {
        setModalError(mapError(verifyResult.error, t));
        setViewState('unverified');
        return;
      }
      const { verificationRecordId: vid, verificationTimestamp: ts } = verifyResult.data;
      setVerificationRecordId(vid);
      setVerificationExpiry(ts);

      listRequest = ++listRequestRef.current;
      setLoading(true);
      const result = await onGetPatTokens(vid);
      if (opGenRef.current !== gen) return;
      if (!result.ok) {
        // Keep the modal open with the mapped error so the user can re-prompt
        // instead of closing silently.
        onError(mapError(result.error, t));
        setModalError(mapError(result.error, t));
        if (LIST_INVALIDATION_ERRORS.has(result.error)) {
          invalidateView();
        }
        return;
      }
      setTokens(result.data);
      setViewState('loaded');
      setModalStep(null);
    } catch (error) {
      if (opGenRef.current !== gen) return;
      const message = mapError(rejectedErrorCode(error, 'PAT_FETCH_FAILED'), t);
      setModalError(message);
      setViewState('unverified');
      onError(message);
    } finally {
      if (listRequest !== 0 && listRequestRef.current === listRequest) {
        setLoading(false);
      }
    }
  }, [onVerifyPassword, onGetPatTokens, onError, invalidateView, t]);

  const loadTokens = useCallback(async (recordId?: string, expectedGen?: number) => {
    const id = recordId ?? verificationRecordId;
    if (!id) return;
    if (!recordId && !isVerificationValid) return;
    const gen = expectedGen ?? opGenRef.current;
    if (opGenRef.current !== gen) return;
    const listRequest = ++listRequestRef.current;

    setLoading(true);
    try {
      const r = await onGetPatTokens(id);
      if (opGenRef.current !== gen) return;
      if (!r.ok) {
        onError(mapError(r.error, t));
        if (LIST_INVALIDATION_ERRORS.has(r.error)) {
          invalidateView();
        }
        return;
      }
      setTokens(r.data);
    } catch (error) {
      if (opGenRef.current !== gen) return;
      // Rejected promises are localized and never clear createdValue — the
      // one-time token value must survive a failed best-effort refresh.
      onError(mapError(rejectedErrorCode(error, 'FETCH_FAILED'), t));
    } finally {
      if (listRequestRef.current === listRequest) setLoading(false);
    }
  }, [verificationRecordId, onGetPatTokens, onError, isVerificationValid, invalidateView, t]);

  const handleRefresh = useCallback(async () => {
    if (!isVerificationValid) {
      invalidateView();
      return;
    }
    const gen = opGenRef.current;
    await loadTokens(undefined, gen);
    if (opGenRef.current !== gen) return;
  }, [loadTokens, isVerificationValid, invalidateView]);

  const runMutation = useCallback(async (action: PendingMutation, vid: string, gen: number) => {
    if (opGenRef.current !== gen || mutationRef.current !== action) return;
    setMutationLoading(true);

    // Sessions parity: verification rejections keep the mutation + password
    // step; a resubmit re-verifies with the same purpose.
    const handleRejection = (code: string): boolean => {
      if (!VERIFICATION_REJECTION_ERRORS.has(code)) return false;
      // A server-side verification rejection invalidates authorization to
      // keep displaying this sensitive inventory, even though the staged
      // mutation remains available for a same-purpose password retry.
      invalidateView();
      setModalError(mapError(code, t));
      setModalStep({ kind: 'password' });
      return true;
    };
    const handleUnauthorized = (code: string) => {
      if (code !== 'UNAUTHORIZED') return;
      invalidateView();
    };

    const clearExactMutation = () => {
      if (mutationRef.current === action) {
        mutationRef.current = null;
        setMutationOwned(false);
      }
    };

    try {
      if (action.kind === 'create') {
        const result = await onCreatePatToken(action.name, action.expiresAt, vid);
        if (opGenRef.current !== gen || mutationRef.current !== action) return;
        if (!result.ok) {
          const code = result.error;
          if (handleRejection(code)) return;
          handleUnauthorized(code);
          if (code === 'PAT_CREATE_FAILED') {
            // Ambiguity: the create may have landed server-side. Best-effort
            // list refresh — if the attempted name is now present, say so
            // instead of surfacing the raw failure.
            try {
              if (verificationRecordId && isVerificationValid) {
                const refreshed = await onGetPatTokens(verificationRecordId);
                if (opGenRef.current !== gen || mutationRef.current !== action) return;
                if (refreshed.ok) {
                  setTokens(refreshed.data);
                  if (refreshed.data.some((tk) => tk.name === action.name)) {
                    clearExactMutation();
                    setCreateError(t.dev.mayHaveCreated);
                    setModalStep(null);
                    return;
                  }
                } else if (LIST_INVALIDATION_ERRORS.has(refreshed.error)) {
                  invalidateView();
                }
              }
            } catch {
              // Ambiguity refresh is best-effort. The original, localized
              // PAT_CREATE_FAILED remains the inline result when it rejects.
            }
            if (opGenRef.current !== gen || mutationRef.current !== action) return;
          }
          clearExactMutation();
          setCreateError(mapError(code, t));
          setModalStep(null);
          return;
        }
        clearExactMutation();
        // The one-time value is committed BEFORE the best-effort refresh —
        // a refresh failure must never clear it.
        setCreatedValue(result.data);
        setShowCreateModal(false);
        setCreateError('');
        onSuccess(t.dev.createdMsg);
        setModalStep(null);
        await loadTokens(undefined, gen);
        if (opGenRef.current !== gen) return;
        return;
      }

      if (action.kind === 'rename') {
        const result = await onRenamePatToken(action.currentName, action.name, vid);
        if (opGenRef.current !== gen || mutationRef.current !== action) return;
        if (!result.ok) {
          const code = result.error;
          if (handleRejection(code)) return;
          handleUnauthorized(code);
          clearExactMutation();
          setRenameError(mapError(code, t));
          setModalStep(null);
          return;
        }
        clearExactMutation();
        setShowRenameModal(null);
        setRenameError('');
        onSuccess(t.dev.renamed);
        setModalStep(null);
        await loadTokens(undefined, gen);
        if (opGenRef.current !== gen) return;
        return;
      }

      const result = await onDeletePatToken(action.name, vid);
      if (opGenRef.current !== gen || mutationRef.current !== action) return;
      if (!result.ok) {
        const code = result.error;
        if (handleRejection(code)) return;
        handleUnauthorized(code);
        // The delete confirm modal has no inline error surface (existing prop
        // contract) — surface the mapped error via toast, matching prior
        // behavior.
        clearExactMutation();
        onError(mapError(code, t));
        setShowDeleteModal(null);
        setModalStep(null);
        return;
      }
      clearExactMutation();
      setShowDeleteModal(null);
      onSuccess(t.dev.deleted);
      setModalStep(null);
      await loadTokens(undefined, gen);
      if (opGenRef.current !== gen) return;
    } finally {
      if (opGenRef.current === gen) {
        setMutationLoading(false);
      }
    }
  }, [onCreatePatToken, onRenamePatToken, onDeletePatToken, onGetPatTokens, onSuccess, onError, loadTokens, verificationRecordId, isVerificationValid, invalidateView, t]);

  const handlePasswordSubmit = async (password: string) => {
    if (modalLoading || mutationLoading) return;
    const gen = opGenRef.current;
    if (passwordSubmitLatchRef.current?.gen === gen) return;
    const claim = { gen, owner: Symbol('pat-password-submit') };
    passwordSubmitLatchRef.current = claim;
    const purposeAtSubmit = modalPurpose;
    const action = mutationRef.current;
    setModalLoading(true);
    setModalError('');

    try {
      if (purposeAtSubmit === 'view') {
        await verifyAndLoad(password, gen);
        if (opGenRef.current !== gen) return;
        return;
      }

      if (!action || mutationRef.current !== action) return;
      const purpose: VerificationPurpose = action.kind === 'create' ? 'pat.create' : action.kind === 'rename' ? 'pat.rename' : 'pat.delete';

      // PAT mutations are as sensitive as account deletion: the user must
      // re-validate their password for EVERY create/rename/delete, mirroring
      // the security tab's deleteUserAccount flow. Each mutation mints a
      // fresh, purpose-scoped verification; the server enforces purpose and
      // single-use consumption via requireVerifiedIdentity.
      const verifyResult = await onVerifyPassword(password, purpose);
      if (opGenRef.current !== gen || mutationRef.current !== action) return;
      if (!verifyResult.ok) {
        // Keep the pending action so a retry with the correct password
        // re-runs the same mutation.
        if (LIST_INVALIDATION_ERRORS.has(verifyResult.error)) invalidateView();
        setModalError(mapError(verifyResult.error, t));
        return;
      }
      const vid = verifyResult.data.verificationRecordId;
      await runMutation(action, vid, gen);
      if (opGenRef.current !== gen) return;
    } catch (error) {
      if (opGenRef.current !== gen) return;
      // Preserve the exact staged action and purpose. A retry obtains another
      // fresh verification and invokes the same mutation target.
      const fallback = action?.kind === 'create'
        ? 'PAT_CREATE_FAILED'
        : action?.kind === 'rename'
          ? 'PAT_RENAME_FAILED'
          : action?.kind === 'delete'
            ? 'PAT_DELETE_FAILED'
            : 'ERROR';
      const code = rejectedErrorCode(error, fallback);
      if (LIST_INVALIDATION_ERRORS.has(code)) invalidateView();
      setModalError(mapError(code, t));
      setModalStep({ kind: 'password' });
    } finally {
      if (opGenRef.current === gen) {
        setModalLoading(false);
        setMutationLoading(false);
        if (passwordSubmitLatchRef.current === claim) {
          passwordSubmitLatchRef.current = null;
        }
      }
    }
  };

  // ── Mutation staging ─────────────────────────────────────────────────────
  // The source modal STAYS MOUNTED while the password overlay runs (the
  // overlay is rendered after it in the DOM and paints on top). Drafts and
  // targets therefore survive every recoverable failure by construction.

  const submitCreate = (name: string, expiresAt: number | null) => {
    if (mutationRef.current) return; // exclusive ownership
    // Always route through the password modal — PAT creation is a sensitive
    // M2M operation (like account deletion) and requires a fresh password.
    mutationRef.current = { kind: 'create', name, expiresAt };
    setMutationOwned(true);
    opGenRef.current++;
    setModalPurpose('action');
    setModalStep({ kind: 'password' });
    setModalError('');
    setModalLoading(false);
  };

  const submitRename = (name: string) => {
    if (mutationRef.current) return;
    if (!showRenameModal) return;
    mutationRef.current = { kind: 'rename', currentName: showRenameModal.name, name };
    setMutationOwned(true);
    opGenRef.current++;
    setModalPurpose('action');
    setModalStep({ kind: 'password' });
    setModalError('');
    setModalLoading(false);
  };

  const submitDelete = (token: PatToken) => {
    if (mutationRef.current) return;
    mutationRef.current = { kind: 'delete', name: token.name };
    setMutationOwned(true);
    opGenRef.current++;
    setModalPurpose('action');
    setModalStep({ kind: 'password' });
    setModalError('');
    setModalLoading(false);
  };

  const sortedTokens = [...tokens].sort((a, b) => b.createdAt - a.createdAt);
  // The skeleton renders while unverified OR during any list load. The
  // overlays below render in BOTH branches so staged drafts, targets, and the
  // one-time value modal survive branch switches by construction.
  const showSkeleton = viewState === 'unverified' || loading;
  const listLocked = loading || actionOverlayOpen || mutationLoading || mutationOwned;

  return (
    <div>
      {showSkeleton ? (
        // ─── Unverified / loading skeleton (mirrors the sessions tab) ──────
        <div>
          <div style={{ marginBottom: '1.625rem' }}>
            <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.65 }}>
              {t.dev.description}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[0, 1, 2].map((i) => (
              <div key={`dev-skeleton-${i}`} style={{
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: DASHBOARD_RADIUS,
                display: 'flex',
                alignItems: 'stretch',
                overflow: 'hidden',
                minHeight: '5.5rem',
                padding: '0 0.875rem',
                opacity: 1 - i * 0.2,
              }}>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0.5rem 1.25rem 0.5rem 0.125rem' }}>
                  <Pulse delay={i * 0.15} style={{ width: '3rem', height: '3rem', borderRadius: '0.25rem', background: T.raised }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0.5rem 1rem', gap: '0.375rem' }}>
                  <Pulse delay={i * 0.15} style={{ height: '0.75rem', borderRadius: '0.25rem', background: T.raised, width: '55%' }} />
                  <Pulse delay={i * 0.15 + 0.1} style={{ height: '0.5rem', borderRadius: '0.25rem', background: T.raised, width: '45%' }} />
                  <Pulse delay={i * 0.15 + 0.2} style={{ height: '0.5rem', borderRadius: '0.25rem', background: T.raised, width: '35%' }} />
                </div>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0.5rem 0.375rem 0.5rem 0', gap: '0.375rem' }}>
                  <Pulse delay={i * 0.15} style={{ width: '4.5rem', height: '1.75rem', borderRadius: '0.25rem', background: T.raised }} />
                </div>
              </div>
            ))}
          </div>

          {/* Manual unlock: shown when the auto-open was latched off by an
              explicit dismissal. Clears the latch and reopens verification. */}
          {viewState === 'unverified' && !loading && !modalStep && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
              <Button
                variant="secondary"
                onClick={() => { dismissedRef.current = false; startViewVerification(); }}
                mode={mode}
                colors={c}
              >
                {t.dev.verifyToView}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.625rem' }}>
        <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.65, margin: 0 }}>
          {t.dev.description}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {isMobile ? (
            <>
               <button
                 onClick={() => { setCreateError(''); setShowCreateModal(true); }}
                  disabled={listLocked}
                 aria-label={t.dev.createToken}
                 title={t.dev.createToken}
                style={{
                  width: '2rem',
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: c.bgTertiary,
                  border: `1px solid ${c.borderColor}`,
                  borderRadius: '0.25rem',
                   cursor: listLocked ? 'not-allowed' : 'pointer',
                  color: c.textSecondary,
                   opacity: listLocked ? 0.45 : 1,
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <Plus size={14} strokeWidth={1.5} />
              </button>
               <button
                 onClick={handleRefresh}
                  disabled={listLocked}
                 aria-label={t.dev.refreshData}
                 title={t.dev.refreshData}
                style={{
                  width: '2rem',
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: c.bgTertiary,
                  border: `1px solid ${c.borderColor}`,
                  borderRadius: '0.25rem',
                   cursor: listLocked ? 'not-allowed' : 'pointer',
                  color: c.textSecondary,
                   opacity: listLocked ? 0.45 : 1,
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <RefreshCw size={14} strokeWidth={1.5} />
              </button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={() => { setCreateError(''); setShowCreateModal(true); }}
                 disabled={listLocked}
                mode={mode}
                colors={c}
               >
                 {t.dev.createToken}
               </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRefresh}
                 disabled={listLocked}
                mode={mode}
                colors={c}
              >
                {loading ? t.common.loading : t.dev.refreshData}
              </Button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {sortedTokens.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: DASHBOARD_RADIUS,
            color: T.muted,
          }}>
            {t.dev.noTokens}
          </div>
        ) : (
          sortedTokens.map((token) => (
            <Card key={token.name} mode={mode} colors={colors} style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.625rem' : '0.8125rem', padding: isMobile ? '0.75rem' : '1rem 1.25rem', minWidth: 0 }}>
                <IconBox mode={mode} colors={colors} color="blue">
                  <KeyRound size={'0.9375rem'} color={c.accentBlue} strokeWidth={1.5} aria-hidden="true" />
                </IconBox>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 title={token.name} style={{
                    fontFamily: T.font,
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: T.text,
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {token.name}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: '0.75rem', rowGap: '0.125rem', fontFamily: T.mono, fontSize: '0.625rem', color: T.muted, marginTop: '0.25rem' }}>
                    <span>{t.dev.created}: {formatDate(token.createdAt)}</span>
                    {token.expiresAt === null ? (
                      <span style={{ color: c.accentGreen, fontWeight: 600 }}>{t.dev.neverExpires}</span>
                    ) : (
                      <span>{t.dev.expires}: {formatDate(token.expiresAt)}</span>
                    )}
                  </div>
                </div>

                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                 {isMobile ? (
                   <>
                    <button
                      onClick={() => { setRenameError(''); setShowRenameModal(token); }}
                       disabled={listLocked}
                       aria-label={`${t.dev.rename} ${token.name}`}
                       title={`${t.dev.rename} ${token.name}`}
                      style={{
                        width: '2rem', height: '2rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: c.bgTertiary,
                        border: `1px solid ${c.borderColor}`,
                        borderRadius: '0.25rem',
                        color: c.textSecondary,
                        cursor: listLocked ? 'not-allowed' : 'pointer',
                        opacity: listLocked ? 0.45 : 1,
                        padding: 0,
                        flexShrink: 0,
                      }}
                    >
                      <Pencil size={14} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(token)}
                       disabled={listLocked}
                       aria-label={`${t.dev.delete} ${token.name}`}
                       title={`${t.dev.delete} ${token.name}`}
                      style={{
                        width: '2rem', height: '2rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: c.errorBg,
                        border: `1px solid ${c.accentRed}38`,
                        borderRadius: '0.25rem',
                        color: c.accentRed,
                        cursor: listLocked ? 'not-allowed' : 'pointer',
                        opacity: listLocked ? 0.45 : 1,
                        padding: 0,
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => { setRenameError(''); setShowRenameModal(token); }}
                      disabled={listLocked}
                      mode={mode}
                      colors={c}
                     >
                       {t.dev.rename}
                     </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setShowDeleteModal(token)}
                      disabled={listLocked}
                      mode={mode}
                      colors={c}
                     >
                       {t.dev.delete}
                     </Button>
                  </>
                )}
                </div>
              </div>
            </Card>
          ))
        )}
        </div>
        </>
      )}

      <AnimatePresence>
      {showCreateModal && (
        <CreatePatModal
          key="dev-create"
          onCancel={() => { setShowCreateModal(false); setCreateError(''); }}
          onSubmit={submitCreate}
          loading={actionOverlayOpen || mutationLoading}
          error={createError}
          t={t}
          mode={mode}
          colors={c}
        />
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showRenameModal && (
        <RenamePatModal
          key={`dev-rename-${showRenameModal.name}`}
          currentName={showRenameModal.name}
          onCancel={() => { setShowRenameModal(null); setRenameError(''); }}
          onSubmit={submitRename}
          loading={actionOverlayOpen || mutationLoading}
          error={renameError}
          t={t}
          mode={mode}
          colors={c}
        />
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showDeleteModal && (
        <DeletePatConfirmModal
          key={`dev-delete-${showDeleteModal.name}`}
          name={showDeleteModal.name}
          onCancel={() => setShowDeleteModal(null)}
          onConfirm={() => submitDelete(showDeleteModal)}
          loading={actionOverlayOpen || mutationLoading}
          t={t}
          mode={mode}
          colors={c}
        />
      )}
      </AnimatePresence>

      {/* Password verification is deliberately rendered after the source
          modal so its equal-z-index overlay paints on top while the source
          remains mounted with its draft/target intact. */}
      <AnimatePresence>
      {modalStep && (
        <PasswordVerifyModal
          key="dev-verify"
          title={t.dev.verifyToView}
          subtitle={modalPurpose === 'view' ? t.dev.verifyToViewDesc : t.dev.verifyToActionDesc}
          step={modalStep}
          onPasswordSubmit={handlePasswordSubmit}
          onClose={() => {
            // Verification and mutation calls are non-cancelable phases. The
            // close affordance stays inert until the current await settles.
            if (modalLoading || mutationLoading) return;
            const canceledMutation = mutationRef.current;
            if (modalPurpose === 'view' && !isVerificationValid) {
              // Latch off auto-open until the tab is re-entered.
              dismissedRef.current = true;
              onVerificationDismissed?.();
            }
            opGenRef.current++;
            if (mutationRef.current === canceledMutation) {
              mutationRef.current = null;
              setMutationOwned(false);
            }
            setModalStep(null);
            setModalError('');
            setModalLoading(false);
            setMutationLoading(false);
          }}
          passwordError={modalError}
          loading={modalLoading}
          mode={mode}
          colors={c}
          t={t}
        />
      )}
      </AnimatePresence>

      <AnimatePresence>
      {createdValue && (
        <PatValueModal
          key="dev-value"
          value={createdValue.value}
          onClose={() => setCreatedValue(null)}
          t={t}
          mode={mode}
          colors={c}
        />
      )}
      </AnimatePresence>
    </div>
  );
}
