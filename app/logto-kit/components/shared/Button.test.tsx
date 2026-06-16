import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';
import { DARK_COLORS } from '../../themes';

describe('Button Component (P-BUG-008)', () => {
  it('renders children and injects CSS-based hover styles to prevent touchscreen sticky hover', () => {
    const { container } = render(
      <Button mode="dark" colors={DARK_COLORS}>
        Test Button
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Test Button' });
    expect(button).toBeInTheDocument();

    // Verify base style is applied inline
    // (secondary variant has background color of bgTertiary)
    expect(button.style.background).toBe('rgb(23, 28, 42)');

    // Verify that a <style> tag containing CSS hover/focus-visible rules is injected
    const styleTags = container.getElementsByTagName('style');
    expect(styleTags.length).toBeGreaterThan(0);
    const styleContent = styleTags[0].textContent;

    // Check that style content has hover rule targeting the button class with the hover background (bgPrimary: #111620)
    expect(styleContent).toContain(':hover');
    expect(styleContent).toContain('#111620');
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
});
