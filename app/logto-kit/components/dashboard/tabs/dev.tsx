'use client';

import { KeyRound, Braces, Cookie, LogOut } from 'lucide-react';
import type { UserData } from '../../../logic/types';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';
import { CodeBlock } from '../shared/CodeBlock';

interface DevTabProps {
  userData:    UserData;
  theme:       ThemeSpec;
  t:           Translations;
  accessToken: string;
}

export function DevTab({ userData, theme, t, accessToken }: DevTabProps) {
  const cs = theme.components;
  const c  = theme.colors;
  const ty = theme.tokens.typography;

  // ── Section wrapper (card with icon+label header) ───────────────────────
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

  const handleClearCookies       = () => { window.location.href = '/api/wipe'; };
  const handleInvalidateSession  = () => { window.location.href = '/api/wipe?force=true'; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>

      {/* Access Token */}
      <Section icon={<KeyRound size={12} strokeWidth={2} />} label={t.raw.tokenType}>
        <CodeBlock data={accessToken} theme={theme} maxHeight="7.5rem" t={t} />
      </Section>

      {/* Raw JSON */}
      <Section icon={<Braces size={12} strokeWidth={2} />} label={t.raw.dataTitle}>
        <CodeBlock data={userData} theme={theme} maxHeight="20rem" t={t} />
      </Section>

      {/* Cookie actions */}
      <Section icon={<Cookie size={12} strokeWidth={2} />} label={t.raw.cookieActions}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={handleClearCookies} style={cs.buttons.chipBlue}>
            <Cookie size={11} strokeWidth={2} />
            {t.raw.clearCookiesLabel}
          </button>
          <button onClick={handleInvalidateSession} style={cs.buttons.chipGreen}>
            <LogOut size={11} strokeWidth={2} />
            {t.raw.invalidateSession}
          </button>
        </div>
      </Section>
    </div>
  );
}
