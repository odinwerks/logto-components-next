import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';
import { DARK_COLORS } from '../../themes';

describe('Button Component (P-BUG-008)', () => {
  it('renders children and applies CSS-class-based hover styles to prevent touchscreen sticky hover', () => {
    render(
      <Button mode="dark" colors={DARK_COLORS}>
        Test Button
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Test Button' });
    expect(button).toBeInTheDocument();

    // Verify base style is applied inline
    // (secondary variant has background color of bgTertiary)
    expect(button.style.background).toBe('rgb(23, 28, 42)');

    // Verify that CSS classes for hover/focus-visible are applied
    // (replaces the previous runtime <style>-tag injection pattern)
    expect(button.className).toContain('ldd-btn');
    expect(button.className).toContain('ldd-btn-secondary');

    // Verify hover/focus-visible colors are set via CSS custom properties
    // (secondary variant hover background is bgPrimary: #111620)
    expect(button.style.getPropertyValue('--btn-hover-bg')).toContain('111620');
    // textPrimary in DARK_COLORS is #f3f4f6
    expect(button.style.getPropertyValue('--btn-hover-color')).toContain('f3f4f6');
    // textTertiary in DARK_COLORS is #90959e
    expect(button.style.getPropertyValue('--btn-outline-color')).toContain('90959e');
  });

  it('renders disabled state and ensures it is styled', () => {
    render(
      <Button mode="dark" colors={DARK_COLORS} disabled>
        Disabled Button
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Disabled Button' });
    expect(button).toBeDisabled();
    expect(button.style.opacity).toBe('0.45');
    expect(button.style.cursor).toBe('not-allowed');
  });

  it('applies the correct variant class for each variant', () => {
    const { rerender } = render(<Button mode="dark" colors={DARK_COLORS} variant="primary">Primary</Button>);
    expect(screen.getByRole('button').className).toContain('ldd-btn-primary');

    rerender(<Button mode="dark" colors={DARK_COLORS} variant="danger">Danger</Button>);
    expect(screen.getByRole('button').className).toContain('ldd-btn-danger');

    rerender(<Button mode="dark" colors={DARK_COLORS} variant="dangerSolid">DangerSolid</Button>);
    expect(screen.getByRole('button').className).toContain('ldd-btn-dangerSolid');

    rerender(<Button mode="dark" colors={DARK_COLORS} variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button').className).toContain('ldd-btn-ghost');
  });
});
