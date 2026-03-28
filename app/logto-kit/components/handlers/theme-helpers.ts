// =============================================================================
// components/handlers/theme-helpers.ts
//
// Shorthand aliases used heavily by security.tsx and identities.tsx.
// Both ThemeColors and ThemeSpec are accepted — ThemeSpec is preferred.
// =============================================================================

import type { ThemeColors } from '../../themes';
import { alpha, adj as _adj } from '../../themes/default';

// Re-export adj so callers can import it from here
export { _adj as adj, alpha };

// The shape returned by tk()
interface TK {
  // Fonts
  font:  string;
  mono:  string;

  // Text colours
  text:  string; // textPrimary
  sub:   string; // textSecondary
  muted: string; // textTertiary

  // Surface colours
  bg:      string; // bgPrimary
  surface: string; // bgSecondary
  raised:  string; // bgTertiary

  // Borders
  border:      string;
  borderFaint: string; // borderColor @50% alpha

  // Green family
  greenDim:  string; // alpha bg for green surfaces
  greenText: string; // accentGreen

  // Blue family
  blueDim:  string;
  blueText: string; // accentBlue
  blue:     string; // accentBlue (alias)

  // Red family
  redDim:    string;
  redText:   string; // accentRed
  redBorder: string; // alpha(accentRed, 0.3)
  red:       string; // accentRed

  // Amber / yellow family
  amberDim:  string;
  amberText: string; // accentYellow
}

type Acceptable = ThemeColors | { colors: ThemeColors; mode?: string };

function extractColors(tc: Acceptable): ThemeColors {
  if ('colors' in tc && tc.colors && typeof tc.colors === 'object') {
    return tc.colors as ThemeColors;
  }
  return tc as ThemeColors;
}

/**
 * Returns a compact alias object from a ThemeColors or ThemeSpec.
 * Security.tsx and other heavy consumers use this to keep inline styles terse.
 */
export function tk(tc: Acceptable): TK {
  const c = extractColors(tc);
  return {
    font:  "'DM Sans', system-ui, sans-serif",
    mono:  "'IBM Plex Mono', 'Courier New', monospace",

    text:  c.textPrimary,
    sub:   c.textSecondary,
    muted: c.textTertiary,

    bg:      c.bgPrimary,
    surface: c.bgSecondary,
    raised:  c.bgTertiary,

    border:      c.borderColor,
    borderFaint: alpha(c.borderColor, 0.5),

    greenDim:  alpha(c.accentGreen, 0.1),
    greenText: c.accentGreen,

    blueDim:  alpha(c.accentBlue, 0.1),
    blueText: c.accentBlue,
    blue:     c.accentBlue,

    redDim:    c.errorBg,
    redText:   c.accentRed,
    redBorder: alpha(c.accentRed, 0.3),
    red:       c.accentRed,

    amberDim:  c.warningBg,
    amberText: c.accentYellow,
  };
}
