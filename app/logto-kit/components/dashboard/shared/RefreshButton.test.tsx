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

  it('announces loading and completion without changing disabled behavior', () => {
    const view = render(
      <RefreshButton onClick={() => {}} loading={false} colors={LIGHT_COLORS} ariaLabel="Refresh items" />,
    );
    const button = screen.getByRole('button', { name: 'Refresh items' });
    expect(button).toHaveAttribute('aria-busy', 'false');
    expect(button).not.toBeDisabled();

    view.rerender(
      <RefreshButton onClick={() => {}} loading colors={LIGHT_COLORS} ariaLabel="Refresh items" />,
    );
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    expect(screen.getByText('Refresh items in progress')).toBeInTheDocument();

    view.rerender(
      <RefreshButton onClick={() => {}} loading={false} colors={LIGHT_COLORS} ariaLabel="Refresh items" />,
    );
    expect(button).toHaveAttribute('aria-busy', 'false');
    expect(button).not.toBeDisabled();
    expect(screen.getByText('Refresh items complete')).toBeInTheDocument();
  });
});
