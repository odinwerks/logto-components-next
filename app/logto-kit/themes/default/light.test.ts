import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DARK_COLORS, LIGHT_COLORS, LIGHT_STATUS_TINTS, type ThemeColors } from '..';

const css = readFileSync(resolve(process.cwd(), 'app/logto-kit/themes/default/light.css'), 'utf8');

function token(name: string) {
  const value = css.match(new RegExp(`--${name}:\\s*(#[a-f\\d]{6})`, 'i'))?.[1];
  expect(value, `missing --${name}`).toBeDefined();
  return value!;
}

type Rgb = readonly [number, number, number];

function rgb(hex: string): Rgb {
  const normalized = hex.length === 4
    ? `#${[...hex.slice(1)].map((channel) => channel.repeat(2)).join('')}`
    : hex;
  const channels = normalized.match(/[a-f\d]{2}/gi)!.map((value) => Number.parseInt(value, 16));
  return [channels[0], channels[1], channels[2]];
}

function luminance(color: string | Rgb) {
  const channels = (typeof color === 'string' ? rgb(color) : color).map((value) => value / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(first: string | Rgb, second: string | Rgb) {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05);
}

function composite(foreground: string, background: string, alpha: number): Rgb {
  const foregroundChannels = rgb(foreground);
  const backgroundChannels = rgb(background);
  return foregroundChannels.map((channel, index) =>
    alpha * channel + (1 - alpha) * backgroundChannels[index]
  ) as unknown as Rgb;
}

function splitTint(hex: string) {
  expect(hex, 'tint must use #rrggbbaa notation').toMatch(/^#[a-f\d]{8}$/i);
  return {
    color: hex.slice(0, 7),
    alpha: Number.parseInt(hex.slice(7), 16) / 0xff,
  };
}

type ColorToken = Exclude<keyof ThemeColors, 'fontWeight'>;
type ForegroundToken = Extract<ColorToken,
  | 'textPrimary'
  | 'textSecondary'
  | 'textTertiary'
  | 'accentGreen'
  | 'accentRed'
  | 'accentYellow'
  | 'accentBlue'
  | 'contrastText'>;

const cssTokens = {
  bgPage: 'ldd-bg-page',
  bgPrimary: 'ldd-bg-primary',
  bgSecondary: 'ldd-bg-secondary',
  bgTertiary: 'ldd-bg-tertiary',
  textPrimary: 'ldd-text-primary',
  textSecondary: 'ldd-text-secondary',
  textTertiary: 'ldd-text-tertiary',
  borderColor: 'ldd-border-color',
  accentGreen: 'ldd-accent-green',
  accentRed: 'ldd-accent-red',
  accentYellow: 'ldd-accent-yellow',
  accentBlue: 'ldd-accent-blue',
  successBg: 'ldd-success-bg',
  errorBg: 'ldd-error-bg',
  warningBg: 'ldd-warning-bg',
} satisfies Record<Exclude<ColorToken, 'contrastText'>, string>;

/**
 * Documented text/background combinations used by the light runtime theme.
 * Background and border tokens are not text; they are covered here as the
 * surfaces for readable foregrounds rather than incorrectly applying WCAG's
 * 4.5:1 text threshold to decorative colors in isolation.
 */
const lightForegroundBackgrounds = {
  textPrimary: ['bgPage', 'bgPrimary', 'bgSecondary', 'bgTertiary', 'borderColor'],
  textSecondary: ['bgPage', 'bgPrimary', 'bgSecondary', 'bgTertiary'],
  textTertiary: ['bgPage', 'bgPrimary', 'bgSecondary', 'bgTertiary'],
  accentGreen: ['successBg'],
  accentRed: ['bgPrimary'],
  accentYellow: ['warningBg'],
  accentBlue: ['bgPrimary'],
  contrastText: ['accentGreen', 'accentRed', 'accentYellow', 'accentBlue'],
} satisfies Record<ForegroundToken, readonly ColorToken[]>;

const lightTintedStatusPairs = [
  {
    name: 'Security and Identities green status (10%)',
    foreground: () => LIGHT_COLORS.accentGreen,
    tint: () => `${LIGHT_COLORS.accentGreen}1a`,
    background: () => LIGHT_COLORS.bgSecondary,
  },
  {
    name: 'Sessions current-device green status (20%)',
    foreground: () => LIGHT_COLORS.accentGreen,
    tint: () => `${LIGHT_COLORS.accentGreen}33`,
    background: () => LIGHT_COLORS.bgSecondary,
  },
  {
    name: 'shared green IconBox (10%)',
    foreground: () => LIGHT_COLORS.accentGreen,
    tint: () => LIGHT_STATUS_TINTS.green10,
    background: () => LIGHT_COLORS.bgSecondary,
  },
  {
    name: 'backup-code amber notice (10%)',
    foreground: () => LIGHT_COLORS.accentYellow,
    tint: () => LIGHT_STATUS_TINTS.amber10,
    background: () => LIGHT_COLORS.bgSecondary,
  },
] as const;

describe('light theme status contrast', () => {
  it('uses the accessible light-only green and amber foreground tokens', () => {
    expect(token('ldd-accent-green')).toBe('#065f46');
    expect(token('ldd-accent-yellow')).toBe('#92400e');
  });

  it('meets 4.5:1 for status text on its corresponding light fill', () => {
    expect(contrast(token('ldd-accent-green'), token('ldd-success-bg'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('ldd-accent-yellow'), token('ldd-warning-bg'))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps every runtime light color in sync with its CSS token', () => {
    for (const [runtimeName, cssName] of Object.entries(cssTokens)) {
      expect(LIGHT_COLORS[runtimeName as keyof typeof cssTokens], runtimeName).toBe(token(cssName));
    }

    expect(LIGHT_COLORS.contrastText).toBe('#fff');
  });

  it('meets 4.5:1 for every runtime light foreground on its documented backgrounds', () => {
    for (const [foregroundName, backgroundNames] of Object.entries(lightForegroundBackgrounds)) {
      const foreground = LIGHT_COLORS[foregroundName as ForegroundToken];

      for (const backgroundName of backgroundNames) {
        const background = LIGHT_COLORS[backgroundName];
        expect(
          contrast(foreground, background),
          `${foregroundName} on ${backgroundName}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('meets 4.5:1 for every alpha-composited status tint', () => {
    for (const pair of lightTintedStatusPairs) {
      const tint = splitTint(pair.tint());
      const effectiveBackground = composite(tint.color, pair.background(), tint.alpha);
      expect(
        contrast(pair.foreground(), effectiveBackground),
        pair.name,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('does not change the dark runtime theme', () => {
    expect(DARK_COLORS).toEqual({
      bgPage: '#030404',
      bgPrimary: '#111620',
      bgSecondary: '#08090a',
      bgTertiary: '#171c2a',
      textPrimary: '#f3f4f6',
      textSecondary: '#9ca3af',
      textTertiary: '#90959e',
      borderColor: '#2a2d32',
      accentGreen: '#059669',
      accentRed: '#dc2626',
      accentYellow: '#d97706',
      accentBlue: '#2563eb',
      successBg: '#021a11',
      errorBg: '#1a0505',
      warningBg: '#1a0a02',
      contrastText: '#fff',
      fontWeight: 400,
    });
  });
});
