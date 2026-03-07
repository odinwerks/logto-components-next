'use client';

import { KeyRound, Braces, Cookie, LogOut } from 'lucide-react';
import type { UserData } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import { CodeBlock } from '../shared/CodeBlock';

interface DevTabProps {
  userData: UserData;
  themeColors: ThemeColors;
  t: Translations;
  accessToken: string;
}

interface SectionProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  themeColors: ThemeColors;
  danger?: boolean;
}

function Section({ icon, label, children, themeColors, danger }: SectionProps) {
  return (
    <div
      style={{
        overflow: 'hidden',
        border: `1px solid ${danger ? themeColors.accentRed + '40' : themeColors.borderColor}`,
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '9px 14px',
          background: danger
            ? themeColors.accentRed + '0c'
            : themeColors.bgSecondary,
          borderBottom: `1px solid ${danger ? themeColors.accentRed + '30' : themeColors.borderColor}`,
        }}
      >
        <span
          style={{
            color: danger ? themeColors.accentRed : themeColors.textTertiary,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {icon}
        </span>
        <span
          style={{
            color: danger ? themeColors.accentRed : themeColors.textSecondary,
            fontSize: '10px',
            fontFamily: 'var(--font-ibm-plex-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontWeight: 600,
          }}
        >
          {label}
        </span>
      </div>

      {/* Section body */}
      <div
        style={{
          padding: '14px',
          background: themeColors.bgSecondary,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function DevTab({ userData, themeColors, t, accessToken }: DevTabProps) {
  const handleClearCookies = () => {
    window.location.href = '/api/wipe';
  };

  const handleInvalidateSession = () => {
    window.location.href = '/api/wipe?force=true';
  };

  const actionButtonBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 13px',
    cursor: 'pointer',
    fontSize: '11px',
    fontFamily: 'var(--font-ibm-plex-mono)',
    fontWeight: 500,
    border: `1px solid ${themeColors.borderColor}`,
    background: themeColors.bgTertiary,
    color: themeColors.textPrimary,
    transition: 'opacity 0.15s ease',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>

      {/* Access Token */}
      <Section
        icon={<KeyRound size={12} strokeWidth={2} />}
        label={t.raw.tokenType}
        themeColors={themeColors}
      >
        <CodeBlock
          data={accessToken}
          themeColors={themeColors}
          maxHeight="120px"
          t={t}

        />
      </Section>

      {/* Raw JSON */}
      <Section
        icon={<Braces size={12} strokeWidth={2} />}
        label={t.raw.dataTitle}
        themeColors={themeColors}
      >
        <CodeBlock
          data={userData}
          themeColors={themeColors}
          maxHeight="320px"
          t={t}
        />
      </Section>

      {/* Cookie Actions */}
      <Section
        icon={<Cookie size={12} strokeWidth={2} />}
        label={t.raw.cookieActions}
        themeColors={themeColors}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleClearCookies}
            style={{
              ...actionButtonBase,
              background: themeColors.accentBlue + '15',
              borderColor: themeColors.accentBlue + '40',
              color: themeColors.accentBlue,
            }}
          >
            <Cookie size={11} strokeWidth={2} />
            {t.raw.clearCookiesLabel}
          </button>
          <button
            onClick={handleInvalidateSession}
            style={{
              ...actionButtonBase,
              background: themeColors.accentGreen + '15',
              borderColor: themeColors.accentGreen + '40',
              color: themeColors.accentGreen,
            }}
          >
            <LogOut size={11} strokeWidth={2} />
            {t.raw.invalidateSession}
          </button>
        </div>
      </Section>

    </div>
  );
}