import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Toast } from './Toast';
import { DARK_COLORS } from '../../../themes';
import type { ToastMessage } from '../types';

describe('Toast Component Accessibility and Functionality', () => {
  const onDismiss = vi.fn();
  const testMessage: ToastMessage = {
    id: 'test-id',
    type: 'success',
    message: 'Test success message',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
      writable: true,
      configurable: true,
    });
  });

  it('renders outer container with accessibility attributes but no onClick or pointer cursor', () => {
    const { container } = render(
      <Toast message={testMessage} onDismiss={onDismiss} mode="dark" colors={DARK_COLORS} />
    );
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveAttribute('role', 'status');
    expect(outerDiv).toHaveAttribute('aria-live', 'polite');
    
    // Check that outer styles do not have pointer cursor
    expect(outerDiv.style.cursor).not.toBe('pointer');
  });

  it('wraps the message text in a transparent, unstyled semantic <button type="button"> with aria-label and title', async () => {
    render(
      <Toast message={testMessage} onDismiss={onDismiss} mode="dark" colors={DARK_COLORS} />
    );
    const textBtn = screen.getByRole('button', { name: 'Copy message' });
    expect(textBtn).toHaveAttribute('type', 'button');
    expect(textBtn).toHaveAttribute('title', 'Click to copy');
    expect(textBtn).toHaveTextContent('Test success message');

    // Trigger click on the text button and verify clipboard.writeText was called
    await act(async () => {
      fireEvent.click(textBtn);
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test success message');
  });

  it('renders interactive controls as siblings with no nested buttons', () => {
    render(
      <Toast message={testMessage} onDismiss={onDismiss} mode="dark" colors={DARK_COLORS} />
    );

    // Get all buttons
    const buttons = screen.getAllByRole('button');
    // 1. Text button (Copy message)
    // 2. Copy control button (copy)
    // 3. Dismiss button (×)
    expect(buttons).toHaveLength(3);

    // Verify none of the buttons are descendants of other buttons
    buttons.forEach((button) => {
      let parent = button.parentElement;
      while (parent) {
        expect(parent.tagName.toLowerCase()).not.toBe('button');
        parent = parent.parentElement;
      }
    });
  });

  it('successfully triggers copy feedback when copying', async () => {
    render(
      <Toast message={testMessage} onDismiss={onDismiss} mode="dark" colors={DARK_COLORS} />
    );

    // Click the inline copy button control
    const copyControlBtn = screen.getByRole('button', { name: 'copy' });
    await act(async () => {
      fireEvent.click(copyControlBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test success message');
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });
});
