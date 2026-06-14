import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';
import { DARK_COLORS } from '../../themes';

describe('Input Component (P-BUG-011)', () => {
  it('renders input with value and checks no inline outline:none style', () => {
    const onChange = vi.fn();
    render(
      <Input
        value="test-value"
        onChange={onChange}
        colors={DARK_COLORS}
        placeholder="Enter text..."
      />
    );

    const input = screen.getByPlaceholderText('Enter text...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('test-value');

    // The inline style "outline" should not be set to "none" (which would override focus rings in CSS)
    expect(input.style.outline).not.toBe('none');
  });
});
