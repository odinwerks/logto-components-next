import type { ThemeColors } from '../../themes';

export function adj(hex: string, n: number): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return hex;
  const v = parseInt(c, 16);
  const r = Math.min(255, Math.max(0, (v >> 16) + n));
  const g = Math.min(255, Math.max(0, ((v >> 8) & 0xff) + n));
  const b = Math.min(255, Math.max(0, (v & 0xff) + n));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export function tk(tc: ThemeColors) {
  return {
    bg: tc.bgPrimary,
    surface: tc.bgSecondary,
    raised: tc.bgTertiary,
    border: tc.borderColor,
    borderFaint: tc.borderColor + '55',
    text: tc.textPrimary,
    sub: tc.textSecondary,
    muted: tc.textTertiary,
    blue: tc.accentBlue,
    blueEdge: adj(tc.accentBlue, -20),
    blueDim: tc.accentBlue + '1a',
    blueText: tc.accentBlue,
    red: tc.accentRed,
    redDim: tc.accentRed + '1a',
    redBorder: adj(tc.accentRed, -30) + '55',
    redText: tc.accentRed,
    green: tc.accentGreen,
    greenDim: tc.accentGreen + '1a',
    greenText: adj(tc.accentGreen, 30),
    amber: tc.accentYellow,
    amberDim: tc.accentYellow + '1a',
    amberText: adj(tc.accentYellow, -20),
    font: "'Sora', system-ui, sans-serif",
    mono: "'IBM Plex Mono', monospace",
  };
}

export type ThemeHelper = ReturnType<typeof tk>;
