'use client';

import { useState } from 'react';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';

interface PreferencesTabProps {
  theme: 'dark' | 'light';
  lang: string;
  supportedLangs: string[];
  themeColors: ThemeColors;
  t: Translations;
  onThemeChange: (theme: 'dark' | 'light') => void;
  onLangChange: (lang: string) => void;
}

const SunIcon = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="square">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="square">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const MonitorIcon = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="square">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const CheckIcon = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function PageHeader({ title, description, themeColors }: { title: string; description: string; themeColors: ThemeColors }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <h2
        style={{
          fontFamily: 'var(--font-ibm-plex-mono)',
          fontWeight: 600,
          fontSize: 18,
          color: themeColors.textPrimary,
          marginBottom: 4,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-ibm-plex-mono)',
          fontSize: 13,
          color: themeColors.textSecondary,
          lineHeight: 1.55,
        }}
      >
        {description}
      </p>
    </div>
  );
}

function SectionLabel({ children, themeColors }: { children: React.ReactNode; themeColors: ThemeColors }) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-ibm-plex-mono)',
        fontWeight: 600,
        fontSize: 10.5,
        color: themeColors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: '0.09em',
        marginBottom: 12,
      }}
    >
      {children}
    </p>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PreferencesTab({
  theme,
  lang,
  supportedLangs,
  themeColors,
  t,
  onThemeChange,
  onLangChange,
}: PreferencesTabProps) {
  return (
    <div style={{ animation: 'fadeUp 0.2s ease' }}>
      <PageHeader
        title="Preferences"
        description="Appearance and language settings."
        themeColors={themeColors}
      />

      <SectionLabel themeColors={themeColors}>Appearance</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 26 }}>
        {[
          { id: 'light', label: 'Light', Icon: SunIcon },
          { id: 'dark', label: 'Dark', Icon: MoonIcon },
          { id: 'system', label: 'System', Icon: MonitorIcon },
        ].map((opt) => {
          const isSelected = (opt.id === 'system' ? theme : opt.id) === theme;
          return (
            <button
              key={opt.id}
              onClick={() => onThemeChange(opt.id === 'system' ? theme : opt.id as 'dark' | 'light')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                cursor: 'pointer',
                background: isSelected ? themeColors.bgTertiary : themeColors.bgSecondary,
                border: `1px solid ${isSelected ? themeColors.borderColor : themeColors.borderColor}`,
                transition: 'background 0.15s, border-color 0.15s',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '9px 12px',
                  borderBottom: `1px solid ${themeColors.borderColor}`,
                }}
              >
                <opt.Icon size={12} color={isSelected ? themeColors.accentBlue : themeColors.textTertiary} />
                <span
                  style={{
                    fontFamily: 'var(--font-ibm-plex-mono)',
                    fontWeight: 500,
                    fontSize: 12,
                    color: isSelected ? themeColors.textPrimary : themeColors.textSecondary,
                    marginLeft: 7,
                  }}
                >
                  {opt.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <SectionLabel themeColors={themeColors}>Language</SectionLabel>
      <Card style={{ padding: '14px 16px' }}>
        <div style={{ position: 'relative' }}>
          <select
            value={lang}
            onChange={(e) => onLangChange(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 36px 9px 12px',
              background: themeColors.bgPage,
              border: `1px solid ${themeColors.borderColor}`,
              color: themeColors.textPrimary,
              fontFamily: 'var(--font-ibm-plex-mono)',
              fontSize: 13,
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
            }}
          >
            {supportedLangs.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <span
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%) rotate(90deg)',
              color: themeColors.textTertiary,
              pointerEvents: 'none',
              fontSize: 10,
            }}
          >
            ▶
          </span>
        </div>
      </Card>
    </div>
  );
}
