import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  it('supports label association with id prop', () => {
    const onChange = vi.fn();
    render(
      <div>
        <label htmlFor="test-input">Test Label</label>
        <Input
          id="test-input"
          value="test-value"
          onChange={onChange}
          colors={DARK_COLORS}
        />
      </div>
    );

    const input = screen.getByLabelText('Test Label');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'test-input');
  });

  it('spreads standard input props onto the underlying input', () => {
    const onChange = vi.fn();
    render(
      <Input
        value="test"
        onChange={onChange}
        colors={DARK_COLORS}
        data-testid="custom-input"
        disabled
        readOnly
      />
    );

    const input = screen.getByTestId('custom-input');
    expect(input).toBeInTheDocument();
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('readonly');
  });
});
