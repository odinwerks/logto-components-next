'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import type { UserData, LogtoSession } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import { FONT_SANS, FONT_MONO } from '../../../themes';
import type { Translations } from '../../../locales';
import { Monitor, Smartphone, Trash2, Lock, MapPin, RefreshCw } from 'lucide-react';
import { Button } from '../../shared/Button';
import { PasswordVerifyModal, PasswordModalStep } from '../shared/FlowModal';
import { SessionMapModal } from '../shared/SessionMapModal';
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
      <Image
        src={src}
        alt={os ?? 'OS'}
        width={size}
        height={size}
        style={{ display: 'block' }}
        onError={() => setImgError(true)}
      />
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

  const [verificationRecordId, setVerificationRecordId] = useState<string | null>(null);
  const [verificationTimestamp, setVerificationTimestamp] = useState<number>(0);
  const [verificationExpiry, setVerificationExpiry] = useState<number>(0);
  const [viewState, setViewState] = useState<'unverified' | 'loaded'>('unverified');

  // Persists the revoke target through failed attempts so retries send the correct session ID
  const revokeTargetRef = useRef<{ kind: 'single'; id: string } | { kind: 'all' } | null>(null);

  const [currentTime, setCurrentTime] = useState(() => Date.now());
  useEffect(() => {
    setCurrentTime(Date.now());
  }, []);

  const isVerificationValid = verificationRecordId && currentTime < verificationExpiry;

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
  }, []);

  const handleLocate = useCallback(async (ip: string) => {
    if (!ip) return;
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
      return;
    }
    const { verificationRecordId: vid, verificationTimestamp: ts } = verifyResult.data;
    const expiresAt = ts + VERIFICATION_CLOCK_SKEW_TOLERANCE_MS;
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
      setLoading(false);
      return;
    }
    setSessions(sessionsResult.data);
    setViewState('loaded');
    setLoading(false);
  }, [onVerifyPassword, onGetSessionsWithDeviceMeta, onError, t]);

  const loadSessions = useCallback(async (verification?: { recordId: string; timestamp: number }) => {
    const recordId = verification?.recordId ?? verificationRecordId;
    const timestamp = verification?.timestamp ?? verificationTimestamp;
    const hasValidVerification = verification ? true : isVerificationValid;

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
  }, [loadSessions, isVerificationValid]);

  const handleRevokeAll = useCallback(async () => {
    // Always require password confirmation for revoke all - the password modal
    // serves as both confirmation and verification.
    setRevokingId('__all__');
    revokeTargetRef.current = { kind: 'all' };
    setModalPurpose('revoke');
    setModalStep({ kind: 'password' });
    setModalError('');
  }, []);

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
        return;
      }
      vid = verifyResult.data.verificationRecordId;
      vts = verifyResult.data.verificationTimestamp;
      setVerificationRecordId(vid);
      setVerificationTimestamp(vts);
      setVerificationExpiry(vts + VERIFICATION_CLOCK_SKEW_TOLERANCE_MS);
    }

    const target = revokeTargetRef.current;
    if (!target) {
      setModalStep(null);
      return;
    }

    if (target.kind === 'all') {
      const revokeResult = await onRevokeAllOtherSessions(vid, vts);
      if (!revokeResult.ok) {
        setModalError(revokeResult.error);
        setModalStep({ kind: 'password' });
        setRevokingAll(false);
        return;
      }
    } else {
      const revokeResult = await onRevokeSession(target.id, vid, vts, 'firstParty');
      if (!revokeResult.ok) {
        setModalError(revokeResult.error);
        setModalStep({ kind: 'password' });
        setRevokingAll(false);
        return;
      }
    }
    onSuccess(t.sessions.revoked);
    await loadSessions({ recordId: vid, timestamp: vts });
    setModalStep(null);
    revokeTargetRef.current = null;
    setRevokingId(null);
    setRevokingAll(false);
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

  const getDeviceLabel = (session: LogtoSession): string => {
    if (session.meta?.deviceType === 'mobile') return t.sessions.mobile;
    if (session.meta?.deviceType === 'tablet') return t.sessions.tablet;
    if (session.meta?.deviceType) return t.sessions.desktop;
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
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: DASHBOARD_RADIUS,
            height: '5.5rem',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            padding: '0 0.875rem',
            gap: '0.75rem',
            opacity: 1 - i * 0.2,
          }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.25rem', background: T.raised, flexShrink: 0, animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ height: '0.625rem', borderRadius: '0.25rem', background: T.raised, width: '55%', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
              <div style={{ height: '0.5rem', borderRadius: '0.25rem', background: T.raised, width: '35%', animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.15 + 0.1}s` }} />
            </div>
            <div style={{ width: '5rem', height: '5.5rem', background: T.raised, flexShrink: 0, animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
            <div style={{ width: '4rem', height: '1.75rem', borderRadius: '0.25rem', background: T.raised, flexShrink: 0, animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
          </div>
        ))}
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
          {sessions.some(s => s.meta?.isCurrent) && (
            <Button
              size="sm"
              variant="danger"
              onClick={handleRevokeAll}
              disabled={revokingAll || loading || revokingId === '__all__'}
              mode={mode}
              colors={c}
            >
              {revokingAll ? t.common.loading : t.sessions.revokeAll}
            </Button>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              fontFamily: T.font,
              fontSize: '0.6875rem',
              fontWeight: 500,
              color: T.muted,
              background: 'none',
              border: `1px solid ${T.border}`,
              borderRadius: DASHBOARD_RADIUS,
              padding: '0.3125rem 0.75rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
                e.currentTarget.style.color = T.text;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = T.muted;
            }}
          >
            <RefreshCw size={12} strokeWidth={1.5} />
            {t.sessions.refreshData}
          </button>
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
            const deviceLabel = getDeviceLabel(session);
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
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: isMobile ? '0.75rem 0 0.75rem 0.75rem' : '0.5rem 1.25rem 0.5rem 1rem' }}>
                  <OsIcon os={os} deviceType={deviceType} size={isMobile ? 32 : 48} />
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? '0.75rem 0.75rem' : '0.5rem 1rem' }}>
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
                            color: mode === 'dark' ? '#34c759' : '#1a7a2e',
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
                    <span>{isMobile ? formatDate(session.payload.loginTs) : `${t.sessions.loggedInAt}: ${formatDate(session.payload.loginTs)}`}</span>
                  </div>

                  <div style={{ marginTop: '0.125rem', fontSize: isMobile ? '0.625rem' : '0.6875rem', color: T.sub }}>
                    <span>{t.sessions.expires}: {formatDate(session.payload.exp)}</span>
                  </div>

                  {isMobile && showLastActive && meta?.lastActive && (
                    <div style={{ marginTop: '0.125rem', fontSize: '0.625rem' }}>
                      <span style={{ color: T.sub }}>{t.sessions.lastActive}: </span>
                      {meta.lastActive === 'now' ? (
                        <span style={{
                          color: mode === 'dark' ? '#34c759' : '#1a7a2e',
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

                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: isMobile ? '0.75rem 0.75rem 0.75rem 0' : '0.5rem 1.25rem 0.5rem 0', gap: '0.375rem' }}>
                  {session.meta?.isCurrent ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontFamily: T.font,
                      fontSize: isMobile ? '0.625rem' : '0.6875rem',
                      fontWeight: 600,
                      padding: isMobile ? '0.25rem 0.5rem' : '0.3125rem 0.75rem',
                      borderRadius: '0.25rem',
                      whiteSpace: 'nowrap',
                      border: mode === 'dark' ? '1px solid #34c759' : '1px solid #2ea843',
                      background: mode === 'dark' ? 'rgba(52, 199, 89, 0.2)' : 'rgba(52, 199, 89, 0.15)',
                      color: mode === 'dark' ? '#34c759' : '#1a7a2e',
                    }}>
                      {!isMobile && (
                        <span style={{
                          width: '0.4rem',
                          height: '0.4rem',
                          borderRadius: '50%',
                          background: 'currentColor',
                          display: 'inline-block',
                        }} />
                      )}
                      {t.sessions.thisDevice}
                    </span>
                  ) : (
                    isMobile ? (
                      <button
                        onClick={() => startRevokeVerification(session.payload.uid)}
                        disabled={!!revokingId || revokingAll}
                        aria-label={t.sessions.revoke}
                        style={{
                          width: '1.75rem', height: '1.75rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'transparent',
                          border: `1px solid ${T.border}`,
                          borderRadius: '0.25rem',
                          color: T.muted,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      ><Trash2 size={12} /></button>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => startRevokeVerification(session.payload.uid)}
                        disabled={!!revokingId || revokingAll}
                        mode={mode}
                        colors={c}
                      >
                        {revokingId === session.payload.uid ? t.common.loading : t.sessions.revoke}
                      </Button>
                    )
                  )}
                  {ip && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      marginTop: isMobile ? '0.25rem' : '0.375rem',
                    }}>
                      <span style={{
                        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                        fontSize: '0.5625rem',
                        color: T.muted,
                        whiteSpace: 'nowrap',
                      }}>
                        {ip}
                      </span>
                      <button
                        onClick={() => handleLocate(ip)}
                        disabled={locatingIp === ip}
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
                          cursor: locatingIp === ip ? 'not-allowed' : 'pointer',
                          color: locatingIp === ip ? T.muted : T.sub,
                          padding: 0,
                          opacity: locatingIp === ip ? 0.5 : 1,
                          flexShrink: 0,
                        }}
                      >
                        {locatingIp === ip ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite"/>
                            </path>
                          </svg>
                        ) : (
                          <MapPin size={10} strokeWidth={1.5} />
                        )}
                      </button>
                    </div>
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
    </div>
  );
}
