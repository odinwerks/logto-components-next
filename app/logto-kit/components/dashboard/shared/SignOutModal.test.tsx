import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignOutModal } from './SignOutModal';
import type { Translations } from '../../../locales';
import type { ThemeColors } from '../types';
import { signOutUser } from '../../../logic/actions/auth';
import * as env from '../../../logic/env';

vi.mock('../../../logic/env', async () => {
  const actual = await vi.importActual('../../../logic/env');
  return {
    ...actual,
    readEnv: vi.fn((name: string) => {
      if (name === 'SIGNOUT_REDIRECT_DELAY') return '100';
      return (actual as any).readEnv(name);
    }),
  };
});

// Mock translations object with the new signout section
const mockT = {
  common: {
    signOut: 'Sign out',
  },
  profile: {
    cancel: 'Cancel',
  },
  dashboard: {
    signOut: 'Sign out',
  },
  signout: {
    title: 'Leaving already?',
    bodyCountdown: "You'll be signed out in {n}s",
    abort: 'Abort',
    confirm: 'Let me go!',
    farewell: 'See you later!',
  },
} as unknown as Translations;

// Minimal colors object (only the properties accessed)
const mockColors = {
  bgSecondary: '#1a1a1a',
  borderColor: '#333',
  textPrimary: '#fff',
  textSecondary: '#aaa',
  accentRed: '#ef4444',
  contrastText: '#fff',
} as unknown as ThemeColors;

// Mock the signOutUser server action
vi.mock('../../../logic/actions/auth', () => ({
  signOutUser: vi.fn(),
}));

describe('SignOutModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} mode="dark" colors={mockColors} t={mockT} />);
    expect(screen.getByText('Leaving already?')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<SignOutModal isOpen={false} onAbort={vi.fn()} mode="dark" colors={mockColors} t={mockT} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays the translated title', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} mode="dark" colors={mockColors} t={mockT} />);
    expect(screen.getByText('Leaving already?')).toBeInTheDocument();
  });

  it('displays countdown body with bold number', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} countdownSeconds={15} mode="dark" colors={mockColors} t={mockT} />);
    // The body text should contain the translated string with {n} replaced
    expect(screen.getByText(/You'll be signed out in/)).toBeInTheDocument();
    // The number should be wrapped in <strong>
    const strong = screen.getByText('15');
    expect(strong.tagName).toBe('STRONG');
  });

  it('renders abort button with translated text', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} mode="dark" colors={mockColors} t={mockT} />);
    expect(screen.getByRole('button', { name: 'Abort' })).toBeInTheDocument();
  });

  it('renders confirm button with translated text', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} mode="dark" colors={mockColors} t={mockT} />);
    expect(screen.getByRole('button', { name: 'Let me go!' })).toBeInTheDocument();
  });

  it('calls onAbort when Abort button is clicked', () => {
    const onAbort = vi.fn();
    render(<SignOutModal isOpen={true} onAbort={onAbort} mode="dark" colors={mockColors} t={mockT} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abort' }));
    expect(onAbort).toHaveBeenCalledTimes(1);
  });

  it('shows farewell stage and calls signOutUser after countdown reaches zero', async () => {
    vi.useFakeTimers();

    render(<SignOutModal isOpen={true} onAbort={vi.fn()} countdownSeconds={2} mode="dark" colors={mockColors} t={mockT} />);

    // Advance to trigger countdown end → farewell stage
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Farewell text should be visible
    expect(screen.getByText('See you later!')).toBeInTheDocument();

    // Advance another ~1s for signOutUser call
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(signOutUser).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('shows farewell stage immediately when confirm button is clicked and calls signOutUser', async () => {
    vi.useFakeTimers();
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} countdownSeconds={15} mode="dark" colors={mockColors} t={mockT} />);

    fireEvent.click(screen.getByRole('button', { name: 'Let me go!' }));

    expect(screen.getByText('See you later!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(signOutUser).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('accepts custom countdownSeconds', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} countdownSeconds={5} mode="dark" colors={mockColors} t={mockT} />);
    const strong = screen.getByText('5');
    expect(strong.tagName).toBe('STRONG');
  });

  it('renders no X/close button (only abort + confirm)', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} mode="dark" colors={mockColors} t={mockT} />);
    // There should be exactly 2 buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('renders the countdown number with bold and larger font via strong tag', () => {
    render(<SignOutModal isOpen={true} onAbort={vi.fn()} countdownSeconds={15} mode="dark" colors={mockColors} t={mockT} />);
    const strong = screen.getByText('15');
    expect(strong.tagName).toBe('STRONG');
    // Verify inline style for larger/bolder number (spec requirement)
    expect(strong.getAttribute('style')).toContain('font-size: 1.5rem');
    expect(strong.getAttribute('style')).toContain('font-weight: 700');
  });
});
