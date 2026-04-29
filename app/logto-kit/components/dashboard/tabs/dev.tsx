'use client';

import { useState, useEffect } from 'react';
import { KeyRound, Braces, Cookie, LogOut, ShieldAlert } from 'lucide-react';
import type { UserData } from '../../../logic/types';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';
import { CodeBlock } from '../shared/CodeBlock';
import { loadOrganizationPermissions } from '../../../actions/load-org-permissions';
import { getCurrentAccessToken } from '../../../logic/actions/debug-token';
import { isDev } from '../../../logic/dev-mode';

interface DevTabProps {
  userData: UserData;
  theme:    ThemeSpec;
  t:        Translations;
}

export function DevTab({ userData, theme, t }: DevTabProps) {
  const cs = theme.components;
  const c  = theme.colors;

  // Hard gate: in production this component renders nothing. Defense in depth
  // on top of the server-side filter in logic/tabs.ts that strips 'dev' from
  // LOAD_TABS when NODE_ENV !== 'development'.
  if (!isDev) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        fontFamily: "'DM Sans', system-ui, sans-serif",
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
        .then(permissions => {
          if (!controller.signal.aborted) {
            setLoadedPermissions(permissions);
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

  function Section({
    icon, label, children, danger,
  }: {
    icon:     React.ReactNode;
    label:    string;
    children: React.ReactNode;
    danger?:  boolean;
  }) {
    return (
      <div style={{
        ...cs.code.sectionWrapper,
        borderColor: danger ? `${c.accentRed}40` : c.borderColor,
        marginBottom:'0.625rem',
      }}>
        <div style={{
          ...cs.code.sectionHeader,
          background:   danger ? `${c.accentRed}0c` : c.bgSecondary,
          borderBottom: `1px solid ${danger ? `${c.accentRed}30` : c.borderColor}`,
        }}>
          <span style={{ color: danger ? c.accentRed : c.textTertiary, display: 'flex', alignItems: 'center' }}>
            {icon}
          </span>
          <span style={{ ...cs.text.microMono, color: danger ? c.accentRed : c.textSecondary, margin: 0 }}>
            {label}
          </span>
        </div>
        <div style={{ padding: '0.875rem', background: c.bgSecondary }}>
          {children}
        </div>
      </div>
    );
  }

  // Wipe endpoints are POST-only now (Phase 3); submit via a hidden form
  // with same-origin credentials so the server's origin-guard passes.
  const handleWipe = async (force: boolean) => {
    const url = force ? '/api/wipe?force=true' : '/api/wipe';
    await fetch(url, { method: 'POST', credentials: 'same-origin' });
    window.location.href = '/';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>

      {/* Access Token — dev only, lazy-fetched */}
      <Section icon={<KeyRound size={12} strokeWidth={2} />} label={t.raw.tokenType}>
        {accessToken
          ? <CodeBlock data={accessToken} theme={theme} maxHeight="7.5rem" t={t} />
          : <p style={{ fontSize: '0.75rem', color: c.textTertiary, fontFamily: 'monospace' }}>Loading…</p>
        }
      </Section>

      {/* Raw JSON */}
      <Section icon={<Braces size={12} strokeWidth={2} />} label={t.raw.dataTitle}>
        <CodeBlock data={enhancedUserData} theme={theme} maxHeight="20rem" t={t} />
      </Section>

      {/* Cookie actions */}
      <Section icon={<Cookie size={12} strokeWidth={2} />} label={t.raw.cookieActions}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => handleWipe(false)} style={cs.buttons.chipBlue}>
            <Cookie size={11} strokeWidth={2} />
            {t.raw.clearCookiesLabel}
          </button>
          <button onClick={() => handleWipe(true)} style={cs.buttons.chipGreen}>
            <LogOut size={11} strokeWidth={2} />
            {t.raw.invalidateSession}
          </button>
        </div>
      </Section>
    </div>
  );
}
