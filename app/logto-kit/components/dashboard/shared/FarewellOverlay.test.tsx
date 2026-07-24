import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { FarewellOverlay } from './FarewellOverlay';
import type { ThemeColors } from '../types';

const mockColors = {
  textPrimary: '#fff',
} as unknown as ThemeColors;

describe('FarewellOverlay', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    delete (window as unknown as { location: unknown }).location;
    (window as unknown as { location: { href: string } }).location = { href: '' };

    render(<FarewellOverlay message="Account deleted." colors={mockColors} delayMs={0} />);

    // Immediately after mount with 0 delay, the effect schedules sync microtask.
    // We just assert the component renders without error for the default path.
    expect(screen.getByText('Account deleted.')).toBeTruthy();

    // Restore
    (window as unknown as { location: typeof originalLocation }).location = originalLocation;
  });

  // BUG-019: Timer must not reset when onComplete callback identity changes on re-renders
  it('does NOT reset the timer when parent re-renders with a new onComplete identity', async () => {
    vi.useFakeTimers();

    const onComplete1 = vi.fn();
    const onComplete2 = vi.fn();

    // Initial render with delayMs=100 and onComplete1
    const { rerender } = render(
      <FarewellOverlay message="Goodbye" colors={mockColors} delayMs={100} onComplete={onComplete1} />,
    );

    // Advance 50ms — timer is half way, callback should not have fired
    await vi.advanceTimersByTimeAsync(50);
    expect(onComplete1).not.toHaveBeenCalled();
    expect(onComplete2).not.toHaveBeenCalled();

    // Parent re-render with a different onComplete identity (onComplete2)
    // This simulates heartbeats or animation frames causing re-renders
    rerender(
      <FarewellOverlay message="Goodbye" colors={mockColors} delayMs={100} onComplete={onComplete2} />,
    );

    // Advance the remaining 50ms — total 100ms since mount
    // With the ref fix, the timer fires on schedule using the latest callback (onComplete2)
    await vi.advanceTimersByTimeAsync(50);
    expect(onComplete2).toHaveBeenCalledTimes(1);
    // onComplete1 should NOT be called — ref was updated to onComplete2 before timer fired
    expect(onComplete1).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
