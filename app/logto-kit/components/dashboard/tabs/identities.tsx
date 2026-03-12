'use client';

import { Check } from 'lucide-react';
import type { UserData } from '../../../logic/types';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';
import { alpha, adj } from '../../handlers/theme-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Provider icon map (inline SVGs — no network, no external dep)
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDER_ICONS: Record<string, (textColor: string) => React.ReactNode> = {
  google: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  ),
  github: (c) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={c}>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  ),
  discord: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#5865F2">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  ),
  facebook: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  twitter: (c) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={c}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  apple: (c) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={c}>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
    </svg>
  ),
  microsoft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="1"  y="1"  width="10" height="10" fill="#F25022"/>
      <rect x="13" y="1"  width="10" height="10" fill="#7FBA00"/>
      <rect x="1"  y="13" width="10" height="10" fill="#00A4EF"/>
      <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
    </svg>
  ),
  linkedin: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
};

const PROVIDER_NAMES: Record<string, string> = {
  google: 'Google', github: 'GitHub', discord: 'Discord',
  facebook: 'Facebook', twitter: 'Twitter / X', apple: 'Apple',
  microsoft: 'Microsoft', linkedin: 'LinkedIn',
};

function providerName(target: string): string {
  return PROVIDER_NAMES[target] ?? target.charAt(0).toUpperCase() + target.slice(1);
}

function identityDetail(t: Translations, identity: {
  userId?: string;
  details?: Record<string, unknown>;
}): string {
  const d = identity.details ?? {};
  if (typeof d.email    === 'string' && d.email)    return d.email;
  if (typeof d.username === 'string' && d.username) return d.username;
  if (typeof d.name     === 'string' && d.name)     return d.name;
  if (typeof d.login    === 'string' && d.login)    return d.login;
  if (identity.userId) return t.identities.idWithUserId.replace('{userId}', identity.userId);
  return t.identities.unknownDetail;
}

function ProviderIcon({ target, textColor }: { target: string; textColor: string }) {
  const icon = PROVIDER_ICONS[target];
  if (icon) return (
    <div style={{ width: '1.375rem', height: '1.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon(textColor)}
    </div>
  );
  return (
    <div style={{ width: '1.375rem', height: '1.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.625rem' }}>
      {target.charAt(0).toUpperCase()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IdentitiesTab
// ─────────────────────────────────────────────────────────────────────────────

interface IdentitiesTabProps {
  userData:    UserData;
  theme:       ThemeSpec;
  t:           Translations;
}

export function IdentitiesTab({ userData, theme, t }: IdentitiesTabProps) {
  const cs = theme.components;
  const c  = theme.colors;
  const ty = theme.tokens.typography;

  const identityEntries = Object.entries(
    (userData.identities as Record<string, { userId?: string; details?: Record<string, unknown> }> | undefined) ?? {}
  );

  return (
    <div>
      <p style={cs.text.description}>{t.identities.description}</p>

      <p style={cs.text.sectionLabel}>{t.identities.linkedAccounts}</p>

      <div style={cs.surfaces.card}>
        {identityEntries.length === 0 ? (
          <div style={cs.surfaces.emptyState}>
            <p style={cs.text.mutedMono}>{t.identities.noIdentities}</p>
          </div>
        ) : identityEntries.map(([target, identity], i) => {
          const detail = identityDetail(t, identity);
          const name   = providerName(target);
          const isLast = i === identityEntries.length - 1;

          return (
            <div key={target}>
              <div style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                padding:        '0.875rem 1.25rem',
                gap:            '1rem',
              }}>
                {/* Left — icon + name + detail */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  <div style={{
                    width:          '2.25rem',
                    height:         '2.25rem',
                    flexShrink:     0,
                    background:     alpha(c.accentGreen, 0.1),
                    border:         `1px solid ${adj(c.accentGreen, -40)}44`,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                  }}>
                    <ProviderIcon target={target} textColor={c.textPrimary} />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.1875rem' }}>
                      <p style={{ ...cs.text.body, fontWeight: ty.weight.medium, margin: 0 }}>{name}</p>
                      <span style={cs.badges.success}>
                        <Check size={9} strokeWidth={2} />
                        {t.identities.connected}
                      </span>
                    </div>
                    <p style={{ ...cs.text.mutedMono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {detail}
                    </p>
                  </div>
                </div>

                {/* Right — external user ID chip */}
                {identity.userId && (
                  <div style={cs.surfaces.chip}>{identity.userId}</div>
                )}
              </div>

              {!isLast && <div style={cs.divider} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
