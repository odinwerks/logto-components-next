import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';
import { DARK_COLORS } from '../../themes';

describe('Button Component (P-BUG-008)', () => {
  it('renders children and responds to pointer enter/leave events', () => {
    render(
      <Button mode="dark" colors={DARK_COLORS}>
        Test Button
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Test Button' });
    expect(button).toBeInTheDocument();

    // Trigger pointer enter
    fireEvent.pointerEnter(button);
    // Style check for hovered state (secondary variant hover has background color of bgPrimary)
    expect(button.style.background).toBe('rgb(17, 22, 32)');

    // Trigger pointer leave
    fireEvent.pointerLeave(button);
    // Style check for normal state (secondary variant has background color of bgTertiary)
    expect(button.style.background).toBe('rgb(23, 28, 42)');
  });
});
