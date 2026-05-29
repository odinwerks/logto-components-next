// =============================================================================
// Theme System — themes/index.ts (slim)
//
// Color tokens only. All other design values (typography, radii, shadows,
// transitions, component styles) are inlined directly in components.
// Dark/light switching uses CSS custom properties (--ldd-*) defined in
// default/dark.css and default/light.css.
// =============================================================================

import { readEnv } from '../logic/env';

// ─────────────────────────────────────────────────────────────────────────────
// Color tokens (the only theme data that varies by mode)
// ─────────────────────────────────────────────────────────────────────────────

export interface ThemeColors {
  bgPage: string;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  borderColor: string;
  accentGreen: string;
  accentRed: string;
  accentYellow: string;
  accentBlue: string;
  successBg: string;
  errorBg: string;
  warningBg: string;
  contrastText: string;
  fontWeight: number | string;
}

/** Dark mode color tokens (keep in sync with default/dark.css) */
export const DARK_COLORS: ThemeColors = {
  bgPage: '#050505',
  bgPrimary: '#0a0a0a',
  bgSecondary: '#111111',
  bgTertiary: '#1a1a1a',
  textPrimary: '#e5e7eb',
  textSecondary: '#9ca3af',
  textTertiary: '#6b7280',
  borderColor: '#1f2937',
  accentGreen: '#10b981',
  accentRed: '#ef4444',
  accentYellow: '#f59e0b',
  accentBlue: '#3b82f6',
  successBg: '#064e3b',
  errorBg: '#450a0a',
  warningBg: '#451a03',
  contrastText: '#fff',
  fontWeight: 400,
};

/** Light mode color tokens (keep in sync with default/light.css) */
export const LIGHT_COLORS: ThemeColors = {
  bgPage: '#f9fafb',
  bgPrimary: '#ffffff',
  bgSecondary: '#f3f4f6',
  bgTertiary: '#e5e7eb',
  textPrimary: '#111827',
  textSecondary: '#374151',
  textTertiary: '#6b7280',
  borderColor: '#d1d5db',
  accentGreen: '#059669',
  accentRed: '#dc2626',
  accentYellow: '#d97706',
  accentBlue: '#2563eb',
  successBg: '#d1fae5',
  errorBg: '#fee2e2',
  warningBg: '#fef3c7',
  contrastText: '#fff',
  fontWeight: 500,
};

// ─────────────────────────────────────────────────────────────────────────────
// ENV helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Default mode from ENV (default: 'dark') */
export function getDefaultThemeMode(): 'dark' | 'light' {
  const raw = (readEnv('DEFAULT_THEME_MODE') || 'dark').trim().toLowerCase();
  return raw === 'light' ? 'light' : 'dark';
}

// ─────────────────────────────────────────────────────────────────────────────
// Typography tokens (shared across tab components)
// ─────────────────────────────────────────────────────────────────────────────

export const FONT_SANS = "'DM Sans', system-ui, sans-serif";
export const FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace";
