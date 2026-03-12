// =============================================================================
// Theme System — themes/index.ts
//
// This file owns:
//   1. All design-token interfaces (ThemeColors, ThemeTokens, …)
//   2. The ComponentStyles interface — pre-built React.CSSProperties for every
//      reusable UI pattern in the dashboard.
//   3. ThemeSpec — the complete design contract any theme must fulfil.
//   4. ENV helpers and the theme registry (getThemeSpec).
//
// Adding a new theme:
//   1. Create  themes/<name>/index.ts  that exports  { <name>DarkTheme, <name>LightTheme }
//   2. Add a case to resolveTheme() below.
//   3. Set  THEME=<name>  in .env
// =============================================================================

import type React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Primitive color tokens
// ─────────────────────────────────────────────────────────────────────────────

export interface ThemeColors {
  // ── Backgrounds ─────────────────────────────────────────────────────────
  bgPage:      string; // outermost viewport fill
  bgPrimary:   string; // base card / code-block fill
  bgSecondary: string; // slightly elevated surface (sidebar, cards)
  bgTertiary:  string; // buttons, hover states, chips

  // ── Text ────────────────────────────────────────────────────────────────
  textPrimary:   string; // headings, active nav, values
  textSecondary: string; // body copy, supporting text
  textTertiary:  string; // labels, placeholders, muted info

  // ── Borders ─────────────────────────────────────────────────────────────
  borderColor: string;

  // ── Accent palette ──────────────────────────────────────────────────────
  accentGreen:  string;
  accentRed:    string;
  accentYellow: string;
  accentBlue:   string;

  // ── Semantic status fills ────────────────────────────────────────────────
  successBg: string;
  errorBg:   string;
  warningBg: string;

  // ── Typography ───────────────────────────────────────────────────────────
  /** Base font weight applied to body copy (400 dark / 500 light typical) */
  fontWeight: number | string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Design tokens beyond color
// ─────────────────────────────────────────────────────────────────────────────

export interface ThemeTypography {
  fontMono: string;
  fontSans: string;
  /** Fluid size scale in rem */
  size: {
    micro: string;  // ~9px  0.5625rem
    xs:    string;  // 10px  0.625rem
    sm:    string;  // 11px  0.6875rem
    base:  string;  // 12px  0.75rem
    md:    string;  // 13px  0.8125rem
    lg:    string;  // 14px  0.875rem
    xl:    string;  // 15px  0.9375rem
  };
  weight: {
    normal:   number;
    medium:   number;
    semibold: number;
    bold:     number;
  };
  leading: {
    tight:  number;
    normal: number;
    relaxed: number;
  };
}

export interface ThemeRadii {
  none: string;
  xs:   string; // 0.1875rem  ~3px
  sm:   string; // 0.25rem     4px
  md:   string; // 0.375rem    6px
  lg:   string; // 0.5rem      8px
  full: string; // 9999px
}

export interface ThemeShadows {
  none:    string;
  card:    string;
  popover: string;
  modal:   string;
}

export interface ThemeTransitions {
  fast:   string; // 0.1s ease
  normal: string; // 0.15s ease
  slow:   string; // 0.25s ease
}

export interface ThemeTokens {
  colors:      ThemeColors;
  typography:  ThemeTypography;
  radii:       ThemeRadii;
  shadows:     ThemeShadows;
  transitions: ThemeTransitions;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Interactive style — base + state deltas
//    Components spread these via useState+onMouseEnter/Leave
// ─────────────────────────────────────────────────────────────────────────────

export interface InteractiveStyle {
  base:      React.CSSProperties;
  hover:     React.CSSProperties;
  active?:   React.CSSProperties;
  disabled:  React.CSSProperties;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ComponentStyles — pre-built style objects for every reusable UI pattern.
//    The theme folder is the ONLY place these values live.
//    Components must not hard-code padding, color, radius, font, etc.
// ─────────────────────────────────────────────────────────────────────────────

export interface ComponentStyles {

  // ── Typography ────────────────────────────────────────────────────────────
  text: {
    heading:      React.CSSProperties;
    sectionLabel: React.CSSProperties; // ALL-CAPS label preceding a section
    fieldLabel:   React.CSSProperties; // label above a form field
    body:         React.CSSProperties;
    bodyMono:     React.CSSProperties;
    muted:        React.CSSProperties;
    mutedMono:    React.CSSProperties;
    micro:        React.CSSProperties;
    microMono:    React.CSSProperties; // tiny ALL-CAPS mono (code block headers)
    link:         React.CSSProperties;
    error:        React.CSSProperties; // inline validation error
    description:  React.CSSProperties; // tab description paragraph
  };

  // ── Surfaces / containers ─────────────────────────────────────────────────
  surfaces: {
    page:              React.CSSProperties;
    modal:             React.CSSProperties; // the centred floating panel
    card:              React.CSSProperties; // bordered section card
    cardHeader:        React.CSSProperties; // card title bar (normal)
    cardHeaderDanger:  React.CSSProperties; // card title bar (danger variant)
    well:              React.CSSProperties; // padded inset section block
    infoRow:           React.CSSProperties; // single key/value display cell
    chip:              React.CSSProperties; // compact pill (IDs, etc.)
    dropZone:          React.CSSProperties; // file drag-drop area
    dropZoneActive:    React.CSSProperties; // drag-over overrides
    emptyState:        React.CSSProperties; // centred "nothing here" block
    overlay:           React.CSSProperties; // modal backdrop
    codeInfoBox:       React.CSSProperties; // info callout inside modals
  };

  // ── Structural ───────────────────────────────────────────────────────────
  divider: React.CSSProperties;

  // ── Form inputs ───────────────────────────────────────────────────────────
  inputs: {
    text:   React.CSSProperties;
    select: React.CSSProperties;
    label:  React.CSSProperties;
  };

  // ── Buttons ─────────────────────────────────────────────────────────────
  buttons: {
    primary:     InteractiveStyle;
    secondary:   InteractiveStyle;
    ghost:       InteractiveStyle;
    danger:      InteractiveStyle;
    dangerSolid: InteractiveStyle;
    icon:        InteractiveStyle; // square icon-only button
    // Sidebar action buttons (Sign out, Theme toggle)
    nav:         InteractiveStyle;
    navDanger:   InteractiveStyle;
    // Language selector item
    langItem: {
      base:   React.CSSProperties;
      active: React.CSSProperties;
      hover:  React.CSSProperties;
    };
    // Dev-tab cookie/session action chips
    chipBlue:  React.CSSProperties;
    chipGreen: React.CSSProperties;
    chipRed:   React.CSSProperties;
  };

  // ── Badges / tags ─────────────────────────────────────────────────────────
  badges: {
    success: React.CSSProperties;
    error:   React.CSSProperties;
    info:    React.CSSProperties;
    neutral: React.CSSProperties;
    warning: React.CSSProperties;
  };

  // ── Toast notifications ───────────────────────────────────────────────────
  toasts: {
    success: React.CSSProperties;
    error:   React.CSSProperties;
    info:    React.CSSProperties;
    warning: React.CSSProperties;
  };

  // ── Code / token display ─────────────────────────────────────────────────
  code: {
    wrapper:        React.CSSProperties; // outer container
    pre:            React.CSSProperties; // <pre> element
    sectionWrapper: React.CSSProperties; // dev-tab section (icon+label bar + pre)
    sectionHeader:  React.CSSProperties; // dev-tab section title bar
    copyButton: InteractiveStyle & {
      visible: React.CSSProperties; // opacity:1 when hovered/copied
      copied:  React.CSSProperties; // green tint
    };
    tokenContainer: React.CSSProperties; // TruncatedToken outer div
  };

  // ── Tab navigation ────────────────────────────────────────────────────────
  tabs: {
    list:   React.CSSProperties;
    button: InteractiveStyle;
    active: React.CSSProperties; // merged on top of button.base when tab is active
  };

  // ── Sidebar ─────────────────────────────────────────────────────────────
  sidebar: {
    container:     React.CSSProperties;
    profileHeader: React.CSSProperties;
    avatarImg:     React.CSSProperties;
    avatarFallback:React.CSSProperties;
    actionSection: React.CSSProperties;
  };

  // ── Avatar / user badge ───────────────────────────────────────────────────
  avatar: {
    initials: React.CSSProperties;
    container:React.CSSProperties;
  };

  // ── Icon container box (used in security tab etc.) ───────────────────────
  iconBox: {
    base:  React.CSSProperties;
    blue:  React.CSSProperties;
    green: React.CSSProperties;
    red:   React.CSSProperties;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ThemeSpec — the complete design contract for a given mode
// ─────────────────────────────────────────────────────────────────────────────

export interface ThemeSpec {
  /** 'dark' | 'light' */
  mode: 'dark' | 'light';

  /**
   * Raw design tokens.
   * Use tokens.colors, tokens.typography, tokens.radii etc. for building
   * custom one-off styles that are not covered by `components`.
   */
  tokens: ThemeTokens;

  /**
   * Pre-built component style objects.
   * This is the primary API for all components.
   * Example: <div style={theme.components.surfaces.well}>
   */
  components: ComponentStyles;

  /**
   * Convenience shorthand — identical to tokens.colors.
   * Keeps existing `themeColors.accentBlue` style access patterns working
   * during migration without extra destructuring.
   */
  colors: ThemeColors;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ENV helpers
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

/** Active theme folder name from ENV (default: 'default') */
export function getThemeName(): string {
  return (readEnv('THEME') || 'default').trim();
}

/** Default mode from ENV (default: 'dark') */
export function getDefaultThemeMode(): 'dark' | 'light' {
  const raw = (readEnv('DEFAULT_THEME_MODE') || 'dark').trim().toLowerCase();
  return raw === 'light' ? 'light' : 'dark';
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Theme registry
// ─────────────────────────────────────────────────────────────────────────────

import { defaultDarkTheme, defaultLightTheme } from './default';

function resolveTheme(themeName: string, mode: 'dark' | 'light'): ThemeSpec {
  switch (themeName) {
    // Register new theme folders here:
    // case 'midnight':
    //   return mode === 'dark' ? midnightDarkTheme : midnightLightTheme;
    case 'default':
    default:
      return mode === 'dark' ? defaultDarkTheme : defaultLightTheme;
  }
}

const _themeName = getThemeName();

/** Returns the complete ThemeSpec for the given mode using the ENV-selected theme. */
export function getThemeSpec(mode: 'dark' | 'light'): ThemeSpec {
  return resolveTheme(_themeName, mode);
}

/** Pre-resolved dark theme (active theme folder) */
export const darkTheme:  ThemeSpec = resolveTheme(_themeName, 'dark');

/** Pre-resolved light theme (active theme folder) */
export const lightTheme: ThemeSpec = resolveTheme(_themeName, 'light');

// ─────────────────────────────────────────────────────────────────────────────
// 8. Backward-compat re-exports
//    Components that still reference ThemeColors directly continue to compile.
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Access via ThemeSpec.colors instead */
export const darkColors:  ThemeColors = defaultDarkTheme.colors;
/** @deprecated Access via ThemeSpec.colors instead */
export const lightColors: ThemeColors = defaultLightTheme.colors;
