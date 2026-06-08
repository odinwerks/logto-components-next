import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RefreshButton } from './RefreshButton';
import { LIGHT_COLORS } from '../../../themes';

describe('RefreshButton Accessibility', () => {
  it('has the specified aria-label', () => {
    const label = 'Refresh items';
    render(
      <RefreshButton
        onClick={() => {}}
        loading={false}
        colors={LIGHT_COLORS}
        ariaLabel={label}
      />
    );

    const button = screen.getByRole('button', { name: label });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', label);
  });
});
