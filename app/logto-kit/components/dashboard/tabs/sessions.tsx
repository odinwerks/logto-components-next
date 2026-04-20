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

type OsIconProps = { size: number; color: string };

function OsIcon({ os, deviceType, size, color }: OsIconProps & { os: string | null; deviceType: string | null }) {
  if (os === 'Linux') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M12.504 0c-.155 0-.315.008-.48.021-.411.032-.823.087-1.224.173-.341.074-.686.138-1.02.233a5.44 5.44 0 0 0-1.02.327c-.38.148-.749.31-1.107.503-.341.18-.675.37-1.001.577-.268.17-.536.352-.793.545-.298.223-.584.468-.865.724-.305.276-.597.572-.87.89a8.333 8.333 0 0 0-.586.823 8.34 8.34 0 0 0-.433.936c-.076.215-.133.436-.186.658-.035.146-.06.295-.08.444-.013.101-.02.202-.024.305-.003.035-.007.07-.008.106-.006.138-.008.276-.006.415.005.308.03.615.09.92.075.378.19.75.35 1.107.15.338.342.66.569.956.193.25.41.487.648.703.27.248.565.473.88.672.315.2.648.378.99.53.35.155.71.288 1.075.395.39.115.789.195 1.19.24.35.04.702.053 1.053.045.37-.01.738-.045 1.105-.106.34-.056.675-.138 1.005-.24a6.432 6.432 0 0 0 1.04-.396c.346-.167.675-.36.99-.575.31-.21.598-.444.858-.703.23-.232.438-.48.622-.745.19-.273.356-.56.495-.857.125-.27.217-.554.277-.845a6.71 6.71 0 0 0 .11-.948c.006-.165.006-.332.002-.497 0-.048-.004-.096-.01-.143-.01-.099-.025-.198-.044-.296-.056-.28-.14-.556-.25-.822-.12-.29-.276-.57-.46-.833-.215-.306-.46-.593-.73-.86-.28-.28-.59-.53-.92-.75-.35-.24-.72-.45-1.1-.62-.36-.16-.73-.29-1.1-.39-.36-.1-.73-.17-1.1-.21-.37-.04-.74-.06-1.11-.05zm-4.59 14.69l-.14.004c-.085.003-.17.012-.255.025-.08.012-.16.032-.24.055-.084.025-.166.058-.246.09-.082.034-.16.076-.237.12-.075.042-.146.09-.216.14-.068.05-.132.107-.194.166l-.02.02a1.394 1.394 0 0 0-.1.1 2.1 2.1 0 0 0-.14.178c-.045.06-.087.123-.127.19l-.05.09c-.032.06-.06.124-.086.19a2.486 2.486 0 0 0-.1.29c-.018.07-.03.14-.04.21-.01.074-.015.15-.02.224-.006.077-.007.154-.008.23v.045l.008.22c.002.07.007.142.017.21.01.075.025.15.04.22.02.076.04.152.067.227.025.07.057.14.09.208.03.06.066.12.105.177.038.054.08.106.125.155.044.047.093.09.144.13a1.9 1.9 0 0 0 .16.11c.06.037.12.07.183.103l.1.05c.04.016.08.034.122.047.04.013.083.022.125.03l.1.02c.035.005.07.012.106.015l.18.015c.06.003.12.003.18.002.05 0 .1-.003.15-.008.05-.004.1-.012.15-.022.05-.01.1-.024.148-.04.05-.016.097-.036.145-.058.05-.024.097-.05.144-.08l.04-.025c.04-.025.08-.053.116-.083a1.86 1.86 0 0 0 .13-.114c.02-.02.04-.04.058-.062.02-.023.04-.046.055-.07l.02-.03c.03-.047.058-.095.084-.145l.01-.02c.018-.038.035-.076.05-.115.013-.035.024-.07.034-.107a1.5 1.5 0 0 0 .034-.19c.005-.035.01-.07.012-.106l.004-.04v-.025l-.004-.024-.008-.07c-.005-.045-.013-.09-.024-.133a1.65 1.65 0 0 0-.045-.16l-.01-.025a1.86 1.86 0 0 0-.07-.17l-.02-.04a2.26 2.26 0 0 0-.1-.16l-.03-.04a2.3 2.3 0 0 0-.11-.136l-.03-.035a2.44 2.44 0 0 0-.13-.125l-.03-.027a2.56 2.56 0 0 0-.15-.118l-.035-.022a2.74 2.74 0 0 0-.16-.096l-.04-.02a2.81 2.81 0 0 0-.17-.08l-.04-.015a2.99 2.99 0 0 0-.18-.06l-.045-.01a3.3 3.3 0 0 0-.19-.043l-.05-.008a3.5 3.5 0 0 0-.2-.026l-.05-.004a3.4 3.4 0 0 0-.21-.01z" />
      </svg>
    );
  }
  if (os === 'Windows') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="1" y="1" width="10" height="10" fill={color} />
        <rect x="13" y="1" width="10" height="10" fill={color} />
        <rect x="1" y="13" width="10" height="10" fill={color} />
        <rect x="13" y="13" width="10" height="10" fill={color} />
      </svg>
    );
  }
  if (os === 'macOS' || os === 'iOS') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
      </svg>
    );
  }
  if (os === 'Android') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M17.523 15.341a.593.593 0 0 0-.144-.423.576.576 0 0 0-.407-.167H7.028a.578.578 0 0 0-.407.167.593.593 0 0 0-.144.423c.017.127.046.25.087.367v1.773c0 .314.247.568.55.568h.282v.005c0 .314.247.568.55.568h8.567c.303 0 .55-.254.55-.568v-.005h.282c.303 0 .55-.254.55-.568v-1.773c-.01-.12.007-.241.024-.36zm-5.585-8.099c-1.108.014-1.997.934-1.997 2.069 0 1.137.891 2.057 2 2.07 1.11-.013 2-.933 2-2.07 0-1.135-.89-2.055-2-2.069h-.003zm-5.38 2.883c-.39 0-.705.315-.705.705 0 .39.315.705.705.705.39 0 .705-.315.705-.705 0-.39-.315-.705-.705-.705zm10.763 0c-.39 0-.705.315-.705.705 0 .39.315.705.705.705.39 0 .705-.315.705-.705 0-.39-.315-.705-.705-.705z" />
      </svg>
    );
  }
  if (deviceType === 'mobile') return <Smartphone size={size} color={color} strokeWidth={1.5} />;
  return <Monitor size={size} color={color} strokeWidth={1.5} />;
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
      default: return Users;
    }
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
            const os = meta?.os ?? null;
            const deviceType = meta?.deviceType ?? null;
            const title = getSessionTitle(session);
            const deviceLabel = getDeviceLabel(session);
            const showCurrentLabel = isCurrent || !title;
            const iconColor = isCurrent ? T.blueText : T.muted;

            return (
              <div key={session.payload.uid} style={{
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
                  color: iconColor,
                  flexShrink: 0,
                }}>
                  {isCurrent
                    ? <Check size={16} strokeWidth={2} />
                    : <OsIcon os={os} deviceType={deviceType} size={16} color={iconColor} />
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
                        <OsIcon os={os} deviceType={deviceType} size={12} color={T.muted} />
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
