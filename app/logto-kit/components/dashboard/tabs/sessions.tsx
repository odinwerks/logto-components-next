'use client';

import React, { useState, useCallback } from 'react';
import type { UserData, LogtoSession } from '../../../logic/types';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';
import { adj, tk } from '../../handlers/theme-helpers';
import { Monitor, Smartphone, Trash2, Check, Clock, Shield, Lock, Key, Users, MapPin } from 'lucide-react';
import { Button } from '../../shared/Button';
import { PasswordVerifyModal, PasswordModalStep } from '../shared/FlowModal';

interface SessionsTabProps {
  userData: UserData;
  theme: ThemeSpec;
  t: Translations;
  onGetSessionsWithDeviceMeta: (verificationRecordId: string) => Promise<{
    sessions: LogtoSession[];
    currentJti: string | null;
  }>;
  onRevokeSession: (sessionId: string, revokeGrantsTarget?: 'all' | 'firstParty', identityVerificationRecordId?: string) => Promise<void>;
  onVerifyPassword: (password: string) => Promise<{ verificationRecordId: string }>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const VERIFICATION_TTL_MS = 9 * 60 * 1000;

function OsIcon({ os, deviceType, size }: { os: string | null; deviceType: string | null; size: number }) {
  if (os === 'Linux') {
    return <img src="/os-icons/Tux.jpg" alt="Linux" width={size} height={size} style={{ borderRadius: 4, objectFit: 'contain' }} />;
  }
  if (os === 'Windows') {
    return <img src="/os-icons/MacroSlop.svg" alt="Windows" width={size} height={size} style={{ objectFit: 'contain' }} />;
  }
  if (os === 'macOS') {
    return <img src="/os-icons/MacOS.svg" alt="macOS" width={size} height={size} style={{ objectFit: 'contain' }} />;
  }
  if (os === 'iOS') {
    return <img src="/os-icons/ios.svg" alt="iOS" width={size} height={size} style={{ objectFit: 'contain' }} />;
  }
  if (os === 'Android') {
    return <img src="/os-icons/Android.svg" alt="Android" width={size} height={size} style={{ objectFit: 'contain' }} />;
  }
  if (deviceType === 'mobile') return <Smartphone size={size} strokeWidth={1.5} />;
  return <Monitor size={size} strokeWidth={1.5} />;
}

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function SessionsTab({
  userData,
  theme,
  t,
  onGetSessionsWithDeviceMeta,
  onRevokeSession,
  onVerifyPassword,
  onSuccess,
  onError,
}: SessionsTabProps) {
  const tc = theme.colors;
  const T = tk(tc);
  const [sessions, setSessions] = useState<LogtoSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [currentJti, setCurrentJti] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<PasswordModalStep | null>(null);
  const [modalError, setModalError] = useState<string>('');
  const [modalPurpose, setModalPurpose] = useState<'view' | 'revoke'>('view');

  const [verificationRecordId, setVerificationRecordId] = useState<string | null>(null);
  const [verificationExpiry, setVerificationExpiry] = useState<number>(0);
  const [viewState, setViewState] = useState<'unverified' | 'loaded'>('unverified');

  const isVerificationValid = verificationRecordId && Date.now() < verificationExpiry;

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
        const data = await onGetSessionsWithDeviceMeta(vid);
        setSessions(data.sessions);
        setCurrentJti(data.currentJti);
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
      const data = await onGetSessionsWithDeviceMeta(verificationRecordId!);
      setSessions(data.sessions);
      setCurrentJti(data.currentJti);
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

      await onRevokeSession(revokingId!, 'firstParty', vid);
      onSuccess(t.sessions.revoked);
      await loadSessions();
      setModalStep(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t.sessions.revokeFailed;
      setModalError(errorMsg);
      setModalStep({ kind: 'password' });
    } finally {
      setRevokingId(null);
    }
  };

  const getAuthIcon = (session: LogtoSession) => {
    const types = (session.lastSubmission?.verificationRecords || []).map(r => r.type);
    if (types.includes('Password')) return Lock;
    if (types.includes('Social')) return Users;
    if (types.includes('EnterpriseSso')) return Shield;
    if (types.includes('WebAuthn')) return Key;
    if (types.includes('Totp')) return Clock;
    return Users;
  };

  const isCurrentSession = (session: LogtoSession): boolean => {
    return session.payload.jti === currentJti;
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
      <div style={{ padding: '2rem', textAlign: 'center', color: T.muted }}>
        {t.common.loading}...
      </div>
    );
  }

  const radius = theme.tokens.dashboardRadius;

  return (
    <div>
      <div style={{ marginBottom: '1.625rem' }}>
        <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.65 }}>
          {t.sessions.description}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {sessions.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: radius,
            color: T.muted,
          }}>
            {t.sessions.noSessions}
          </div>
        ) : (
          sessions.map((session) => {
            const isCurrent = isCurrentSession(session);
            const meta = session.meta;
            const os = meta?.os ?? null;
            const deviceType = meta?.deviceType ?? null;
            const AuthIcon = getAuthIcon(session);

            const browserLabel = meta?.browser
              ? (meta.browserVersion ? `${meta.browser} ${meta.browserVersion}` : meta.browser)
              : null;
            const osLabel = meta?.os
              ? (meta.osVersion ? `${meta.os} ${meta.osVersion}` : meta.os)
              : null;
            const hasOsIcon = os === 'Linux' || os === 'Windows' || os === 'macOS' || os === 'iOS' || os === 'Android';

            const lastActive = meta?.lastActive
              ? formatRelativeTime(meta.lastActive)
              : null;

            return (
              <div key={session.payload.uid} style={{
                background: T.bg,
                border: `1px solid ${isCurrent ? T.blueText + '40' : T.border}`,
                borderRadius: radius,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
              }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {hasOsIcon || deviceType
                    ? <OsIcon os={os} deviceType={deviceType} size={22} />
                    : <Monitor size={20} strokeWidth={1.5} />
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {isCurrent && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.0625rem 0.375rem',
                        fontSize: '0.625rem',
                        fontFamily: T.mono,
                        background: T.greenDim,
                        color: T.greenText,
                        border: `1px solid ${adj(tc.accentGreen, -40) + '44'}`,
                        letterSpacing: 0.2,
                        borderRadius: '0.1875rem',
                      }}>
                        <Check size={9} />
                        {t.sessions.thisDevice}
                      </span>
                    )}
                    {browserLabel && (
                      <span style={{ fontFamily: T.font, fontSize: '0.8125rem', fontWeight: 500, color: T.text }}>
                        {browserLabel}
                      </span>
                    )}
                    {osLabel && (
                      <>
                        <span style={{ fontSize: '0.6875rem', color: T.muted }}>·</span>
                        <span style={{ fontSize: '0.8125rem', color: T.sub }}>{osLabel}</span>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.6875rem', color: T.muted, marginTop: '0.125rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AuthIcon size={11} />
                    </span>
                    {meta?.ip && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <MapPin size={10} />
                        {meta.ip}
                      </span>
                    )}
                    {lastActive && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Clock size={10} />
                        {lastActive}
                      </span>
                    )}
                  </div>
                </div>

                {isCurrent ? (
                  <Button size="sm" variant="secondary" disabled theme={theme}>
                    {t.sessions.currentSession}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => startRevokeVerification(session.payload.uid)}
                    disabled={revokingId === session.payload.uid}
                    theme={theme}
                  >
                    {revokingId === session.payload.uid ? t.common.loading : t.sessions.revoke}
                  </Button>
                )}
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
    </div>
  );
}