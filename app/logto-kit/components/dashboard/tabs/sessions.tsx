'use client';

/**
 * IN DEVELOPMENT — Sessions tab component.
 * Shows device metadata (browser, OS, IP, last active) for each active session.
 * Requires session-track API and S3 storage to be fully functional.
 */
import React, { useState, useCallback } from 'react';
import type { UserData, LogtoSession } from '../../../logic/types';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';
import { adj, tk } from '../../handlers/theme-helpers';
import { Monitor, Smartphone, Globe, Trash2, Check, Clock, Shield, Lock, Key, Users, MapPin } from 'lucide-react';
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

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAuthMethodLabel = (session: LogtoSession): string => {
    const records = session.lastSubmission?.verificationRecords || [];
    const types = records.map(r => r.type);
    if (types.includes('Password')) return t.sessions.password;
    if (types.includes('Social')) return t.sessions.social;
    if (types.includes('EnterpriseSso')) return t.sessions.enterpriseSso;
    if (types.includes('WebAuthn')) return t.sessions.webauthn;
    if (types.includes('Totp')) return t.sessions.totp;
    if (types.includes('BackupCode')) return t.sessions.backupCode;
    return t.sessions.unknown;
  };

  const getAuthIcon = (method: string) => {
    switch (method) {
      case t.sessions.password: return Lock;
      case t.sessions.social: return Users;
      case t.sessions.enterpriseSso: return Shield;
      case t.sessions.webauthn: return Key;
      case t.sessions.totp: return Clock;
      case t.sessions.backupCode: return Key;
      default: return Globe;
    }
  };

  const getDeviceIcon = (deviceType: string | null): typeof Monitor => {
    if (!deviceType) return Globe;
    if (deviceType === 'mobile') return Smartphone;
    return Monitor;
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
    if (session.meta?.deviceType === 'tablet') return t.sessions.desktop;
    if (session.meta?.deviceType) return t.sessions.desktop;
    return '';
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

  return (
    <div>
      <div style={{ marginBottom: '1.625rem' }}>
        <p style={{ fontFamily: T.font, fontSize: '0.75rem', color: T.sub, lineHeight: 1.65 }}>
          {t.sessions.description}
        </p>
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
          sessions.map((session) => {
            const isCurrent = isCurrentSession(session);
            const authMethod = getAuthMethodLabel(session);
            const authIcon = getAuthIcon(authMethod);
            const meta = session.meta;
            const deviceIcon = getDeviceIcon(meta?.deviceType ?? null);
            const title = getSessionTitle(session);
            const deviceLabel = getDeviceLabel(session);
            const showCurrentLabel = isCurrent || !title;

            return (
              <div key={session.payload.jti} style={{
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: theme.tokens.dashboardRadius,
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  background: isCurrent ? T.blue : T.muted + '20',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isCurrent ? T.blueText : T.muted,
                  flexShrink: 0,
                }}>
                  {isCurrent
                    ? <Check size={16} strokeWidth={2} />
                    : React.createElement(deviceIcon, { size: 16, strokeWidth: 1.5 })
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h3 style={{
                      fontFamily: T.font,
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: T.text,
                      margin: 0,
                    }}>
                      {showCurrentLabel ? t.sessions.currentSession : title}
                    </h3>
                    {isCurrent && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.125rem 0.5rem',
                        fontSize: '0.625rem',
                        fontFamily: T.mono,
                        background: T.greenDim,
                        color: T.greenText,
                        border: `1px solid ${adj(tc.accentGreen, -40) + '44'}`,
                        letterSpacing: 0.2,
                        borderRadius: '0.25rem',
                      }}>
                        <Check size={10} />
                        {t.sessions.thisDevice}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: T.muted, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {React.createElement(authIcon, { size: 12 })}
                      <span>{authMethod}</span>
                    </div>
                    {deviceLabel && !title && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {React.createElement(deviceIcon, { size: 12 })}
                        <span>{deviceLabel}</span>
                      </div>
                    )}
                    {meta?.lastActive ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} />
                        <span>{t.sessions.lastActive}: {formatDate(new Date(meta.lastActive).getTime())}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} />
                        <span>{t.sessions.signedIn}: {formatDate(session.payload.loginTs)}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '0.25rem', fontSize: '0.6875rem', color: T.sub, display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {title && meta && (
                      <span>{meta.browser}{meta.browserVersion ? ` ${meta.browserVersion}` : ''} · {meta.os}{meta.osVersion ? ` ${meta.osVersion}` : ''}</span>
                    )}
                    {meta?.ip && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <MapPin size={10} />
                        {meta.ip}
                      </span>
                    )}
                    <span>{t.sessions.expires}: {formatDate(session.payload.exp)}</span>
                  </div>
                </div>

                {!isCurrent && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => startRevokeVerification(session.payload.jti)}
                    disabled={revokingId === session.payload.jti}
                    theme={theme}
                  >
                    {revokingId === session.payload.jti ? (
                      t.common.loading
                    ) : (
                      <>
                        <Trash2 size={12} />
                        {t.sessions.revoke}
                      </>
                    )}
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