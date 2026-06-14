import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SignOutModal } from './SignOutModal';
import type { Translations } from '../../../locales';
import type { ThemeColors } from '../types';

// Mock signOutUser server action (required since SignOutModal now imports it)
vi.mock('../../../logic/actions/auth', () => ({
  signOutUser: vi.fn().mockResolvedValue(undefined),
}));

// Mock translations
const mockT = {
  signout: {
    title: 'Leaving already?',
    bodyCountdown: "You'll be signed out in {n}s",
    abort: 'Abort',
    confirm: 'Let me go!',
    farewell: 'See you later!',
  },
} as unknown as Translations;

const mockColors = {
  bgSecondary: '#1a1a1a',
  borderColor: '#333',
  textPrimary: '#fff',
  textSecondary: '#aaa',
  accentRed: '#ef4444',
  contrastText: '#fff',
} as unknown as ThemeColors;

describe('SignOutModal - countdown styling', () => {
  it('renders the countdown number with bold and larger font via strong tag', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} countdownSeconds={15} mode="dark" colors={mockColors} t={mockT} />);
    const strong = screen.getByText('15');
    expect(strong.tagName).toBe('STRONG');
    // The parent paragraph should contain the styled number
    expect(strong.parentElement?.tagName).toBe('P');
  });
});
