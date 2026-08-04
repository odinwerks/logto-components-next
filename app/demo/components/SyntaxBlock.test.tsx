import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const mockTheme = vi.hoisted(() => ({ mode: 'light' as 'light' | 'dark' }));

vi.mock('../../logto-kit/components/providers/preferences', () => ({
  useThemeMode: () => ({ mode: mockTheme.mode }),
}));

import CodeBlock, { SYNTAX_TOKEN_COLORS } from './SyntaxBlock';

function luminance(hex: string) {
  const channels = hex.match(/[a-f\d]{2}/gi)?.map((value) => Number.parseInt(value, 16) / 255) ?? [];
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(first: string, second: string) {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05);
}

describe('SyntaxBlock token contrast', () => {
  it('gives every light-theme token at least 4.5:1 contrast on the code background', () => {
    for (const color of Object.values(SYNTAX_TOKEN_COLORS.light)) {
      expect(contrast(color, '#f9fafb')).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps the original Dark+ token palette untouched', () => {
    expect(SYNTAX_TOKEN_COLORS.dark).toEqual({
      comment: '#6A9955', string: '#CE9178', keyword: '#569CD6', type: '#4EC9B0',
      function: '#DCDCAA', number: '#B5CEA8', tag: '#569CD6', attribute: '#9CDCDB',
      jsxExpr: '#D4D4D4', plain: '#D4D4D4',
    });
  });

  it('renders highlighted tokens with the active theme palette', () => {
    mockTheme.mode = 'light';
    const { container, rerender } = render(<CodeBlock code="const" />);
    expect(container.querySelector('code span')).toHaveStyle({ color: SYNTAX_TOKEN_COLORS.light.keyword });

    mockTheme.mode = 'dark';
    rerender(<CodeBlock code="const" />);
    expect(container.querySelector('code span')).toHaveStyle({ color: SYNTAX_TOKEN_COLORS.dark.keyword });
  });
});
