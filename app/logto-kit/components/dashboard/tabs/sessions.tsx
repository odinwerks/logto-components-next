'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { UserData, LogtoSession } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import { FONT_SANS, FONT_MONO } from '../../../themes';
import type { Translations } from '../../../locales';
import { Monitor, Smartphone, Trash2, MapPin, RefreshCw, Globe } from 'lucide-react';
import { Button } from '../../shared/Button';
import { AnimatePresence, BouncingDots, Pulse } from '../../shared/motion';
import { PasswordVerifyModal, PasswordModalStep } from '../shared/FlowModal';
import { SessionMapModal } from '../shared/SessionMapModal';
import { useFocusTrap } from '../shared/focus-trap';
import type { ActionResult, DataResult } from '../../../logic/actions/safe';
import { useSessionGeoLocate } from '../../../hooks/sessions';
import { readEnv } from '../../../logic/env';

// ─── Hardcoded design tokens ───
const DASHBOARD_RADIUS = '0';

interface SessionsTabProps {
  userData: UserData;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  mobmode?: number;
  onGetSessionsWithDeviceMeta: (verificationRecordId: string) => Promise<DataResult<LogtoSession[]>>;
  onRevokeSession: (sessionId: string, identityVerificationRecordId: string, revokeGrantsTarget?: 'all' | 'firstParty') => Promise<ActionResult>;
  onRevokeAllOtherSessions: (verificationRecordId: string) => Promise<ActionResult>;
  onVerifyPassword: (password: string) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  /** Whether this tab is the currently-visible tab in the shell. Gates auto-open of PasswordVerifyModal. */
  isActive?: boolean;
  /** Called when the user closes/dismisses the view-purpose PasswordVerifyModal without successfully verifying. */
  onVerificationDismissed?: () => void;
}

function OsIcon({ os, deviceType, size }: { os: string | null; deviceType: string | null; size: number }) {
  const [imgError, setImgError] = useState(false);

  const src = os === 'Linux' ? '/os-icons/Tux.jpg'
    : os === 'Windows' ? '/os-icons/MacroSlop.svg'
    : (os === 'macOS' || os === 'Mac OS') ? '/os-icons/MacOS.svg'
    : os === 'iOS' ? '/os-icons/ios.svg'
    : os === 'Android' ? '/os-icons/Android.svg'
    : null;

  if (src && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={os ?? 'OS'} width={size} height={size} style={{ display: 'block' }} onError={() => setImgError(true)} />
    );
  }

  if (deviceType === 'mobile') return <Smartphone size={size} strokeWidth={1.5} />;
  return <Monitor size={size} strokeWidth={1.5} />;
}

// ── GcAllConfirmModal ────────────────────────────────────────────────────────
// Extracted child so `useFocusTrap` installs on mount (BUG-005). The parent
// (SessionsTab) is always mounted, so calling the hook at the parent level left
// the dialog ref null at the first effect run and the trap never installed.
// Mirrors the FlowModal / PasswordVerifyModal pattern.
function GcAllConfirmModal({
  onCancel,
  onConfirm,
  loading,
  t,
  mode,
  colors,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
  /** Number of sessions that would be revoked (reserved for future copy). */
  sessionsCount?: number;
  t: Translations;
  mode: 'dark' | 'light';
  colors: ThemeColors;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, () => {
    if (!loading) onCancel();
  });

  return (
    <motion.div
      key="gc-all"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.06, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(0.375rem) saturate(0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9000,
      }}
      onClick={() => !loading && onCancel()}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gc-all-title"
        style={{
          background: colors.bgSecondary,
          border: `1px solid ${colors.borderColor}`,
          borderRadius: DASHBOARD_RADIUS,
          padding: '1.5rem',
          width: 'min(92vw, 420px)',
          fontFamily: FONT_SANS,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="gc-all-title" style={{ fontSize: '1rem', fontWeight: 600, color: colors.textPrimary, margin: '0 0 1rem 0' }}>
          {t.sessions.gcAllConfirmTitle}
        </h3>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
            mode={mode}
            colors={colors}
          >
            {t.common.close}
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={loading}
            mode={mode}
            colors={colors}
          >
            {loading ? t.common.loading : t.common.yes}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ── OnlyOneSessionModal ──────────────────────────────────────────────────────
// Extracted child so `useFocusTrap` installs on mount (BUG-004). Adds Escape
// handling, focus trapping, tabIndex on the dialog, and backdrop click-outside
// dismiss — matching every other modal in the dashboard.
function OnlyOneSessionModal({
  onCancel,
  t,
  mode,
  colors,
}: {
  onCancel: () => void;
  t: Translations;
  mode: 'dark' | 'light';
  colors: ThemeColors;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onCancel);

  return (
    <motion.div
      key="only-one"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.06, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(0.375rem) saturate(0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="only-one-title"
        style={{
          background: colors.bgSecondary,
          border: `1px solid ${colors.borderColor}`,
          borderRadius: DASHBOARD_RADIUS,
          padding: '1.5rem',
          width: 'min(92vw, 420px)',
          fontFamily: FONT_SANS,
        }}
      >
        <h3 id="only-one-title" style={{ fontSize: '1rem', fontWeight: 600, color: colors.textPrimary, margin: '0 0 0.75rem 0' }}>
          {t.sessions.gcOnlyOneTitle}
        </h3>
        <p style={{ fontSize: '0.8125rem', color: colors.textSecondary, lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
          {t.sessions.gcOnlyOneBody}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="primary"
            onClick={onCancel}
            mode={mode}
            colors={colors}
          >
            {t.sessions.gcOnlyOneAck}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function SessionsTab({
  userData: _userData,
  mode,
  colors,
  t,
  mobmode,
  isActive = false,
  onVerificationDismissed,
  onGetSessionsWithDeviceMeta,
  onRevokeSession,
  onRevokeAllOtherSessions,
  onVerifyPassword,
  onSuccess,
  onError,
  }: SessionsTabProps) {
  const isMobile = mobmode === 1;

  const backendType = (readEnv('BACKEND_TYPE') ?? 'blacktop').toLowerCase();
  const showLastActive = backendType === 'blacktop';
  // ─── Replaced tk(tc) with direct color references ───
  const c = colors;
  const T = {
    font: FONT_SANS,
    mono: FONT_MONO,
    text: c.textPrimary,
    sub: c.textSecondary,
    muted: c.textTertiary,
    bg: c.bgSecondary,
    surface: c.bgSecondary,
    raised: c.bgTertiary,
    border: c.borderColor,
    borderFaint: `${c.borderColor}80`,
    greenText: c.accentGreen,
    blueText: c.accentBlue,
  };

  // Theme-sourced palette for the mobile current-device button.
  const greenFill   = c.successBg;
  const greenBorder = c.accentGreen;
  const greenIcon   = c.accentGreen;

  const [sessions, setSessions] = useState<LogtoSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [modalStep, setModalStep] = useState<PasswordModalStep | null>(null);
  const [modalError, setModalError] = useState<string>('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalPurpose, setModalPurpose] = useState<'view' | 'revoke'>('view');
  const {
    locatingIp,
    mapModalGeo,
    mapModalIp,
    locate: handleLocate,
    closeMapModal,
    clearCache,
  } = useSessionGeoLocate({ onError });

  const [verificationRecordId, setVerificationRecordId] = useState<string | null>(null);
  // verificationExpiry is the server-derived expiresAt (from onVerifyPassword),
  // used ONLY for client UX (auto-invalidate timer + isVerificationValid gate).
  // The authoritative staleness check now runs server-side via the sealed
  // verification cookie (BUG-001 fix); this client value is not trusted back.
  const [verificationExpiry, setVerificationExpiry] = useState<number>(0);
  const [viewState, setViewState] = useState<'unverified' | 'loaded'>('unverified');

  // GC ALL modal state (Task 1)
  const [showGcAllModal, setShowGcAllModal] = useState(false);
  const [gcAllLoading, setGcAllLoading] = useState(false);

  // D16: "Only one session" informational modal
  const [showOnlyOneModal, setShowOnlyOneModal] = useState(false);

  // Persists the revoke target through failed attempts so retries send the correct session ID
  const revokeTargetRef = useRef<{ kind: 'single'; id: string } | { kind: 'all' } | null>(null);

  // eslint-disable-next-line react-hooks/purity
  const isVerificationValid = verificationRecordId && Date.now() < verificationExpiry;

  // Auto-invalidate verification when it expires, forcing re-verification
  useEffect(() => {
    if (!verificationRecordId || !verificationExpiry) return;
    const timeUntilExpiry = verificationExpiry - Date.now();
    if (timeUntilExpiry > 0) {
      const timer = setTimeout(() => {
        setVerificationRecordId(null);
        setVerificationExpiry(0);
        setViewState('unverified');
      }, timeUntilExpiry);
      return () => clearTimeout(timer);
    }
  }, [verificationRecordId, verificationExpiry]);

  const verifyAndLoad = useCallback(async (password: string) => {
    setModalLoading(true);
    setModalError('');

    const verifyResult = await onVerifyPassword(password);
    if (!verifyResult.ok) {
      setModalError(verifyResult.error);
      setModalLoading(false);
      setViewState('unverified');
      revokeTargetRef.current = null;
      return;
    }
    const { verificationRecordId: vid, verificationTimestamp: ts } = verifyResult.data;
    const expiresAt = ts; // ts is already Logto's expiresAt (UX-only; server seals it in a cookie)
    setVerificationRecordId(vid);
    setVerificationExpiry(expiresAt);

    setModalStep(null);
    setModalLoading(false);

    setLoading(true);
    const sessionsResult = await onGetSessionsWithDeviceMeta(vid);
    if (!sessionsResult.ok) {
      onError(sessionsResult.error);
      setVerificationRecordId(null);
      setVerificationExpiry(0);
      setViewState('unverified');
      setLoading(false);
      return;
    }
    setSessions(sessionsResult.data);
    setViewState('loaded');
    setLoading(false);
  }, [
    onVerifyPassword,
    onGetSessionsWithDeviceMeta,
    onError,
    setModalLoading,
    setModalStep,
    setModalError,
    setVerificationRecordId,
    setVerificationExpiry,
    setLoading,
    setSessions,
    setViewState
  ]);

  const loadSessions = useCallback(async (recordId?: string) => {
    const id = recordId ?? verificationRecordId;
    if (!id) return;
    // When an explicit recordId is passed (a fresh re-verification just
    // completed in handlePasswordSubmit), proceed without the client-side
    // validity gate — the caller already re-verified. When called with no
    // arg (refresh button), gate on the client-held expiry so we don't round-
    // trip to the server with an obviously-stale verification. The server's
    // sealed-cookie check (requireVerifiedIdentity) is the authoritative gate.
    if (!recordId && !isVerificationValid) return;

    setLoading(true);
    const r = await onGetSessionsWithDeviceMeta(id);
    if (!r.ok) {
      onError(r.error);
      // Only reset verification for auth-related failures
      if (r.error === 'VERIFICATION_FAILED' || r.error === 'UNAUTHORIZED') {
        setViewState('unverified');
        setVerificationRecordId(null);
      }
      setLoading(false);
      return;
    }
    setSessions(r.data);
    setLoading(false);
  }, [verificationRecordId, onGetSessionsWithDeviceMeta, onError, isVerificationValid]);

  const handleRefresh = useCallback(async () => {
    clearCache();
    closeMapModal();
    if (!isVerificationValid) {
      setViewState('unverified');
      return;
    }
    await loadSessions();
  }, [loadSessions, isVerificationValid, clearCache, closeMapModal, setViewState]);

  const startViewVerification = () => {
    setModalPurpose('view');
    setModalStep({ kind: 'password' });
    setModalError('');
    setModalLoading(false);
  };

  // Auto-open password modal when the tab becomes active and is unverified (D13).
  // Gated on isActive because the sessions tab unmounts on tab switch
  // (CrossFade no longer preserves state across tab changes).
  useEffect(() => {
    if (isActive && viewState === 'unverified' && !loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional D13 auto-open behavior
      startViewVerification();
    }
  }, [isActive, viewState, loading]);

  /**
   * Initiates session revocation flow.
   *
   * NOTE: The revokeGrantsTarget is always 'firstParty' in handlePasswordSubmit,
   * regardless of whether called from mobile or desktop view. This is intentional
   * to revoke first-party app grants while preserving third-party grants.
   */
  const startRevokeVerification = (sessionId: string) => {
    // Prevent opening a new modal while one is already active
    // to avoid silently overwriting the revoke target.
    if (revokeTargetRef.current !== null) return;

    setRevokingId(sessionId);
    revokeTargetRef.current = { kind: 'single', id: sessionId };
    setModalPurpose('revoke');
    setModalStep({ kind: 'password' });
    setModalError('');
    setModalLoading(false);
  };

  const handlePasswordSubmit = async (password: string) => {
    try {
      if (modalPurpose === 'view' && !isVerificationValid) {
        await verifyAndLoad(password);
        return;
      }

      setModalLoading(true);
      setModalError('');

      let vid = verificationRecordId;
      if (!vid || Date.now() >= verificationExpiry) {
        const verifyResult = await onVerifyPassword(password);
        if (!verifyResult.ok) {
          setModalError(verifyResult.error);
          setModalLoading(false);
          setRevokingId(null);
          setRevokingAll(false);
          revokeTargetRef.current = null;
          setViewState('unverified');
          return;
        }
        vid = verifyResult.data.verificationRecordId;
        setVerificationRecordId(vid);
        setVerificationExpiry(verifyResult.data.verificationTimestamp); // expiresAt (UX-only)
      }

      const target = revokeTargetRef.current;
      if (!target) {
        setModalStep(null);
        setModalLoading(false);
        revokeTargetRef.current = null;
        return;
      }

      if (target.kind === 'all') {
        setRevokingAll(true);
        const revokeResult = await onRevokeAllOtherSessions(vid);
        if (!revokeResult.ok) {
          setModalError(revokeResult.error);
          setModalLoading(false);
          setRevokingAll(false);
          if (revokeResult.error === 'VERIFICATION_FAILED' || revokeResult.error === 'UNAUTHORIZED') {
            setViewState('unverified');
            setVerificationRecordId(null);
            revokeTargetRef.current = null;
          }
          return;
        }
      } else {
        const revokeResult = await onRevokeSession(target.id, vid, 'firstParty');
        if (!revokeResult.ok) {
          setModalError(revokeResult.error);
          setModalLoading(false);
          setRevokingId(null);
          setRevokingAll(false);
          if (revokeResult.error === 'VERIFICATION_FAILED' || revokeResult.error === 'UNAUTHORIZED') {
            setViewState('unverified');
            setVerificationRecordId(null);
            revokeTargetRef.current = null;
          }
          return;
        }
      }
      onSuccess(t.sessions.revoked);
      await loadSessions(vid ?? undefined);
      setModalStep(null);
      setModalLoading(false);
      revokeTargetRef.current = null;
      setRevokingId(null);
      setRevokingAll(false);
    } catch {
      // BUG-003: The invoker (PasswordVerifyModal) calls onPasswordSubmit
      // synchronously without `await`/`.catch` (its prop type returns void).
      // Re-throwing here produces an unhandledrejection that leaves the modal
      // stuck on the loading step. Recover in-place instead: reset all flags,
      // re-open the password step, and surface a generic error toast.
      // BUG-077: Do NOT clear revokeTargetRef here — preserving it allows
      // the user to retry the revocation by re-entering their password.
      setRevokingId(null);
      setRevokingAll(false);
      setGcAllLoading(false);
      setModalLoading(false);
      setModalStep({ kind: 'password' });
      onError(t.common.unexpectedError || 'Unexpected error');
    } finally {
      setRevokingId(null);
      setRevokingAll(false);
      setGcAllLoading(false);
    }
  };

  const formatDate = (input: number | string) => {
    const date = typeof input === 'string' ? new Date(input) : new Date(input < 1e12 ? input * 1000 : input);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // BUG-005: Use locale-aware toLocaleString instead of hard-coded "at"/"AM"/"PM"
  // literals so non-English users see a consistent date/time representation.
  const formatFullDateTime = (input: number | string) => {
    const date = typeof input === 'string' ? new Date(input) : new Date(input < 1e12 ? input * 1000 : input);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getSessionTitle = (session: LogtoSession): string => {
    if (session.meta?.browser && session.meta?.os) {
      return `${session.meta.browser} on ${session.meta.os}`;
    }
    if (session.meta?.browser) {
      return session.meta.browser;
    }
    if (session.meta?.os) {
      return session.meta.os;
    }
    return '';
  };

  // D13: Replace inline verify-card with skeleton + auto-opened modal.
  // The skeleton renders for both unverified (waiting for password entry) and
  // loading (fetching sessions after successful verification) states.
  // The view-purpose PasswordVerifyModal renders as an overlay on top of the skeleton
  // so it stays visible during the async verifyAndLoad flow.

  // ─── M7: Mobile skeleton rewrite ─────────────────────────────────────
  // Renders a mobile loading skeleton whose box model exactly matches
  // the loaded mobile session card so nothing shrinks or jumps on load.
  if (isMobile && (loading || viewState === 'unverified')) {
    return (
      <div>
        <div style={{ marginBottom: '1.625rem' }}>
          <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.65 }}>
            {t.sessions.description}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[0, 1, 2].map(i => {
            const isCurrent = i === 0;
            return (
              <div key={`skeleton-m-${i}`} style={{
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: DASHBOARD_RADIUS,
                display: 'flex',
                alignItems: 'stretch',
                overflow: 'hidden',
                opacity: 1 - i * 0.2,
              }}>
                {/* 1. OS icon placeholder — mirrors loaded mobile OS container */}
                <div style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '3rem',
                  padding: '0.75rem 0 0.75rem 0.75rem',
                  boxSizing: 'content-box',
                }}>
                  <Pulse delay={i * 0.15} style={{ width: '3rem', height: '3rem', borderRadius: '0.25rem', background: T.raised }} />
                </div>

                {/* 2. Text content — mirrors loaded mobile text column */}
                <div style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '0.75rem 0.25rem 0.75rem 0.75rem',
                  gap: '0.25rem',
                }}>
                  <Pulse delay={i * 0.15} style={{ height: '0.8125rem', borderRadius: '0.25rem', background: T.raised, width: '55%' }} />
                  <Pulse delay={i * 0.15 + 0.1} style={{ height: '0.625rem', borderRadius: '0.25rem', background: T.raised, width: '70%' }} />
                  <Pulse delay={i * 0.15 + 0.2} style={{ height: '0.625rem', borderRadius: '0.25rem', background: T.raised, width: '50%' }} />
                  {showLastActive && (
                    <Pulse delay={i * 0.15 + 0.3} style={{ height: '0.625rem', borderRadius: '0.25rem', background: T.raised, width: '40%' }} />
                  )}
                </div>

                {/* 3. Right rail — mirrors loaded mobile action column */}
                <div style={{
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                  padding: '0.75rem 0.75rem 0.75rem 0',
                  gap: '0.25rem',
                }}>
                  {isCurrent ? (
                    <button
                      aria-label={t.sessions.thisDevice}
                      disabled
                      style={{
                        width: '2rem', height: '2rem', borderRadius: '0.25rem',
                        border: `1px solid ${c.borderColor}`,
                        background: c.bgTertiary,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'default', opacity: 0.6, padding: 0, flexShrink: 0,
                      }}
                    >
                      <Globe size={16} color={T.muted} />
                    </button>
                  ) : (
                    <Pulse delay={i * 0.15} style={{ width: '2rem', height: '2rem', borderRadius: '0.25rem', background: T.raised }} />
                  )}

                  <button
                    aria-label={t.sessions.ipLocation}
                    title={t.sessions.ipLocation}
                    disabled
                    style={{
                      width: '2rem', height: '2rem', borderRadius: '0.25rem',
                      border: `1px solid ${c.borderColor}`,
                      background: c.bgTertiary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: T.muted, padding: 0, cursor: 'default', opacity: 0.6, flexShrink: 0,
                    }}
                  >
                    <MapPin size={16} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* View-purpose verification modal — renders as overlay on top of skeleton */}
        <AnimatePresence>
        {modalStep && modalPurpose === 'view' && (
          <PasswordVerifyModal
            key="verify-view"
            title={t.sessions.verifyToView}
            subtitle={t.sessions.verifyToViewDesc}
            step={modalStep}
            onPasswordSubmit={handlePasswordSubmit}
            onClose={() => {
              if (!isVerificationValid) {
                onVerificationDismissed?.();
              }
              setModalStep(null);
              setModalError('');
              setModalLoading(false);
            }}
            passwordError={modalError}
            loading={modalLoading}
            mode={mode}
            colors={c}
            t={t}
          />
        )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── Desktop skeleton (unchanged — isMobile ternaries resolved to desktop values) ───
  if ((viewState === 'unverified' && !loading) || loading) {
    return (
      <div>
        <div style={{ marginBottom: '1.625rem' }}>
          <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.65 }}>
            {t.sessions.description}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[0, 1, 2].map(i => {
            const isCurrent = i === 0;
            return (
              <div key={`skeleton-${i}`} style={{
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
                {/* 1. OS Icon placeholder */}
                <div style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.5rem 1.25rem 0.5rem 0.125rem',
                  marginRight: '0'
                }}>
                  <Pulse
                    delay={i * 0.15}
                    style={{
                      width: '3rem',
                      height: '3rem',
                      borderRadius: '0.25rem',
                      background: T.raised,
                    }}
                  />
                </div>

                {/* 2. Text Content placeholder */}
                <div style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '0.5rem 1rem',
                  gap: '0.375rem',
                }}>
                  {/* Title */}
                  <Pulse
                    delay={i * 0.15}
                    style={{
                      height: '0.75rem',
                      borderRadius: '0.25rem',
                      background: T.raised,
                      width: '55%',
                    }}
                  />
                  {/* Signed In Timestamp */}
                  <Pulse
                    delay={i * 0.15 + 0.1}
                    style={{
                      height: '0.5rem',
                      borderRadius: '0.25rem',
                      background: T.raised,
                      width: '45%',
                    }}
                  />
                  {/* Expires Timestamp */}
                  <Pulse
                    delay={i * 0.15 + 0.2}
                    style={{
                      height: '0.5rem',
                      borderRadius: '0.25rem',
                      background: T.raised,
                      width: '35%',
                    }}
                  />
                  {/* Last Active (only if showLastActive) */}
                  {showLastActive && (
                    <Pulse
                      delay={i * 0.15 + 0.3}
                      style={{
                        height: '0.5rem',
                        borderRadius: '0.25rem',
                        background: T.raised,
                        width: '30%',
                      }}
                    />
                  )}
                </div>

                {/* 3. Right-aligned button/action area */}
                <div style={{
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '0.5rem 0.375rem 0.5rem 0',
                  gap: '0.375rem',
                }}>
                  {isCurrent ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontFamily: T.font,
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      padding: '0.3125rem 0.75rem',
                      borderRadius: '0.25rem',
                      whiteSpace: 'nowrap',
                      border: `1px solid ${c.borderColor}`,
                      background: c.bgTertiary,
                      color: T.muted,
                      opacity: 0.6,
                    }}>
                      {t.sessions.thisDevice}
                    </span>
                  ) : (
                    <Pulse
                      delay={i * 0.15}
                      style={{
                        width: '4rem',
                        height: '1.75rem',
                        borderRadius: '0.25rem',
                        background: T.raised,
                      }}
                    />
                  )}

                  {/* Map Button Placeholder */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    marginTop: '0.375rem',
                  }}>
                    <button
                      disabled
                      aria-label={t.sessions.ipLocation}
                      title={t.sessions.ipLocation}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '1.25rem',
                        height: '1.25rem',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '0.25rem',
                        color: T.muted,
                        padding: 0,
                        opacity: 0.4,
                        cursor: 'default',
                      }}
                    >
                      <MapPin size={10} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View-purpose verification modal — renders as overlay on top of skeleton */}
        <AnimatePresence>
        {modalStep && modalPurpose === 'view' && (
          <PasswordVerifyModal
            key="verify-view"
            title={t.sessions.verifyToView}
            subtitle={t.sessions.verifyToViewDesc}
            step={modalStep}
            onPasswordSubmit={handlePasswordSubmit}
            onClose={() => {
              if (!isVerificationValid) {
                onVerificationDismissed?.();
              }
              setModalStep(null);
              setModalError('');
              setModalLoading(false);
            }}
            passwordError={modalError}
            loading={modalLoading}
            mode={mode}
            colors={c}
            t={t}
          />
        )}
        </AnimatePresence>
      </div>
    );
  }

  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.meta?.isCurrent && !b.meta?.isCurrent) return -1;
    if (!a.meta?.isCurrent && b.meta?.isCurrent) return 1;
    const aTs = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : Number.NEGATIVE_INFINITY;
    const bTs = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : Number.NEGATIVE_INFINITY;
    return (bTs - aTs) || 0;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.625rem' }}>
        <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.65, margin: 0 }}>
          {t.sessions.description}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {isMobile ? (
            <>
              {sessions.length > 0 && (
                <button
                  onClick={() => {
                    if (sessions.length === 1) {
                      setShowOnlyOneModal(true);
                    } else {
                      setShowGcAllModal(true);
                    }
                  }}
                  disabled={revokingAll || loading}
                  aria-label={t.sessions.gcAllConfirmTitle}
                  style={{
                    width: '2rem',
                    height: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: c.errorBg,
                    border: `1px solid ${c.accentRed}38`,
                    borderRadius: '0.25rem',
                    cursor: (revokingAll || loading) ? 'not-allowed' : 'pointer',
                    color: c.accentRed,
                    opacity: (revokingAll || loading) ? 0.45 : 1,
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              )}
              <button
                onClick={handleRefresh}
                disabled={loading}
                aria-label={t.sessions.refreshData}
                style={{
                  width: '2rem',
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: c.bgTertiary,
                  border: `1px solid ${c.borderColor}`,
                  borderRadius: '0.25rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  color: c.textSecondary,
                  opacity: loading ? 0.45 : 1,
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <RefreshCw size={14} strokeWidth={1.5} />
              </button>
            </>
          ) : (
            <>
              {sessions.length > 0 && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    if (sessions.length === 1) {
                      setShowOnlyOneModal(true);
                    } else {
                      setShowGcAllModal(true);
                    }
                  }}
                  disabled={revokingAll || loading}
                  mode={mode}
                  colors={c}
                >
                  {revokingAll ? t.common.loading : t.sessions.revokeAll}
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRefresh}
                disabled={loading}
                mode={mode}
                colors={c}
              >
                {loading ? t.common.loading : t.sessions.refreshData}
              </Button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {sessions.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: DASHBOARD_RADIUS,
            color: T.muted,
          }}>
            {t.sessions.noSessions}
          </div>
        ) : (
          sortedSessions.map((session) => {
            const meta = session.meta;
            const os = meta?.os ?? null;
            const deviceType = meta?.deviceType ?? null;
            const title = getSessionTitle(session);
            const ip = meta?.ip ?? null;

            return (
              <div key={session.payload.jti ?? session.payload.uid} style={{
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: DASHBOARD_RADIUS,
                display: 'flex',
                alignItems: 'stretch',
                overflow: 'hidden',
                height: 'auto',
                minHeight: isMobile ? 'auto' : '5.5rem',
              }}>
                <div style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: isMobile ? '3rem' : 'auto',
                  padding: isMobile ? '0.75rem 0 0.75rem 0.75rem' : '0.5rem 1.25rem 0.5rem 1rem',
                  boxSizing: 'content-box',
                }}>
                  <OsIcon os={os} deviceType={deviceType} size={isMobile ? 48 : 48} />
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? '0.75rem 0.25rem 0.75rem 0.75rem' : '0.5rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: isMobile ? '0.25rem' : '0.375rem' }}>
                    <h3 title={title || t.sessions.unknown} style={{
                      fontFamily: T.font,
                      fontSize: isMobile ? '0.8125rem' : '0.9375rem',
                      fontWeight: 500,
                      color: T.text,
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {title || t.sessions.unknown}
                    </h3>
                    {!isMobile && showLastActive && meta?.lastActive && (
                      <span style={{
                        fontFamily: T.font,
                        fontSize: '0.6875rem',
                        color: T.sub,
                        flexShrink: 0,
                      }}>
                        {meta.lastActive === 'now' ? (
                          <span style={{
                            color: c.accentGreen,
                            fontWeight: 600,
                          }}>
                            {t.sessions.activeNow}
                          </span>
                        ) : (
                          formatDate(meta.lastActive)
                        )}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: isMobile ? '0.625rem' : '0.75rem', color: T.muted }}>
                    <span>
{isMobile ? (
                         <>{t.sessions.loggedInAt}: {formatFullDateTime(session.payload.loginTs)}</>
                       ) : (
                         `${t.sessions.loggedInAt}: ${formatDate(session.payload.loginTs)}`
                       )}
                    </span>
                  </div>

                  <div style={{ marginTop: '0.125rem', fontSize: isMobile ? '0.625rem' : '0.6875rem', color: T.sub }}>
                    <span>{t.sessions.expires}: {formatDate(session.payload.exp)}</span>
                  </div>

                  {isMobile && showLastActive && meta?.lastActive && (
                    <div style={{ marginTop: '0.125rem', fontSize: '0.625rem' }}>
                      <span style={{ color: T.sub }}>{t.sessions.lastActive}: </span>
                      {meta.lastActive === 'now' ? (
                        <span style={{
                          color: c.accentGreen,
                          fontWeight: 600,
                        }}>
                          {t.sessions.activeNow}
                        </span>
                      ) : (
                        <span style={{ color: T.sub }}>{formatDate(meta.lastActive)}</span>
                      )}
                    </div>
                  )}
                </div>

                 <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: isMobile ? 'flex-end' : 'center', padding: isMobile ? '0.75rem 0.75rem 0.75rem 0' : '0.5rem 1.25rem 0.5rem 0', gap: '0.375rem' }}>
                  {session.meta?.isCurrent ? (
                    isMobile ? (
                      <button
                        aria-label={t.sessions.thisDevice}
                        disabled
                        style={{
                          width: '2rem',
                          height: '2rem',
                          borderRadius: '0.25rem',
                          border: `1px solid ${greenBorder}`,
                          background: greenFill,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'default',
                          padding: 0,
                          flexShrink: 0,
                        }}
                      >
                        <Globe size={16} strokeWidth={1.5} color={greenIcon} />
                      </button>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        fontFamily: T.font,
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.3125rem 0.75rem',
                        borderRadius: '0.25rem',
                        whiteSpace: 'nowrap',
                        border: `1px solid ${c.accentGreen}`,
                        background: `${c.accentGreen}33`,
                        color: c.accentGreen,
                        width: '6.5rem',
                        boxSizing: 'border-box',
                      }}>
                        {t.sessions.thisDevice}
                      </span>
                    )
                  ) : (
                    isMobile ? (
                      <button
                        onClick={() => startRevokeVerification(session.payload.uid)}
                        disabled={!!revokingId || revokingAll}
                        aria-label={`${t.sessions.revoke} ${title || t.sessions.unknown}`}
                        style={{
                          width: '2rem', height: '2rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: c.errorBg,
                          border: `1px solid ${c.accentRed}38`,
                          borderRadius: '0.25rem',
                          color: c.accentRed,
                          cursor: (!!revokingId || revokingAll) ? 'not-allowed' : 'pointer',
                          opacity: (!!revokingId || revokingAll) ? 0.45 : 1,
                          padding: 0,
                          flexShrink: 0,
                        }}
                      ><Trash2 size={14} strokeWidth={1.5} /></button>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => startRevokeVerification(session.payload.uid)}
                        disabled={!!revokingId || revokingAll}
                        mode={mode}
                        colors={c}
                        style={{ width: '6.5rem' }}
                      >
                        {revokingId === session.payload.uid ? t.common.loading : t.sessions.revoke}
                      </Button>
                    )
                  )}
                  {ip && isMobile && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      marginTop: '0.25rem',
                    }}>
                      <button
                        onClick={() => handleLocate(ip)}
                        disabled={locatingIp === ip}
                        aria-label={t.sessions.ipLocation}
                        title={t.sessions.ipLocation}
                        style={{
                          width: '2rem',
                          height: '2rem',
                          borderRadius: '0.25rem',
                          border: `1px solid ${colors.borderColor}`,
                          background: colors.bgTertiary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: locatingIp === ip ? 'not-allowed' : 'pointer',
                          color: colors.textSecondary,
                          padding: 0,
                          opacity: locatingIp === ip ? 0.5 : 1,
                          flexShrink: 0,
                        }}
                      >
                        {locatingIp === ip ? (
                          <BouncingDots size={7} gap={4} ariaLabel={t.common.loading} />
                        ) : (
                          <MapPin size={16} />
                        )}
                      </button>
                    </div>
                  )}
                  {ip && !isMobile && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleLocate(ip)}
                      disabled={locatingIp === ip}
                      mode={mode}
                      colors={c}
                      aria-label={t.sessions.ipLocation}
                      title={t.sessions.ipLocation}
                      style={{ width: '6.5rem' }}
                    >
                      {locatingIp === ip ? (
                        <>
                          <BouncingDots size={5} gap={3} ariaLabel="" />
                          {t.common.loading}
                        </>
                      ) : (
                        t.sessions.viewMap
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <AnimatePresence>
      {modalStep && modalPurpose === 'revoke' && (
        <PasswordVerifyModal
          key="verify-revoke"
          title={t.sessions.revokeSession}
          subtitle={t.sessions.revokeSessionDesc}
          step={modalStep}
          onPasswordSubmit={handlePasswordSubmit}
          // CAN-STATE-004: Clear gcAllLoading on cancel. The onConfirm handler
          // sets gcAllLoading=true before opening this password modal. If the
          // user cancels without submitting (handlePasswordSubmit never runs,
          // so its catch/finally blocks don't clear it), gcAllLoading stays
          // true and the reopened GcAllConfirmModal is fully locked (Yes, Close,
          // Escape, and backdrop-click all gated on !loading).
          onClose={() => { setModalStep(null); setRevokingId(null); setGcAllLoading(false); revokeTargetRef.current = null; setModalError(''); setModalLoading(false); }}
          passwordError={modalError}
          loading={modalLoading}
          mode={mode}
          colors={c}
          t={t}
          danger
        />
      )}
      </AnimatePresence>

      <AnimatePresence>
      {mapModalGeo && (
        <SessionMapModal
          key="map-modal"
          geo={mapModalGeo}
          ip={mapModalIp}
          mode={mode}
          colors={c}
          t={t}
          onClose={closeMapModal}
        />
      )}
      </AnimatePresence>

      {/* GC ALL Confirmation Modal (Task 1) */}
      <AnimatePresence>
      {showGcAllModal && (
        <GcAllConfirmModal
          key="gc-all"
          onCancel={() => setShowGcAllModal(false)}
          onConfirm={() => {
            if (revokeTargetRef.current !== null) { setShowGcAllModal(false); return; }
            setGcAllLoading(true);
            revokeTargetRef.current = { kind: 'all' };
            setModalPurpose('revoke');
            setModalStep({ kind: 'password' });
            setModalError('');
            setShowGcAllModal(false);
          }}
          loading={gcAllLoading}
          sessionsCount={sessions.length}
          t={t}
          mode={mode}
          colors={c}
        />
      )}
      </AnimatePresence>

      {/* D16: Only One Session informational modal */}
      <AnimatePresence>
      {showOnlyOneModal && (
        <OnlyOneSessionModal
          key="only-one"
          onCancel={() => setShowOnlyOneModal(false)}
          t={t}
          mode={mode}
          colors={c}
        />
      )}
      </AnimatePresence>
    </div>
  );
}
