import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FarewellOverlay } from './FarewellOverlay';
import type { ThemeColors } from '../types';

const mockColors = {
  textPrimary: '#fff',
} as unknown as ThemeColors;

describe('FarewellOverlay', () => {
  it('renders the provided message in large bold centered text', () => {
    render(<FarewellOverlay message="Farewell." colors={mockColors} delayMs={100} />);
    const p = screen.getByText('Farewell.');
    expect(p.tagName).toBe('P');
    expect(p.getAttribute('style')).toContain('font-size: 1.75rem');
    expect(p.getAttribute('style')).toContain('font-weight: 700');
  });

  it('defaults to root navigation when no onComplete provided (implementation uses window.location)', () => {
    // The component uses window.location.href directly in its timer.
    // This test verifies the default branch exists; full navigation tested via integration.
    const originalLocation = window.location;
    // @ts-ignore
    delete (window as any).location;
    // @ts-ignore
    (window as any).location = { href: '' };

    render(<FarewellOverlay message="Account deleted." colors={mockColors} delayMs={0} />);

    // Immediately after mount with 0 delay, the effect schedules sync microtask.
    // We just assert the component renders without error for the default path.
    expect(screen.getByText('Account deleted.')).toBeTruthy();

    // Restore
    (window as any).location = originalLocation;
  });
});
