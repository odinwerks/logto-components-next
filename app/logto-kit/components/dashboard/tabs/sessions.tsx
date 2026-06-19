'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { UserData, LogtoSession } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import { FONT_SANS, FONT_MONO } from '../../../themes';
import type { Translations } from '../../../locales';
import { Monitor, Smartphone, Trash2, Lock, MapPin, RefreshCw, Globe, Loader2 } from 'lucide-react';
import { Button } from '../../shared/Button';
import { PasswordVerifyModal, PasswordModalStep } from '../shared/FlowModal';
import { SessionMapModal } from '../shared/SessionMapModal';
import { useFocusTrap } from '../shared/focus-trap';
import { fetchGeo, getCachedGeo, clearGeoCache } from '../../../logic/geo-cache';
import type { GeoLocation } from '../../../logic/geo-cache';
import type { ActionResult, DataResult } from '../../../logic/actions/safe';
import { readEnv } from '../../../logic/env';
import { VERIFICATION_CLOCK_SKEW_TOLERANCE_MS } from '../../../logic/constants';

// ─── Hardcoded design tokens ───
const DASHBOARD_RADIUS = '0';

interface SessionsTabProps {
  userData: UserData;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  mobmode?: number;
  onGetSessionsWithDeviceMeta: (verificationRecordId: string, verificationTimestamp: number) => Promise<DataResult<LogtoSession[]>>;
  onRevokeSession: (sessionId: string, identityVerificationRecordId: string, verificationTimestamp: number, revokeGrantsTarget?: 'all' | 'firstParty') => Promise<ActionResult>;
  onRevokeAllOtherSessions: (verificationRecordId: string, verificationTimestamp: number) => Promise<ActionResult>;
  onVerifyPassword: (password: string) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
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

export function SessionsTab({
  userData: _userData,
  mode,
  colors,
  t,
  mobmode,
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

  const [sessions, setSessions] = useState<LogtoSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [modalStep, setModalStep] = useState<PasswordModalStep | null>(null);
  const [modalError, setModalError] = useState<string>('');
  const [modalPurpose, setModalPurpose] = useState<'view' | 'revoke'>('view');
  const [locatingIp, setLocatingIp] = useState<string | null>(null);
  const [mapModalGeo, setMapModalGeo] = useState<GeoLocation | null>(null);
  const [mapModalIp, setMapModalIp] = useState<string>('');
  const [showGeoConsentForIp, setShowGeoConsentForIp] = useState<string | null>(null);

  const [verificationRecordId, setVerificationRecordId] = useState<string | null>(null);
  const [verificationTimestamp, setVerificationTimestamp] = useState<number>(0);
  const [verificationExpiry, setVerificationExpiry] = useState<number>(0);
  const [viewState, setViewState] = useState<'unverified' | 'loaded'>('unverified');

  // GC ALL modal state (Task 1)
  const [showGcAllModal, setShowGcAllModal] = useState(false);
  const [gcAllLoading, setGcAllLoading] = useState(false);

  const gcAllDialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(gcAllDialogRef, () => {
    if (showGcAllModal && !gcAllLoading) setShowGcAllModal(false);
  });

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

  const openMapModal = useCallback((geo: GeoLocation, ip: string) => {
    setMapModalGeo(geo);
    setMapModalIp(ip);
  }, [setMapModalGeo, setMapModalIp]);

  const handleLocate = useCallback(async (ip: string) => {
    if (!ip) return;
    if (typeof window !== 'undefined' && window.sessionStorage.getItem('geo-consent') !== 'true') {
      setShowGeoConsentForIp(ip);
      return;
    }
    const cached = getCachedGeo(ip);
    if (cached) { openMapModal(cached, ip); return; }
    setLocatingIp(ip);
    const geo = await fetchGeo(ip);
    setLocatingIp(null);
    if (geo) openMapModal(geo, ip);
    // silently no-op when ipapi returns nothing (private IP, rate-limited, etc.)
  }, [openMapModal]);

  const verifyAndLoad = useCallback(async (password: string) => {
    setModalStep({ kind: 'loading', message: t.sessions.processing });
    setModalError('');

    const verifyResult = await onVerifyPassword(password);
    if (!verifyResult.ok) {
      setModalError(verifyResult.error);
      setModalStep({ kind: 'password' });
      setViewState('unverified');
      revokeTargetRef.current = null;
      return;
    }
    const { verificationRecordId: vid, verificationTimestamp: ts } = verifyResult.data;
    const expiresAt = ts; // ts is already Logto's expiresAt
    setVerificationRecordId(vid);
    setVerificationTimestamp(ts);
    setVerificationExpiry(expiresAt);

    setModalStep(null);

    setLoading(true);
    const sessionsResult = await onGetSessionsWithDeviceMeta(vid, ts);
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
    t,
    setModalStep,
    setModalError,
    setVerificationRecordId,
    setVerificationTimestamp,
    setVerificationExpiry,
    setLoading,
    setSessions,
    setViewState
  ]);

  const loadSessions = useCallback(async (verification?: { recordId: string; timestamp: number }) => {
    const recordId = verification?.recordId ?? verificationRecordId;
    const timestamp = verification?.timestamp ?? verificationTimestamp;
    const hasValidVerification = verification
      ? (Date.now() <= verification.timestamp + VERIFICATION_CLOCK_SKEW_TOLERANCE_MS)
      : isVerificationValid;

    if (!recordId || !hasValidVerification) return;

    setLoading(true);
    const r = await onGetSessionsWithDeviceMeta(recordId, timestamp);
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
  }, [verificationRecordId, verificationTimestamp, onGetSessionsWithDeviceMeta, onError, isVerificationValid]);

  const handleRefresh = useCallback(async () => {
    clearGeoCache();
    setMapModalGeo(null);
    setMapModalIp('');
    if (!isVerificationValid) {
      setViewState('unverified');
      return;
    }
    await loadSessions();
  }, [loadSessions, isVerificationValid, setMapModalGeo, setMapModalIp, setViewState]);

  const startViewVerification = () => {
    setModalPurpose('view');
    setModalStep({ kind: 'password' });
    setModalError('');
  };

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
  };

  const handlePasswordSubmit = async (password: string) => {
    try {
      if (modalPurpose === 'view' && !isVerificationValid) {
        await verifyAndLoad(password);
        return;
      }

      setModalStep({ kind: 'loading', message: t.sessions.processing });
      setModalError('');

      let vid = verificationRecordId;
      let vts = verificationTimestamp;
      if (!vid || Date.now() >= verificationExpiry) {
        const verifyResult = await onVerifyPassword(password);
        if (!verifyResult.ok) {
          setModalError(verifyResult.error);
          setModalStep({ kind: 'password' });
          setRevokingId(null);
          setRevokingAll(false);
          revokeTargetRef.current = null;
          setViewState('unverified');
          return;
        }
        vid = verifyResult.data.verificationRecordId;
        vts = verifyResult.data.verificationTimestamp;
        setVerificationRecordId(vid);
        setVerificationTimestamp(vts);
        setVerificationExpiry(vts); // vts IS the expiresAt
      }

      const target = revokeTargetRef.current;
      if (!target) {
        setModalStep(null);
        revokeTargetRef.current = null;
        return;
      }

      if (target.kind === 'all') {
        setRevokingAll(true);
        const revokeResult = await onRevokeAllOtherSessions(vid, vts);
        if (!revokeResult.ok) {
          setModalError(revokeResult.error);
          setModalStep({ kind: 'password' });
          setRevokingAll(false);
          if (revokeResult.error === 'VERIFICATION_FAILED' || revokeResult.error === 'UNAUTHORIZED') {
            setViewState('unverified');
            setVerificationRecordId(null);
            revokeTargetRef.current = null;
          }
          return;
        }
      } else {
        const revokeResult = await onRevokeSession(target.id, vid, vts, 'firstParty');
        if (!revokeResult.ok) {
          setModalError(revokeResult.error);
          setModalStep({ kind: 'password' });
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
      await loadSessions({ recordId: vid, timestamp: vts });
      setModalStep(null);
      revokeTargetRef.current = null;
      setRevokingId(null);
      setRevokingAll(false);
    } catch (error) {
      revokeTargetRef.current = null;
      throw error;
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

  const formatFullDateTime = (input: number | string) => {
    const date = typeof input === 'string' ? new Date(input) : new Date(input < 1e12 ? input * 1000 : input);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day}.${month}.${year} at ${hours}:${minutes} ${ampm}`;
  };

  const getSessionTitle = (session: LogtoSession): string => {
    if (session.meta?.browser) {
      const parts: string[] = [];
      parts.push(session.meta.browserVersion
        ? `${session.meta.browser} ${session.meta.browserVersion}`
        : session.meta.browser);
      if (session.meta.os) {
        parts.push(session.meta.osVersion ? `${session.meta.os} ${session.meta.osVersion}` : session.meta.os);
      }
      return parts.join(' · ');
    }
    return '';
  };

  if (viewState === 'unverified') {
    return (
      <div>
        <div style={{ marginBottom: '1.625rem' }}>
          <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.65 }}>
            {t.sessions.description}
          </p>
        </div>
        <div style={{
          padding: '2.5rem 2rem',
          textAlign: 'center',
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: DASHBOARD_RADIUS,
        }}>
          <Lock size={28} color={T.muted} strokeWidth={1.5} style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontFamily: T.font, fontSize: '0.9375rem', fontWeight: 600, color: T.text, marginBottom: '0.5rem' }}>
            {t.sessions.verifyToView}
          </h3>
          <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.muted, marginBottom: '1.25rem' }}>
            {t.sessions.verifyToViewDesc}
          </p>
          <Button variant="primary" onClick={startViewVerification} mode={mode} colors={c}>
            {t.sessions.verifyPassword}
          </Button>
        </div>
        {modalStep && modalPurpose === 'view' && (
          <PasswordVerifyModal
            title={t.sessions.verifyToView}
            subtitle={t.sessions.verifyToViewDesc}
            step={modalStep}
            onPasswordSubmit={handlePasswordSubmit}
            onClose={() => { setModalStep(null); setModalError(''); }}
            passwordError={modalError}
            mode={mode}
            colors={c}
            t={t}
          />
        )}
      </div>
    );
  }

  if (loading) {
    return (
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
              minHeight: isMobile ? 'auto' : '5.5rem',
              padding: isMobile ? '0.75rem 0.75rem' : '0 0.875rem',
              opacity: 1 - i * 0.2,
            }}>
              {/* 1. OS Icon placeholder */}
              <div style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                padding: isMobile ? '0 0 0 0' : '0.5rem 1.25rem 0.5rem 0.125rem',
                marginRight: isMobile ? '0.75rem' : '0'
              }}>
                <div style={{
                  width: isMobile ? '3rem' : '3rem',
                  height: isMobile ? '3rem' : '3rem',
                  borderRadius: '0.25rem',
                  background: T.raised,
                  animation: 'pulse 1.4s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`
                }} />
              </div>

              {/* 2. Text Content placeholder */}
              <div style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: isMobile ? '0' : '0.5rem 1rem',
                gap: isMobile ? '0.25rem' : '0.375rem',
              }}>
                {/* Title */}
                <div style={{
                  height: isMobile ? '0.625rem' : '0.75rem',
                  borderRadius: '0.25rem',
                  background: T.raised,
                  width: '55%',
                  animation: 'pulse 1.4s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`
                }} />
                {/* Signed In Timestamp */}
                <div style={{
                  height: '0.5rem',
                  borderRadius: '0.25rem',
                  background: T.raised,
                  width: isMobile ? '70%' : '45%',
                  animation: 'pulse 1.4s ease-in-out infinite',
                  animationDelay: `${i * 0.15 + 0.1}s`
                }} />
                {/* Expires Timestamp */}
                <div style={{
                  height: '0.5rem',
                  borderRadius: '0.25rem',
                  background: T.raised,
                  width: isMobile ? '50%' : '35%',
                  animation: 'pulse 1.4s ease-in-out infinite',
                  animationDelay: `${i * 0.15 + 0.2}s`
                }} />
                {/* Last Active (only if showLastActive) */}
                {showLastActive && (
                  <div style={{
                    height: '0.5rem',
                    borderRadius: '0.25rem',
                    background: T.raised,
                    width: isMobile ? '40%' : '30%',
                    animation: 'pulse 1.4s ease-in-out infinite',
                    animationDelay: `${i * 0.15 + 0.3}s`
                  }} />
                )}
              </div>

              {/* 3. Right-aligned button/action area */}
              <div style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: isMobile ? 'flex-end' : 'center',
                padding: isMobile ? '0' : '0.5rem 0.375rem 0.5rem 0',
                gap: '0.375rem',
              }}>
                {isCurrent ? (
                  isMobile ? (
                    // Globe icon placeholder for "This Device"
                    <button
                      aria-label={t.sessions.thisDevice}
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '0.25rem',
                        border: `1px solid ${c.borderColor}`,
                        background: c.bgTertiary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'default',
                        opacity: 0.6,
                      }}
                      disabled
                    >
                      <Globe size={16} color={T.muted} />
                    </button>
                  ) : (
                    // Desktop This Device Badge skeleton/placeholder
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
                  )
                ) : (
                  isMobile ? (
                    // Other Device Revoke Trash button placeholder
                    <div style={{
                      width: '1.75rem',
                      height: '1.75rem',
                      borderRadius: '0.25rem',
                      background: T.raised,
                      animation: 'pulse 1.4s ease-in-out infinite',
                      animationDelay: `${i * 0.15}s`
                    }} />
                  ) : (
                    // Desktop Other Device Revoke button placeholder
                    <div style={{
                      width: '4rem',
                      height: '1.75rem',
                      borderRadius: '0.25rem',
                      background: T.raised,
                      animation: 'pulse 1.4s ease-in-out infinite',
                      animationDelay: `${i * 0.15}s`
                    }} />
                  )
                )}

                {/* Map Button Placeholder */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  marginTop: isMobile ? '0.25rem' : '0.375rem',
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
              {sessions.some(s => s.meta?.isCurrent) && (
                <button
                  onClick={() => setShowGcAllModal(true)}
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
              {sessions.some(s => s.meta?.isCurrent) && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setShowGcAllModal(true)}
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

      <p style={{
        fontFamily: T.font,
        fontSize: '0.625rem',
        color: T.muted,
        margin: '0 0 0.875rem 0',
        lineHeight: 1.5,
      }}>
        {t.sessions.locationDisclosure}
      </p>

      {showGeoConsentForIp && (
        <div style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: DASHBOARD_RADIUS,
          padding: '1rem',
          margin: '0 0 1rem 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          fontFamily: T.font,
        }}>
          <p style={{ margin: 0, fontSize: '0.75rem', color: T.text, lineHeight: 1.5 }}>
            Allow map feature to use your IP address for approximate geolocation lookup?
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowGeoConsentForIp(null)}
              mode={mode}
              colors={c}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const ip = showGeoConsentForIp;
                setShowGeoConsentForIp(null);
                if (typeof window !== 'undefined') {
                  window.sessionStorage.setItem('geo-consent', 'true');
                }
                handleLocate(ip);
              }}
              mode={mode}
              colors={c}
            >
              Allow
            </Button>
          </div>
        </div>
      )}

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
                height: isMobile ? 'auto' : 'auto',
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
                    <h3 style={{
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
                        <>Signed in: {formatFullDateTime(session.payload.loginTs)}</>
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
                        style={{
                          width: '2rem',
                          height: '2rem',
                          borderRadius: '0.25rem',
                          border: `1px solid ${colors.borderColor}`,
                          background: colors.bgTertiary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'default',
                        }}
                        disabled
                      >
                        <Globe size={16} color={T.greenText} />
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
                        aria-label={t.sessions.revoke}
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
                          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
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
                          <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
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

      {modalStep && modalPurpose === 'revoke' && (
        <PasswordVerifyModal
          title={t.sessions.revokeSession}
          subtitle={t.sessions.revokeSessionDesc}
          step={modalStep}
          onPasswordSubmit={handlePasswordSubmit}
          onClose={() => { setModalStep(null); setRevokingId(null); revokeTargetRef.current = null; setModalError(''); }}
          passwordError={modalError}
          mode={mode}
          colors={c}
          t={t}
          danger
        />
      )}

      {mapModalGeo && (
        <SessionMapModal
          geo={mapModalGeo}
          ip={mapModalIp}
          mode={mode}
          colors={c}
          t={t}
          onClose={() => { setMapModalGeo(null); setMapModalIp(''); }}
        />
      )}

      {/* GC ALL Confirmation Modal (Task 1) */}
      {showGcAllModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !gcAllLoading && setShowGcAllModal(false)}
        >
          <div
            ref={gcAllDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gc-all-title"
            style={{
              background: T.bg,
              border: `1px solid ${T.border}`,
              borderRadius: DASHBOARD_RADIUS,
              padding: '1.5rem',
              width: 'min(92vw, 420px)',
              fontFamily: T.font,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="gc-all-title" style={{ fontSize: '1rem', fontWeight: 600, color: T.text, margin: '0 0 1rem 0' }}>
              {t.sessions.gcAllConfirmTitle}
            </h3>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <Button
                variant="secondary"
                onClick={() => setShowGcAllModal(false)}
                disabled={gcAllLoading}
                mode={mode}
                colors={c}
              >
                {t.common.close}
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (revokeTargetRef.current !== null) { setShowGcAllModal(false); return; }
                  setGcAllLoading(true);
                  revokeTargetRef.current = { kind: 'all' };
                  setModalPurpose('revoke');
                  setModalStep({ kind: 'password' });
                  setModalError('');
                  setShowGcAllModal(false);
                  setGcAllLoading(false);
                }}
                disabled={gcAllLoading}
                mode={mode}
                colors={c}
              >
                {gcAllLoading ? t.common.loading : t.common.yes}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
