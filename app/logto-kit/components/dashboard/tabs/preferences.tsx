'use client';

import { useState } from 'react';
import type { ThemeColors } from '../../../themes';
import { FONT_SANS, FONT_MONO } from '../../../themes';
import type { Translations } from '../../../locales';
import { useThemeMode, useLangMode } from '../../providers/preferences';

// ─── Hardcoded design tokens ───

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

function SunIcon({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
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
}

function MoonIcon({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini UI preview SVG (drawn entirely from tokens)
// ─────────────────────────────────────────────────────────────────────────────

function ThemeSVG({ mode, tall }: { mode: 'light' | 'dark'; tall?: boolean }) {
  const isDark = mode === 'dark';
  const bg = isDark ? '#09090c' : '#f4f4f8';
  const surf = isDark ? '#0e0e12' : '#ffffff';
  const side = isDark ? '#08080a' : '#f0f0f5';
  const bdr = isDark ? '#1e1e26' : '#e0e0ea';
  const txt = isDark ? '#e8e8f0' : '#1a1a28';
  const sub = isDark ? '#3a3a50' : '#b0b0c8';
  const acc = '#3060e0';
  const accL = isDark ? '#1e3060' : '#dae3fc';

  if (tall) {
    return (
      <svg viewBox="0 0 160 160" style={{ width: '100%', display: 'block' }}>
        <rect width="160" height="160" fill={bg} />

        {/* Top header bar */}
        <rect x="0" y="0" width="160" height="12" fill={side} />
        <rect x="0" y="12" width="160" height="0.5" fill={bdr} />
        <rect x="6" y="4" width="10" height="3" rx="0.5" fill={txt} opacity="0.7" />
        <rect x="20" y="4.5" width="28" height="2" rx="0.5" fill={txt} opacity="0.85" />
        <rect x="146" y="3" width="10" height="10" rx="0.5" fill={bdr} />

        {/* Section label */}
        <rect x="8" y="16" width="18" height="1.5" rx="0.5" fill={sub} opacity="0.5" />

        {/* Profile card */}
        <rect x="4" y="21" width="152" height="30" rx="0.5" fill={surf} stroke={bdr} strokeWidth="0.5" />
        <rect x="10" y="26" width="12" height="12" rx="1.5" fill={bdr} />
        <rect x="26" y="27" width="32" height="2.5" rx="0.5" fill={txt} opacity="0.7" />
        <rect x="26" y="33" width="44" height="2.5" rx="0.5" fill={txt} opacity="0.7" />
        <rect x="134" y="27" width="12" height="12" rx="0.5" fill={acc} opacity="0.8" />

        {/* Contact group card (email + phone) */}
        <rect x="4" y="55" width="152" height="46" rx="0.5" fill={surf} stroke={bdr} strokeWidth="0.5" />
        <rect x="10" y="62" width="8" height="8" rx="0.5" fill={bdr} />
        <rect x="22" y="61" width="26" height="2.5" rx="0.5" fill={txt} opacity="0.7" />
        <rect x="22" y="67" width="40" height="2" rx="0.5" fill={sub} opacity="0.5" />
        <rect x="134" y="61" width="14" height="10" rx="0.5" fill={bdr} />
        <rect x="10" y="78" width="140" height="0.5" fill={bdr} />
        <rect x="10" y="85" width="8" height="8" rx="0.5" fill={bdr} />
        <rect x="22" y="84" width="28" height="2.5" rx="0.5" fill={txt} opacity="0.7" />
        <rect x="22" y="90" width="36" height="2" rx="0.5" fill={sub} opacity="0.5" />

        {/* Security card */}
        <rect x="4" y="110" width="152" height="22" rx="0.5" fill={surf} stroke={bdr} strokeWidth="0.5" />
        <rect x="10" y="116" width="8" height="8" rx="0.5" fill={bdr} />
        <rect x="22" y="116" width="30" height="2.5" rx="0.5" fill={txt} opacity="0.7" />
        <rect x="22" y="122" width="50" height="2" rx="0.5" fill={sub} opacity="0.5" />

        {/* Bottom tab bar */}
        <rect x="0" y="146" width="160" height="14" fill={side} />
        <rect x="0" y="146" width="160" height="0.5" fill={bdr} />
        <rect x="9" y="151" width="14" height="4" rx="0.5" fill={acc} />
        <rect x="41" y="151" width="14" height="4" rx="0.5" fill={sub} opacity="0.3" />
        <rect x="73" y="151" width="14" height="4" rx="0.5" fill={sub} opacity="0.3" />
        <rect x="105" y="151" width="14" height="4" rx="0.5" fill={sub} opacity="0.3" />
        <rect x="137" y="151" width="14" height="4" rx="0.5" fill={sub} opacity="0.3" />
      </svg>
    );
  }

  const tabYs = [16, 22, 28, 34, 40];

  return (
    <svg viewBox="0 0 160 100" style={{ width: '100%', display: 'block' }}>
      <rect width="160" height="100" fill={bg} />
      <rect width="28" height="100" fill={side} />
      <rect x="4" y="6" width="20" height="5" rx="1" fill={bdr} />
      {tabYs.map((y, i) => (
        <g key={i}>
          <rect x={i === 0 ? 0 : 2} y={y} width={i === 0 ? 3 : 0} height="4.5" fill={i === 0 ? acc : 'transparent'} />
          <rect x="6" y={y + 0.5} width="4" height="3.5" rx="0.5" fill={i === 0 ? accL : bdr} />
          <rect x="12" y={y + 1} width={[12, 10, 13, 9, 11][i]} height="2" rx="0.5" fill={i === 0 ? acc : sub} />
        </g>
      ))}
      <rect x="6" y="88" width="4" height="3.5" rx="0.5" fill={sub} opacity="0.5" />
      <rect x="12" y="88.8" width="10" height="2" rx="0.5" fill={sub} opacity="0.3" />
      <rect x="28" width="132" height="100" fill={surf} />
      <rect x="36" y="10" width="38" height="5" rx="1" fill={txt} opacity="0.85" />
      <rect x="36" y="17" width="60" height="2.5" rx="0.8" fill={sub} opacity="0.6" />
      <rect x="36" y="28" width="22" height="2" rx="0.5" fill={sub} opacity="0.4" />
      <rect x="36" y="33" width="116" height="22" fill={isDark ? '#131318' : '#f8f8fc'} stroke={bdr} strokeWidth="0.5" />
      <rect x="40" y="37" width="12" height="12" rx="0.5" fill={bdr} />
      <rect x="56" y="38" width="30" height="2.5" rx="0.5" fill={txt} opacity="0.7" />
      <rect x="56" y="43" width="45" height="2" rx="0.5" fill={sub} opacity="0.5" />
      <rect x="130" y="40" width="16" height="7" rx="0.5" fill={acc} opacity="0.8" />
      <rect x="36" y="59" width="116" height="22" fill={isDark ? '#131318' : '#f8f8fc'} stroke={bdr} strokeWidth="0.5" />
      <rect x="40" y="63" width="12" height="12" rx="0.5" fill={bdr} />
      <rect x="56" y="64" width="24" height="2.5" rx="0.5" fill={txt} opacity="0.7" />
      <rect x="56" y="69" width="38" height="2" rx="0.5" fill={sub} opacity="0.5" />
      <rect x="88" y="86" width="26" height="8" rx="0.5" fill={bdr} />
      <rect x="118" y="86" width="30" height="8" rx="0.5" fill={acc} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PreferencesTab
// ─────────────────────────────────────────────────────────────────────────────

interface PreferencesTabProps {
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  supportedLangs?: string[];
  mobmode?: number;
}

export function PreferencesTab({ mode, colors, t, supportedLangs, mobmode }: PreferencesTabProps) {
  const isMobile = mobmode === 1;
  const { mode: activeMode, setMode: setTheme } = useThemeMode();
  const { lang, setLang } = useLangMode();

  const c = colors;

  // ─── Inlined component styles (replaces cs.*) ───
  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: FONT_SANS,
    fontWeight: 500,
    fontSize: '0.6875rem',
    color: c.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: '0.75rem',
  };

  const wellStyle: React.CSSProperties = {
    background: c.bgSecondary,
    border: `1px solid ${c.borderColor}`,
    padding: '1rem 1.25rem',
    marginBottom: '1rem',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5625rem 0.75rem',
    background: c.bgPrimary,
    border: `1px solid ${c.borderColor}`,
    color: c.textPrimary,
    fontSize: '0.8125rem',
    fontFamily: FONT_SANS,
    outline: 'none',
    boxSizing: 'border-box',
    borderRadius: '0.25rem',
    transition: 'border-color 0.15s ease, background 0.15s ease',
    appearance: 'none',
    cursor: 'pointer',
  };

  const options = [
    { id: 'light', label: t.common.lightTheme, Icon: SunIcon },
    { id: 'dark', label: t.common.darkTheme, Icon: MoonIcon },
  ] as const;

  return (
    <div>
      <p style={sectionLabelStyle}>{t.common.appearance}</p>

      <div style={wellStyle}>
        {/* Theme picker */}
        <div
          role="radiogroup"
          aria-label={t.common.appearance}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem', marginBottom: '1.625rem' }}
        >
          {options.map(opt => {
            const isSelected = activeMode === opt.id;
            return (
              <ThemeOption
                key={opt.id}
                id={opt.id}
                label={opt.label}
                Icon={opt.Icon}
                isSelected={isSelected}
                mode={mode}
                colors={c}
                onSelect={() => setTheme(opt.id)}
                tall={isMobile}
              />
            );
          })}
        </div>

        {/* Language selector */}
        {supportedLangs && supportedLangs.length > 0 && (
          <>
            <p style={{ ...sectionLabelStyle, marginBottom: '0.5rem' }}>{t.common.language}</p>
            <div style={{
              background: c.bgSecondary,
              border: `1px solid ${c.borderColor}`,
              padding: '0.875rem 1rem',
              borderRadius: '0.25rem',
            }}>
              <div style={{ position: 'relative' }}>
                <select
                  value={lang}
                  onChange={e => setLang(e.target.value)}
                  style={selectStyle}
                >
                  {supportedLangs.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <span style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: c.textTertiary,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ThemeOption - extracted to avoid hooks-in-loop
// ─────────────────────────────────────────────────────────────────────────────

function ThemeOption({
  id, label, Icon, isSelected, mode: _mode, colors, onSelect, tall,
}: {
  id: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  isSelected: boolean;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  onSelect: () => void;
  tall?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const c = colors;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        cursor: 'pointer',
        background: isSelected ? c.bgSecondary : c.bgTertiary,
        border: `1px solid ${isSelected ? c.textTertiary : c.borderColor}`,
        transition: `border-color 0.15s ease`,
        overflow: 'hidden',
        opacity: hovered && !isSelected ? 0.85 : 1,
      }}
    >
      <div style={{ width: '100%', borderBottom: `1px solid ${c.borderColor}`, overflow: 'hidden' }}>
        <ThemeSVG mode={id as 'light' | 'dark'} tall={tall} />
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5625rem 0.75rem',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4375rem' }}>
          <Icon size={12} color={isSelected ? c.textPrimary : c.textTertiary} />
          <span style={{
            fontFamily: FONT_MONO,
            fontWeight: 500,
            fontSize: '0.75rem',
            color: isSelected ? c.textPrimary : c.textSecondary,
          }}>
            {label}
          </span>
        </div>
      </div>
    </button>
  );
}
