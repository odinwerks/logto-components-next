// ============================================================================
// Theme System
// Selects the active theme folder from ENV and exports ThemeColors objects.
//
// ENV:
//   THEME (or NEXT_PUBLIC_THEME) = folder name under ./themes/  (default: 'default')
//   DEFAULT_THEME_MODE (or NEXT_PUBLIC_DEFAULT_THEME_MODE) = 'dark' | 'light'
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// ThemeColors interface
// ─────────────────────────────────────────────────────────────────────────────

export interface ThemeColors {
  // Backgrounds
  bgPage: string;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;

  // Borders
  borderColor: string;

  // Accents
  accentGreen: string;
  accentRed: string;
  accentYellow: string;
  accentBlue: string;

  // Status backgrounds (for toasts etc.)
  successBg: string;
  errorBg: string;
  warningBg: string;

  // Misc
  fontWeight: number | string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENV helpers
// ─────────────────────────────────────────────────────────────────────────────

function readEnv(name: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env[name] ||
      process.env[`NEXT_PUBLIC_${name}`] ||
      undefined
    );
  }
  return undefined;
}

/**
 * Returns the active theme folder name from ENV.
 * Defaults to 'default'.
 */
export function getThemeName(): string {
  return (readEnv('THEME') || 'default').trim();
}

/**
 * Returns the default theme mode ('dark' or 'light').
 * Source: DEFAULT_THEME_MODE or NEXT_PUBLIC_DEFAULT_THEME_MODE
 * Falls back to 'dark'.
 */
export function getDefaultThemeMode(): 'dark' | 'light' {
  const raw = (readEnv('DEFAULT_THEME_MODE') || 'dark').trim().toLowerCase();
  return raw === 'light' ? 'light' : 'dark';
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme definitions
// Add new theme objects here when creating new theme folders.
// ─────────────────────────────────────────────────────────────────────────────

// ── DEFAULT DARK ────────────────────────────────────────────────────────────
const defaultDarkColors: ThemeColors = {
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

  fontWeight: 400,
};

// ── DEFAULT LIGHT ────────────────────────────────────────────────────────────
const defaultLightColors: ThemeColors = {
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

  fontWeight: 500,
};

// ─────────────────────────────────────────────────────────────────────────────
// Theme selection
// ─────────────────────────────────────────────────────────────────────────────

function resolveThemeColors(
  themeName: string
): { dark: ThemeColors; light: ThemeColors } {
  switch (themeName) {
    // Add new themes here:
    // case 'midnight':
    //   return { dark: midnightDarkColors, light: midnightLightColors };
    case 'default':
    default:
      return { dark: defaultDarkColors, light: defaultLightColors };
  }
}

const { dark: darkColors, light: lightColors } = resolveThemeColors(getThemeName());

export { darkColors, lightColors };
