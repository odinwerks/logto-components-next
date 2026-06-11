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
});
