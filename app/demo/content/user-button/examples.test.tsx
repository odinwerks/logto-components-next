import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let isPortrait = false;

vi.mock('../../../logto-kit', () => ({
  useIsPortrait: () => isPortrait,
}));

vi.mock('../../../logto-kit/components/providers/preferences', () => ({
  useThemeMode: () => ({ mode: 'light' }),
}));

vi.mock('../../../logto-kit/components/UserButton', () => ({
  UserButton: () => <div>UserButton</div>,
  UserBadge: () => <div>UserBadge</div>,
  UserCard: () => <div>UserCard</div>,
}));

vi.mock('../../components/SyntaxBlock', () => ({
  default: ({ code }: { code: string }) => <pre>{code}</pre>,
}));

import UserButtonExamples from './examples';

describe('UserButtonExamples responsive card layout', () => {
  it('uses two-column grid on non-mobile and one-column stacked cards on mobile', () => {
    const { container, rerender } = render(<UserButtonExamples />);

    const grid = container.firstElementChild as HTMLDivElement;
    expect(grid.style.gridTemplateColumns).toBe('1fr 1fr');

    let label = screen.getByText('Default + sizes');
    let card = label.parentElement?.parentElement?.parentElement as HTMLDivElement;
    let codePane = card.firstElementChild as HTMLDivElement;
    expect(card.style.flexDirection).toBe('row');
    expect(codePane.style.borderRight).toContain('1px solid');

    isPortrait = true;
    rerender(<UserButtonExamples />);

    expect(grid.style.gridTemplateColumns).toBe('1fr');

    label = screen.getByText('Default + sizes');
    card = label.parentElement?.parentElement?.parentElement as HTMLDivElement;
    codePane = card.firstElementChild as HTMLDivElement;

    expect(card.style.flexDirection).toBe('column');
    expect(codePane.style.borderRightStyle).toBe('none');
    expect(codePane.getAttribute('style')).toContain('border-bottom');
  });
});
