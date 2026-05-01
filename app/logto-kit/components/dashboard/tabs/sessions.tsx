'use client';

import React, { useState, useCallback } from 'react';
import type { UserData, LogtoSession } from '../../../logic/types';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';
import { tk } from '../../handlers/theme-helpers';
import { Monitor, Smartphone, Trash2, Lock, Clock, MapPin, RefreshCw } from 'lucide-react';
import { Button } from '../../shared/Button';
import { PasswordVerifyModal, PasswordModalStep } from '../shared/FlowModal';
import { SessionMiniMap } from '../shared/SessionMiniMap';
import { SessionMapModal } from '../shared/SessionMapModal';
import { clearGeoCache } from '../shared/geo-cache';
import type { GeoLocation } from '../shared/geo-cache';

interface SessionsTabProps {
  userData: UserData;
  theme: ThemeSpec;
  t: Translations;
  onGetSessionsWithDeviceMeta: (verificationRecordId: string) => Promise<LogtoSession[]>;
  onRevokeSession: (sessionId: string, revokeGrantsTarget?: 'all' | 'firstParty', identityVerificationRecordId?: string) => Promise<void>;
  onRevokeAllOtherSessions: (verificationRecordId: string) => Promise<void>;
  onVerifyPassword: (password: string) => Promise<{ verificationRecordId: string }>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const VERIFICATION_TTL_MS = 9 * 60 * 1000;

function OsIcon({ os, deviceType, size }: { os: string | null; deviceType: string | null; size: number }) {
  if (os === 'Linux') {
    return <img src="/os-icons/Tux.jpg" alt="Linux" width={size} height={size} style={{ display: 'block' }} />;
  }
  if (os === 'Windows') {
    return <img src="/os-icons/MacroSlop.svg" alt="Windows" width={size} height={size} style={{ display: 'block' }} />;
  }
  if (os === 'macOS') {
    return <img src="/os-icons/MacOS.svg" alt="macOS" width={size} height={size} style={{ display: 'block' }} />;
  }
  if (os === 'iOS') {
    return <img src="/os-icons/ios.svg" alt="iOS" width={size} height={size} style={{ display: 'block' }} />;
  }
  if (os === 'Android') {
    return <img src="/os-icons/Android.svg" alt="Android" width={size} height={size} style={{ display: 'block' }} />;
  }
  if (deviceType === 'mobile') return <Smartphone size={size} strokeWidth={1.5} />;
  return <Monitor size={size} strokeWidth={1.5} />;
}

export function SessionsTab({
  userData,
  theme,
  t,
  onGetSessionsWithDeviceMeta,
  onRevokeSession,
  onRevokeAllOtherSessions,
  onVerifyPassword,
  onSuccess,
  onError,
}: SessionsTabProps) {
  const tc = theme.colors;
  const T = tk(tc);
  const [sessions, setSessions] = useState<LogtoSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [modalStep, setModalStep] = useState<PasswordModalStep | null>(null);
  const [modalError, setModalError] = useState<string>('');
  const [modalPurpose, setModalPurpose] = useState<'view' | 'revoke'>('view');
  const [geoMap, setGeoMap] = useState<Map<string, GeoLocation>>(new Map());
  const [geoRefreshKey, setGeoRefreshKey] = useState(0);
  const [mapModalGeo, setMapModalGeo] = useState<GeoLocation | null>(null);
  const [mapModalIp, setMapModalIp] = useState<string>('');

  const [verificationRecordId, setVerificationRecordId] = useState<string | null>(null);
  const [verificationExpiry, setVerificationExpiry] = useState<number>(0);
  const [viewState, setViewState] = useState<'unverified' | 'loaded'>('unverified');

  const isVerificationValid = verificationRecordId && Date.now() < verificationExpiry;

  const handleGeoLoaded = useCallback((ip: string, geo: GeoLocation) => {
    setGeoMap(prev => {
      if (prev.get(ip) === geo) return prev;
      const next = new Map(prev);
      next.set(ip, geo);
      return next;
    });
  }, []);

  const openMapModal = useCallback((geo: GeoLocation, ip: string) => {
    setMapModalGeo(geo);
    setMapModalIp(ip);
  }, []);

  const verifyAndLoad = useCallback(async (password: string) => {
    setModalStep({ kind: 'loading', message: t.sessions.processing });
    setModalError('');
    try {
      const { verificationRecordId: vid } = await onVerifyPassword(password);
      const expiresAt = Date.now() + VERIFICATION_TTL_MS;
      setVerificationRecordId(vid);
      setVerificationExpiry(expiresAt);

      setViewState('loaded');
      setModalStep(null);

      setLoading(true);
      try {
        const sessions = await onGetSessionsWithDeviceMeta(vid);
        setSessions(sessions);
      } catch (err) {
        onError(err instanceof Error ? err.message : t.sessions.loadFailed);
      } finally {
        setLoading(false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t.sessions.verifyFailed;
      setModalError(errorMsg);
      setModalStep({ kind: 'password' });
    }
  }, [onVerifyPassword, onGetSessionsWithDeviceMeta, onError, t]);

  const loadSessions = useCallback(async () => {
    if (!isVerificationValid) return;
    setLoading(true);
    try {
      const sessions = await onGetSessionsWithDeviceMeta(verificationRecordId!);
      setSessions(sessions);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t.sessions.loadFailed;
      if (errorMsg.includes('401') || errorMsg.includes('verification')) {
        setViewState('unverified');
        setVerificationRecordId(null);
      } else {
        onError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [verificationRecordId, onGetSessionsWithDeviceMeta, onError, t, isVerificationValid]);

  const handleRefresh = useCallback(async () => {
    clearGeoCache();
    setGeoMap(new Map());
    setGeoRefreshKey(k => k + 1);
    await loadSessions();
  }, [loadSessions]);

  const handleRevokeAll = useCallback(async () => {
    if (!isVerificationValid) {
      setRevokingId('__all__');
      setModalPurpose('revoke');
      setModalStep({ kind: 'password' });
      setModalError('');
      return;
    }
    setRevokingAll(true);
    try {
      await onRevokeAllOtherSessions(verificationRecordId!);
      onSuccess(t.sessions.revoked);
      await loadSessions();
    } catch (err) {
      onError(err instanceof Error ? err.message : t.sessions.revokeFailed);
    } finally {
      setRevokingAll(false);
    }
  }, [isVerificationValid, verificationRecordId, onRevokeAllOtherSessions, onSuccess, onError, loadSessions, t]);

  const startViewVerification = () => {
    setModalPurpose('view');
    setModalStep({ kind: 'password' });
    setModalError('');
  };

  const startRevokeVerification = (sessionId: string) => {
    setRevokingId(sessionId);
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
    try {
      let vid = verificationRecordId;
      if (!vid || Date.now() >= verificationExpiry) {
        const result = await onVerifyPassword(password);
        vid = result.verificationRecordId;
        setVerificationRecordId(vid);
        setVerificationExpiry(Date.now() + VERIFICATION_TTL_MS);
      }

      if (revokingId === '__all__') {
        await onRevokeAllOtherSessions(vid);
      } else {
        await onRevokeSession(revokingId!, 'firstParty', vid);
      }
      onSuccess(t.sessions.revoked);
      await loadSessions();
      setModalStep(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t.sessions.revokeFailed;
      setModalError(errorMsg);
      setModalStep({ kind: 'password' });
    } finally {
      setRevokingId(null);
      setRevokingAll(false);
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
          borderRadius: theme.tokens.dashboardRadius,
        }}>
          <Lock size={28} color={T.muted} strokeWidth={1.5} style={{ marginBottom: '0.75rem' }} />
          <h3 style={{ fontFamily: T.font, fontSize: '0.9375rem', fontWeight: 600, color: T.text, marginBottom: '0.5rem' }}>
            {t.sessions.verifyToView}
          </h3>
          <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.muted, marginBottom: '1.25rem' }}>
            {t.sessions.verifyToViewDesc}
          </p>
          <Button variant="primary" onClick={startViewVerification} theme={theme}>
            <Lock size={14} />
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
            theme={theme}
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
            borderRadius: theme.tokens.dashboardRadius,
            height: '5rem',
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
            <div style={{ width: '5rem', height: '5rem', background: T.raised, flexShrink: 0, animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
            <div style={{ width: '4rem', height: '1.75rem', borderRadius: '0.25rem', background: T.raised, flexShrink: 0, animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
          </div>
        ))}
      </div>
    );
  }

  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.meta?.isCurrent && !b.meta?.isCurrent) return -1;
    if (!a.meta?.isCurrent && b.meta?.isCurrent) return 1;
    return b.payload.loginTs - a.payload.loginTs;
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
              theme={theme}
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
              borderRadius: theme.tokens.dashboardRadius,
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
                e.currentTarget.style.background = theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {sessions.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: theme.tokens.dashboardRadius,
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
            const geoForIp = ip ? geoMap.get(ip) : undefined;
            const ipLabel = ip
              ? (geoForIp ? `${ip} · ${[geoForIp.city, geoForIp.country].filter(Boolean).join(', ')}` : ip)
              : null;

            return (
              <div key={session.payload.uid} style={{
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: theme.tokens.dashboardRadius,
                display: 'flex',
                alignItems: 'stretch',
                overflow: 'hidden',
                height: '5rem',
              }}>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 0 0 0.875rem' }}>
                  <OsIcon os={os} deviceType={deviceType} size={40} />
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h3 style={{
                      fontFamily: T.font,
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: T.text,
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {title || t.sessions.unknown}
                    </h3>
                    {session.meta?.isCurrent && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: theme.mode === 'dark' ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.12)',
                        color: theme.mode === 'dark' ? '#34c759' : '#1a7a2e',
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}>
                        <span style={{
                          width: '0.4rem',
                          height: '0.4rem',
                          borderRadius: '50%',
                          background: 'currentColor',
                          display: 'inline-block',
                        }} />
                        {t.sessions.thisDevice}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: T.muted, flexWrap: 'nowrap', overflow: 'hidden' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>{t.sessions.loggedInAt}: {formatDate(session.payload.loginTs)}</span>
                  </div>

                  <div style={{ marginTop: '0.125rem', fontSize: '0.6875rem', color: T.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span>{t.sessions.expires}: {formatDate(session.payload.exp)}</span>
                  </div>
                </div>

                <SessionMiniMap
                  ip={ip}
                  theme={theme}
                  t={t}
                  refreshKey={geoRefreshKey}
                  onClick={openMapModal}
                  onGeoLoaded={handleGeoLoaded}
                />

                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 0.875rem 0 0.75rem', gap: '0.25rem' }}>
                  {session.meta?.isCurrent ? (
                    <span style={{
                      fontFamily: T.font,
                      fontSize: '0.6875rem',
                      color: T.muted,
                      padding: '0.3125rem 0.75rem',
                      whiteSpace: 'nowrap',
                    }}>
                      {t.sessions.thisDevice}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => startRevokeVerification(session.payload.uid)}
                      disabled={!!revokingId || revokingAll}
                      theme={theme}
                    >
                      {revokingId === session.payload.uid ? (
                        t.common.loading
                      ) : (
                        <>
                          <Trash2 size={12} />
                          {t.sessions.revoke}
                        </>
                      )}
                    </Button>
                  )}
                  {ipLabel && (
                    <span style={{ fontSize: '0.625rem', color: T.sub, whiteSpace: 'nowrap', textAlign: 'center', lineHeight: 1.3 }}>
                      {ip && <span>{ip}</span>}
                      {ip && geoForIp && <br />}
                      {geoForIp && <span>{[geoForIp.city, geoForIp.country].filter(Boolean).join(', ')}</span>}
                    </span>
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
          onClose={() => { setModalStep(null); setRevokingId(null); setModalError(''); }}
          passwordError={modalError}
          theme={theme}
          t={t}
          danger
        />
      )}

      {mapModalGeo && (
        <SessionMapModal
          geo={mapModalGeo}
          ip={mapModalIp}
          theme={theme}
          t={t}
          onClose={() => { setMapModalGeo(null); setMapModalIp(''); }}
        />
      )}
    </div>
  );
}