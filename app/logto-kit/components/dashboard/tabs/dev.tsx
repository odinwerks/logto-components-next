'use client';

import { useState, useEffect } from 'react';
import { KeyRound, Braces, Cookie, LogOut, ShieldAlert } from 'lucide-react';
import type { UserData } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import { CodeBlock } from '../shared/CodeBlock';
import { loadOrganizationPermissions } from '../../../actions/load-org-permissions';
import { getCurrentAccessToken } from '../../../logic/actions/debug-token';
import { isDev } from '../../../logic/dev-mode';

// ─── TruncatedToken: only shows first/last 8 chars by default ───
function TruncatedToken({ token, mode, colors, t }: { token: string; mode: 'dark' | 'light'; colors: ThemeColors; t: Translations }) {
  const [revealed, setRevealed] = useState(false);

  if (token.length <= 16) {
    return <CodeBlock data={token} mode={mode} colors={colors} maxHeight="7.5rem" t={t} />;
  }

  const preview = revealed
    ? token
    : `${token.slice(0, 8)}${'•'.repeat(8)}${token.slice(-8)}`;

  return (
    <div>
      <CodeBlock data={preview} mode={mode} colors={colors} maxHeight="7.5rem" t={t} />
      <button
        onClick={() => setRevealed(r => !r)}
        style={{
          marginTop: '0.375rem',
          fontSize: '0.625rem',
          fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          fontWeight: 500,
          color: colors.textTertiary,
          background: 'none',
          border: `1px solid ${colors.borderColor}`,
          borderRadius: '0.25rem',
          padding: '0.25rem 0.5rem',
          cursor: 'pointer',
        }}
      >
        {revealed ? 'Hide' : 'Reveal full token'}
      </button>
    </div>
  );
}

// ─── Hardcoded design tokens (replaces theme.tokens.*) ───
const FONT_SANS = "'DM Sans', system-ui, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace";

interface DevTabProps {
  userData: UserData;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
}

export function DevTab({ userData, mode, colors, t }: DevTabProps) {
  const c = colors;

  // Hard gate: in production this component renders nothing. Defense in depth
  // on top of the server-side filter in logic/tabs.ts that strips 'dev' from
  // LOAD_TABS when NODE_ENV !== 'development'.
  if (!isDev) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        fontFamily: FONT_SANS,
        color: c.textSecondary,
      }}>
        <ShieldAlert size={28} color={c.textTertiary} strokeWidth={1.5} style={{ marginBottom: '0.75rem' }} />
        <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          Dev tab is disabled in production builds.
        </p>
        <p style={{ fontSize: '0.75rem', color: c.textTertiary, lineHeight: 1.5 }}>
          Set <code style={{ fontFamily: 'monospace' }}>NODE_ENV=development</code> to view debug info.
        </p>
      </div>
    );
  }

  const [loadedPermissions, setLoadedPermissions] = useState<string[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Lazy-fetch the access token server-side. The server action refuses to
  // return anything in production (see debug-token.ts).
  useEffect(() => {
    let cancelled = false;
    getCurrentAccessToken().then(token => {
      if (!cancelled) setAccessToken(token);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const customData = userData.customData as Record<string, unknown> | undefined;
    const prefs = customData?.Preferences as { asOrg?: string | null } | undefined;
    const activeOrgId = prefs?.asOrg;
    if (activeOrgId && loadedPermissions.length === 0) {
      loadOrganizationPermissions(activeOrgId)
        .then(r => {
          if (!controller.signal.aborted) {
            if (!r.ok) { console.error(r.error); setLoadedPermissions([]); return; }
            setLoadedPermissions(r.data);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setLoadedPermissions([]);
          }
        });
    }
    return () => controller.abort();
  }, [userData.customData, loadedPermissions.length]);

  const enhancedUserData = {
    ...userData,
    organizationPermissions: loadedPermissions.length > 0 ? loadedPermissions : userData.organizationPermissions,
  };

  // ─── Inlined component styles (replaces cs.code.* and cs.text.*) ───

  const sectionWrapperBase: React.CSSProperties = {
    border: `1px solid ${c.borderColor}`,
    borderRadius: '0.375rem',
    overflow: 'hidden',
  };

  const sectionHeaderBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.875rem',
    borderBottom: `1px solid ${c.borderColor}`,
    fontFamily: FONT_MONO,
    fontSize: '0.625rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
  };

  const microMono: React.CSSProperties = {
    fontFamily: FONT_MONO,
    fontSize: '0.625rem',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    color: c.textSecondary,
  };

  const chipBase: React.CSSProperties = {
    padding: '0.3125rem 0.6875rem',
    fontSize: '0.6875rem',
    fontFamily: FONT_MONO,
    fontWeight: 500,
    border: '1px solid',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3125rem',
    transition: 'all 0.15s ease',
    lineHeight: 1,
  };

  const chipBlue: React.CSSProperties = {
    ...chipBase,
    background: `${c.accentBlue}1a`,
    color: c.accentBlue,
    borderColor: `${c.accentBlue}4d`,
  };

  const chipGreen: React.CSSProperties = {
    ...chipBase,
    background: `${c.accentGreen}1a`,
    color: c.accentGreen,
    borderColor: `${c.accentGreen}4d`,
  };

  function Section({
    icon, label, children, danger,
  }: {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
    danger?: boolean;
  }) {
    return (
      <div style={{
        ...sectionWrapperBase,
        borderColor: danger ? `${c.accentRed}40` : c.borderColor,
        marginBottom: '0.625rem',
      }}>
        <div style={{
          ...sectionHeaderBase,
          background: danger ? `${c.accentRed}0c` : c.bgSecondary,
          borderBottom: `1px solid ${danger ? `${c.accentRed}30` : c.borderColor}`,
        }}>
          <span style={{ color: danger ? c.accentRed : c.textTertiary, display: 'flex', alignItems: 'center' }}>
            {icon}
          </span>
          <span style={{ ...microMono, color: danger ? c.accentRed : c.textSecondary, margin: 0 }}>
            {label}
          </span>
        </div>
        <div style={{ padding: '0.875rem', background: c.bgSecondary }}>
          {children}
        </div>
      </div>
    );
  }

  // Wipe endpoints accept both GET and POST; we use POST with same-origin
  // credentials so the server's origin-guard provides CSRF protection.
  const handleWipe = async (force: boolean) => {
    const url = force ? '/api/wipe?force=true' : '/api/wipe';
    try {
      const res = await fetch(url, { method: 'POST', credentials: 'same-origin' });
      if (!res.ok) {
        console.error('[DevTab] Wipe failed:', res.status);
        return;
      }
    } catch (err) {
      console.error('[DevTab] Wipe request failed:', err);
      return;
    }
    window.location.href = '/';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>

      {/* Access Token — dev only, lazy-fetched */}
      <Section icon={<KeyRound size={12} strokeWidth={2} />} label={t.raw.tokenType}>
        {accessToken ? (
          <TruncatedToken
            token={accessToken}
            mode={mode}
            colors={c}
            t={t}
          />
        ) : (
          <p style={{ fontSize: '0.75rem', color: c.textTertiary, fontFamily: 'monospace' }}>Loading…</p>
        )}
      </Section>

      {/* Raw JSON */}
      <Section icon={<Braces size={12} strokeWidth={2} />} label={t.raw.dataTitle}>
        <CodeBlock data={enhancedUserData} mode={mode} colors={c} maxHeight="20rem" t={t} />
      </Section>

      {/* Cookie actions */}
      <Section icon={<Cookie size={12} strokeWidth={2} />} label={t.raw.cookieActions}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => handleWipe(false)} style={chipBlue}>
            <Cookie size={11} strokeWidth={2} />
            {t.raw.clearCookiesLabel}
          </button>
          <button onClick={() => handleWipe(true)} style={chipGreen}>
            <LogOut size={11} strokeWidth={2} />
            {t.raw.invalidateSession}
          </button>
        </div>
      </Section>
    </div>
  );
}
