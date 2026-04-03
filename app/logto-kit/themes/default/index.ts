// =============================================================================
// Default Theme — themes/default/index.ts
//
// This file is the canonical source of ALL visual properties for the default
// theme variant. Dark and light CSS variables in dark.css / light.css should
// stay in sync with the JS tokens defined here (the JS values drive inline
// React styles; the CSS vars drive global pseudo-class / scrollbar / selection
// rules that can't be expressed inline).
//
// Structure
//  ├── Utility helpers  (alpha, adj, …)
//  ├── Color tokens     (dark / light ThemeColors)
//  ├── Shared tokens    (typography, radii, shadows, transitions)
//  └── buildDefaultTheme(mode)  →  ThemeSpec
// =============================================================================

import type {
  ThemeSpec, ThemeColors, ThemeTokens, ComponentStyles,
  ThemeTypography, ThemeRadii, ThemeShadows, ThemeTransitions,
  InteractiveStyle,
} from '../index';

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Append a 2-char hex alpha to a 6-char hex color.  alpha('#3b82f6', 0.15) → '#3b82f626' */
export function alpha(hex: string, opacity: number): string {
  const a = Math.round(Math.min(1, Math.max(0, opacity)) * 255)
    .toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

/**
 * Adjust the perceived lightness of a hex color by shifting each RGB channel.
 * Positive delta brightens; negative darkens.
 * adj('#ef4444', -30) → a darker red suitable for borders / shadows.
 */
export function adj(hex: string, delta: number): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return hex;
  const clamp = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
  const r = clamp(parseInt(c.slice(0, 2), 16) + delta);
  const g = clamp(parseInt(c.slice(2, 4), 16) + delta);
  const b = clamp(parseInt(c.slice(4, 6), 16) + delta);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Color tokens  (keep in sync with dark.css / light.css)
// ─────────────────────────────────────────────────────────────────────────────

const DARK: ThemeColors = {
  bgPage:      '#050505',
  bgPrimary:   '#0a0a0a',
  bgSecondary: '#111111',
  bgTertiary:  '#1a1a1a',

  textPrimary:   '#e5e7eb',
  textSecondary: '#9ca3af',
  textTertiary:  '#6b7280',

  borderColor: '#1f2937',

  accentGreen:  '#10b981',
  accentRed:    '#ef4444',
  accentYellow: '#f59e0b',
  accentBlue:   '#3b82f6',

  successBg: '#064e3b',
  errorBg:   '#450a0a',
  warningBg: '#451a03',

  contrastText: '#fff',
  fontWeight: 400,
};

const LIGHT: ThemeColors = {
  bgPage:      '#f9fafb',
  bgPrimary:   '#ffffff',
  bgSecondary: '#f3f4f6',
  bgTertiary:  '#e5e7eb',

  textPrimary:   '#111827',
  textSecondary: '#374151',
  textTertiary:  '#6b7280',

  borderColor: '#d1d5db',

  accentGreen:  '#059669',
  accentRed:    '#dc2626',
  accentYellow: '#d97706',
  accentBlue:   '#2563eb',

  successBg: '#d1fae5',
  errorBg:   '#fee2e2',
  warningBg: '#fef3c7',

  contrastText: '#fff',
  fontWeight: 500,
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared tokens (mode-independent)
// ─────────────────────────────────────────────────────────────────────────────

const TYPOGRAPHY: ThemeTypography = {
  fontMono: "'IBM Plex Mono', 'Courier New', monospace",
  fontSans: "'DM Sans', system-ui, sans-serif",
  size: {
    micro: '0.5625rem',
    xs:    '0.625rem',
    sm:    '0.6875rem',
    base:  '0.75rem',
    md:    '0.8125rem',
    lg:    '0.875rem',
    xl:    '0.9375rem',
  },
  weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
  leading: { tight: 1.2, normal: 1.5, relaxed: 1.65 },
};

const RADII: ThemeRadii = {
  none: '0',
  xs:   '0.1875rem',
  sm:   '0.25rem',
  md:   '0.375rem',
  lg:   '0.5rem',
  full: '9999px',
};

const TRANSITIONS: ThemeTransitions = {
  fast:   '0.1s ease',
  normal: '0.15s ease',
  slow:   '0.25s ease',
};

// ─────────────────────────────────────────────────────────────────────────────
// Theme factory
// ─────────────────────────────────────────────────────────────────────────────

function buildDefaultTheme(mode: 'dark' | 'light'): ThemeSpec {
  const c  = mode === 'dark' ? DARK : LIGHT;
  const ty = TYPOGRAPHY;
  const r  = RADII;
  const tr = TRANSITIONS;
  const isDark = mode === 'dark';

  const shadows: ThemeShadows = {
    none:    'none',
    card:    isDark ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 3px rgba(0,0,0,0.1)',
    popover: isDark ? '0 4px 16px rgba(0,0,0,0.6)' : '0 4px 12px rgba(0,0,0,0.15)',
    modal:   isDark
      ? '0 2rem 5.625rem rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)'
      : '0 2rem 5.625rem rgba(0,0,0,0.2)',
  };

  const tokens: ThemeTokens = {
    typography:  ty,
    radii:       r,
    shadows,
    transitions: tr,
    dashboardRadius: '0',
  };

  // Alias shortcuts — used only within this factory
  const MONO = ty.fontMono;
  const SANS = ty.fontSans;

  // ── Button shared base ────────────────────────────────────────────────────
  const btnBase: React.CSSProperties = {
    padding:        '0.5rem 0.9375rem',
    fontSize:       ty.size.md,
    fontFamily:     SANS,
    fontWeight:     ty.weight.medium,
    border:         `1px solid ${c.borderColor}`,
    cursor:         'pointer',
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '0.375rem',
    borderRadius:   r.sm,
    transition:     `all ${tr.normal}`,
    lineHeight:     1,
    flexShrink:     0,
  };

  const btnSm: Partial<React.CSSProperties> = {
    padding:   '0.3125rem 0.8125rem',
    fontSize:  ty.size.sm,
    gap:       '0.3125rem',
  };

  // ── Component styles ──────────────────────────────────────────────────────

  const text: ComponentStyles['text'] = {
    heading: {
      fontFamily:  SANS,
      fontWeight:  ty.weight.semibold,
      fontSize:    ty.size.md,
      color:       c.textPrimary,
      lineHeight:  ty.leading.tight,
      letterSpacing: '-0.02em',
    },
    sectionLabel: {
      fontFamily:    SANS,
      fontWeight:    ty.weight.medium,
      fontSize:      ty.size.sm,
      color:         c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      marginBottom:  '0.75rem',
    },
    fieldLabel: {
      display:       'block',
      fontFamily:    MONO,
      fontWeight:    ty.weight.medium,
      fontSize:      ty.size.xs,
      color:         c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      marginBottom:  '0.4375rem',
    },
    body: {
      fontFamily: SANS,
      fontSize:   ty.size.md,
      color:      c.textSecondary,
      lineHeight: ty.leading.normal,
    },
    bodyMono: {
      fontFamily: MONO,
      fontSize:   ty.size.sm,
      color:      c.textSecondary,
      lineHeight: ty.leading.normal,
    },
    muted: {
      fontFamily: SANS,
      fontSize:   ty.size.sm,
      color:      c.textTertiary,
      lineHeight: ty.leading.normal,
    },
    mutedMono: {
      fontFamily: MONO,
      fontSize:   ty.size.xs,
      color:      c.textTertiary,
    },
    micro: {
      fontFamily: SANS,
      fontSize:   ty.size.micro,
      color:      c.textTertiary,
    },
    microMono: {
      fontFamily:    MONO,
      fontWeight:    ty.weight.semibold,
      fontSize:      ty.size.xs,
      color:         c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    },
    link: {
      color:          c.accentBlue,
      textDecoration: 'underline',
      cursor:         'pointer',
    },
    error: {
      fontFamily:  SANS,
      fontSize:    ty.size.base,
      color:       c.accentRed,
      lineHeight:  ty.leading.normal,
    },
    description: {
      fontFamily:  SANS,
      fontSize:    ty.size.base,
      color:       c.textSecondary,
      lineHeight:  ty.leading.relaxed,
      marginBottom:'1.625rem',
    },
  };

  const surfaces: ComponentStyles['surfaces'] = {
    page: {
      minHeight:  '100vh',
      background: c.bgPage,
      color:      c.textPrimary,
      fontFamily: SANS,
    },
    modal: {
      background:  c.bgSecondary,
      border:      `1px solid ${c.borderColor}`,
      boxShadow:   shadows.modal,
      overflow:    'hidden',
    },
    card: {
      background:  c.bgSecondary,
      border:      `1px solid ${c.borderColor}`,
      overflow:    'hidden',
      boxShadow:   shadows.card,
      marginBottom:'1rem',
    },
    cardHeader: {
      display:       'flex',
      alignItems:    'center',
      gap:           '0.4375rem',
      padding:       '0.5625rem 0.875rem',
      background:    c.bgSecondary,
      borderBottom:  `1px solid ${c.borderColor}`,
    },
    cardHeaderDanger: {
      display:       'flex',
      alignItems:    'center',
      gap:           '0.4375rem',
      padding:       '0.5625rem 0.875rem',
      background:    alpha(c.accentRed, 0.05),
      borderBottom:  `1px solid ${alpha(c.accentRed, 0.19)}`,
    },
    well: {
      background:   c.bgSecondary,
      border:       `1px solid ${c.borderColor}`,
      padding:      '1rem 1.125rem',
      borderRadius: r.md,
      marginBottom: '1.25rem',
    },
    infoRow: {
      padding:      '0.625rem 0.75rem',
      background:   c.bgPrimary,
      border:       `1px solid ${c.borderColor}`,
      borderRadius: r.sm,
    },
    chip: {
      display:       'inline-flex',
      alignItems:    'center',
      padding:       '0.25rem 0.625rem',
      background:    c.bgTertiary,
      border:        `1px solid ${c.borderColor}`,
      borderRadius:  r.xs,
      fontFamily:    MONO,
      fontSize:      ty.size.xs,
      color:         c.textTertiary,
      letterSpacing: '0.03em',
      maxWidth:      '10rem',
      overflow:      'hidden',
      textOverflow:  'ellipsis',
      whiteSpace:    'nowrap',
    },
    dropZone: {
      border:      `1px dashed ${c.borderColor}`,
      padding:     '0.8125rem 1rem',
      display:     'flex',
      alignItems:  'center',
      gap:         '0.75rem',
      background:  'transparent',
      cursor:      'pointer',
      position:    'relative',
    },
    dropZoneActive: {
      borderColor: c.accentBlue,
      background:  c.bgTertiary,
    },
    emptyState: {
      padding:    '1.75rem 1.25rem',
      textAlign:  'center',
      fontFamily: MONO,
      fontSize:   ty.size.sm,
      color:      c.textTertiary,
    },
    overlay: {
      position:       'fixed',
      inset:          '0',
      zIndex:         9000,
      background:     'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(0.375rem) saturate(0.6)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        '1.25rem',
    },
    codeInfoBox: {
      padding:    '0.625rem 0.875rem',
      background: c.bgPrimary,
      border:     `1px solid ${c.borderColor}`,
      marginBottom:'1rem',
    },
  };

  const divider: ComponentStyles['divider'] = {
    height:     '1px',
    background: alpha(c.borderColor, 0.8),
    border:     'none',
    margin:     '0',
    flexShrink: 0,
  };

  const inputs: ComponentStyles['inputs'] = {
    text: {
      width:          '100%',
      padding:        '0.5625rem 0.75rem',
      background:     c.bgPrimary,
      border:         `1px solid ${c.borderColor}`,
      color:          c.textPrimary,
      fontSize:       ty.size.md,
      fontFamily:     SANS,
      outline:        'none',
      boxSizing:      'border-box',
      borderRadius:   r.sm,
      transition:     `border-color ${tr.normal}, background ${tr.normal}`,
      boxShadow:      'inset 0 1px 4px rgba(0,0,0,0.2)',
    },
    select: {
      width:        '100%',
      padding:      '0.5625rem 2.25rem 0.5625rem 0.75rem',
      background:   c.bgPage,
      border:       `1px solid ${c.borderColor}`,
      color:        c.textPrimary,
      fontFamily:   MONO,
      fontSize:     ty.size.md,
      outline:      'none',
      cursor:       'pointer',
      appearance:   'none' as const,
      boxShadow:    'inset 0 1px 3px rgba(0,0,0,0.3)',
      borderRadius: r.sm,
    },
    label: {
      display:       'block',
      fontFamily:    MONO,
      fontWeight:    ty.weight.medium,
      fontSize:      ty.size.xs,
      color:         c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      marginBottom:  '0.4375rem',
    },
  };

  const mkBtn = (
    bg: string,
    color: string,
    border: string,
    hoverBg: string,
    hoverColor?: string,
  ): InteractiveStyle => ({
    base:     { ...btnBase, background: bg, color, borderColor: border },
    hover:    { background: hoverBg, color: hoverColor ?? color },
    disabled: { opacity: 0.45, cursor: 'not-allowed' },
  });

  const buttons: ComponentStyles['buttons'] = {
    primary: mkBtn(
      c.accentBlue, '#fff', c.accentBlue,
      adj(c.accentBlue, isDark ? -20 : 20),
    ),
    secondary: mkBtn(
      c.bgTertiary, c.textSecondary, c.borderColor,
      c.bgPrimary,  c.textPrimary,
    ),
    ghost: {
      base:     { ...btnBase, background: 'transparent', color: c.textTertiary, borderColor: 'transparent' },
      hover:    { background: c.bgTertiary, color: c.textSecondary },
      disabled: { opacity: 0.45, cursor: 'not-allowed' },
    },
    danger: mkBtn(
      c.errorBg, c.accentRed, alpha(c.accentRed, 0.35),
      alpha(c.accentRed, 0.2),
    ),
    dangerSolid: mkBtn(
      c.accentRed, '#fff', adj(c.accentRed, -25),
      adj(c.accentRed, -20),
    ),
    icon: {
      base: {
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        width:          '1.75rem',
        height:         '1.75rem',
        background:     c.bgSecondary,
        border:         `1px solid ${c.borderColor}`,
        borderRadius:   r.xs,
        cursor:         'pointer',
        color:          c.textSecondary,
        transition:     `all ${tr.normal}`,
        padding:        '0',
        flexShrink:     0,
      },
      hover:    { background: c.bgTertiary, color: c.textPrimary },
      disabled: { opacity: 0.4, cursor: 'not-allowed' },
    },
    nav: {
      base: {
        display:      'flex',
        alignItems:   'center',
        gap:          '0.5625rem',
        width:        '100%',
        padding:      '0.4375rem 0.5625rem',
        background:   'transparent',
        border:       'none',
        borderLeft:   '0.125rem solid transparent',
        color:        c.textTertiary,
        fontFamily:   SANS,
        fontWeight:   ty.weight.medium,
        fontSize:     ty.size.md,
        cursor:       'pointer',
        textAlign:    'left',
        transition:   `all ${tr.fast}`,
        borderRadius: r.sm,
      },
      hover:    { color: c.textSecondary, background: c.bgTertiary },
      disabled: { opacity: 0.45, cursor: 'not-allowed' },
    },
    navDanger: {
      base: {
        display:      'flex',
        alignItems:   'center',
        gap:          '0.5625rem',
        width:        '100%',
        padding:      '0.4375rem 0.5625rem',
        background:   'transparent',
        border:       'none',
        borderLeft:   '0.125rem solid transparent',
        color:        c.textTertiary,
        fontFamily:   SANS,
        fontWeight:   ty.weight.medium,
        fontSize:     ty.size.md,
        cursor:       'pointer',
        textAlign:    'left',
        transition:   `all ${tr.fast}`,
        borderRadius: r.sm,
      },
      hover: {
        color:           c.accentRed,
        background:      c.errorBg,
        borderLeftColor: c.accentRed,
      },
      disabled: { opacity: 0.45, cursor: 'not-allowed' },
    },
    langItem: {
      base: {
        display:      'flex',
        alignItems:   'center',
        gap:          '0.5rem',
        width:        '100%',
        padding:      '0.3125rem 0.375rem',
        background:   'transparent',
        border:       'none',
        borderLeft:   `0.125rem solid transparent`,
        color:        c.textTertiary,
        fontFamily:   SANS,
        fontWeight:   ty.weight.medium,
        fontSize:     ty.size.base,
        cursor:       'pointer',
        textAlign:    'left',
        transition:   `color ${tr.fast}, border-color ${tr.fast}`,
        borderRadius: r.xs,
      },
      active: {
        color:          c.accentBlue,
        borderLeftColor:c.accentBlue,
        cursor:         'default',
      },
      hover: { color: c.textSecondary },
    },
    chipBlue: {
      ...btnBase,
      ...btnSm,
      fontFamily:  MONO,
      background:  alpha(c.accentBlue, 0.08),
      borderColor: alpha(c.accentBlue, 0.25),
      color:       c.accentBlue,
    },
    chipGreen: {
      ...btnBase,
      ...btnSm,
      fontFamily:  MONO,
      background:  alpha(c.accentGreen, 0.08),
      borderColor: alpha(c.accentGreen, 0.25),
      color:       c.accentGreen,
    },
    chipRed: {
      ...btnBase,
      ...btnSm,
      fontFamily:  MONO,
      background:  alpha(c.accentRed, 0.08),
      borderColor: alpha(c.accentRed, 0.25),
      color:       c.accentRed,
    },
  };

  const mkBadge = (accent: string, bg: string): React.CSSProperties => ({
    display:       'inline-flex',
    alignItems:    'center',
    gap:           '0.25rem',
    padding:       '0.125rem 0.4375rem',
    fontSize:      ty.size.xs,
    fontFamily:    MONO,
    background:    bg,
    color:         accent,
    border:        `1px solid ${alpha(accent, 0.3)}`,
    letterSpacing: '0.02em',
    flexShrink:    0,
  });

  const badges: ComponentStyles['badges'] = {
    success: mkBadge(c.accentGreen,  alpha(c.accentGreen,  0.12)),
    error:   mkBadge(c.accentRed,    alpha(c.accentRed,    0.12)),
    info:    mkBadge(c.accentBlue,   alpha(c.accentBlue,   0.12)),
    neutral: mkBadge(c.textTertiary, c.bgTertiary),
    warning: mkBadge(c.accentYellow, alpha(c.accentYellow, 0.12)),
  };

  const mkToast = (accent: string, bg: string): React.CSSProperties => ({
    padding:      '0.625rem',
    background:   bg,
    border:       `1px solid ${accent}`,
    borderRadius: r.xs,
    fontSize:     ty.size.base,
    fontFamily:   MONO,
    color:        accent,
  });

  const toasts: ComponentStyles['toasts'] = {
    success: mkToast(c.accentGreen,  c.successBg),
    error:   mkToast(c.accentRed,    c.errorBg),
    info:    mkToast(c.accentBlue,   alpha(c.accentBlue, 0.12)),
    warning: mkToast(c.accentYellow, c.warningBg),
  };

  const code: ComponentStyles['code'] = {
    wrapper: {
      display:       'flex',
      flexDirection: 'column',
      gap:           '0.375rem',
    },
    pre: {
      background:   c.bgPrimary,
      border:       `1px solid ${c.borderColor}`,
      borderRadius: r.md,
      padding:      '0.75rem 0.875rem',
      margin:       0,
      overflow:     'auto',
      fontSize:     '0.71875rem',
      lineHeight:   1.6,
      color:        c.textPrimary,
      fontFamily:   MONO,
    },
    sectionWrapper: {
      overflow: 'hidden',
      border:   `1px solid ${c.borderColor}`,
    },
    sectionHeader: {
      display:       'flex',
      alignItems:    'center',
      gap:           '0.4375rem',
      padding:       '0.5625rem 0.875rem',
      background:    c.bgSecondary,
      borderBottom:  `1px solid ${c.borderColor}`,
    },
    copyButton: {
      base: {
        position:       'absolute',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        width:          '1.75rem',
        height:         '1.75rem',
        background:     c.bgSecondary,
        border:         `1px solid ${c.borderColor}`,
        borderRadius:   r.xs,
        cursor:         'pointer',
        color:          c.textSecondary,
        opacity:        0,
        transform:      'scale(0.9)',
        transition:     `opacity ${tr.normal}, transform ${tr.normal}, color ${tr.slow}`,
        pointerEvents:  'none',
      },
      hover:    { background: c.bgTertiary, color: c.textPrimary },
      disabled: { opacity: 0.4, cursor: 'not-allowed' },
      visible:  { opacity: 1, transform: 'scale(1)', pointerEvents: 'auto' },
      copied:   { color: c.accentGreen },
    },
    tokenContainer: {
      padding:      '0.625rem 2.75rem 0.625rem 0.875rem',
      background:   c.bgPrimary,
      border:       `1px solid ${c.borderColor}`,
      borderRadius: r.md,
      overflow:     'hidden',
      position:     'relative',
    },
  };

  const tabs: ComponentStyles['tabs'] = {
    list: {
      display:      'flex',
      borderBottom: `1px solid ${c.borderColor}`,
      overflowX:    'auto',
    },
    button: {
      base: {
        padding:      '0.625rem 0.875rem',
        background:   'transparent',
        border:       'none',
        borderBottom: '0.125rem solid transparent',
        color:        c.textTertiary,
        fontFamily:   SANS,
        fontWeight:   ty.weight.medium,
        fontSize:     ty.size.md,
        cursor:       'pointer',
        whiteSpace:   'nowrap',
        transition:   `color ${tr.fast}, border-color ${tr.fast}`,
      },
      hover:    { color: c.textSecondary },
      disabled: { opacity: 0.4, cursor: 'not-allowed' },
    },
    active: {
      color:             c.textPrimary,
      borderBottomColor: c.accentBlue,
    },
  };

  const sidebar: ComponentStyles['sidebar'] = {
    container: {
      width:          '14.375rem',
      background:     c.bgSecondary,
      borderRight:    `1px solid ${c.borderColor}`,
      display:        'flex',
      flexDirection:  'column',
      flexShrink:     0,
    },
    profileHeader: {
      padding:      '1rem 0.875rem',
      borderBottom: `1px solid ${c.borderColor}`,
    },
    avatarImg: {
      width:        '2rem',
      height:       '2rem',
      objectFit:    'cover',
      flexShrink:   0,
      border:       `1px solid ${c.borderColor}`,
      borderRadius: r.sm,
    },
    avatarFallback: {
      width:          '2rem',
      height:         '2rem',
      background:     c.bgTertiary,
      border:         `1px solid ${c.borderColor}`,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      flexShrink:     0,
      borderRadius:   r.sm,
    },
    actionSection: {
      padding:   '0.5rem 0.625rem 0.75rem',
      borderTop: `1px solid ${c.borderColor}`,
    },
  };

  const avatar: ComponentStyles['avatar'] = {
    container: {
      width:          '2rem',
      height:         '2rem',
      background:     c.bgTertiary,
      border:         `1px solid ${c.borderColor}`,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      flexShrink:     0,
      borderRadius:   r.sm,
    },
    initials: {
      fontFamily:  SANS,
      fontWeight:  ty.weight.bold,
      fontSize:    ty.size.base,
      color:       c.accentBlue,
      lineHeight:  1,
    },
  };

  const iconBox: ComponentStyles['iconBox'] = {
    base: {
      width:          '2.5rem',
      height:         '2.5rem',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      flexShrink:     0,
      background:     c.bgTertiary,
      border:         `1px solid ${c.borderColor}`,
    },
    blue: {
      width:          '2.5rem',
      height:         '2.5rem',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      flexShrink:     0,
      background:     alpha(c.accentBlue, 0.1),
      border:         `1px solid ${alpha(c.accentBlue, 0.25)}`,
    },
    green: {
      width:          '2.5rem',
      height:         '2.5rem',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      flexShrink:     0,
      background:     alpha(c.accentGreen, 0.1),
      border:         `1px solid ${alpha(c.accentGreen, 0.25)}`,
    },
    red: {
      width:          '2.5rem',
      height:         '2.5rem',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      flexShrink:     0,
      background:     c.errorBg,
      border:         `1px solid ${alpha(c.accentRed, 0.3)}`,
    },
  };

  const components: ComponentStyles = {
    text, surfaces, divider, inputs, buttons, badges,
    toasts, code, tabs, sidebar, avatar, iconBox,
  };

  return { mode, tokens, components, colors: c };
}

// ─────────────────────────────────────────────────────────────────────────────
// Named exports
// ─────────────────────────────────────────────────────────────────────────────

export const defaultDarkTheme:  ThemeSpec = buildDefaultTheme('dark');
export const defaultLightTheme: ThemeSpec = buildDefaultTheme('light');
