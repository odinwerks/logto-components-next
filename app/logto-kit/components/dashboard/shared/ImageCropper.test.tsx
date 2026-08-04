import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ImageCropper } from './ImageCropper';
import { LIGHT_COLORS } from '../../../themes';

describe('ImageCropper Accessibility', () => {
  it('zoom-out button has aria-label="Zoom out"', () => {
    render(
      <ImageCropper
        imageUrl="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        mode="light"
        colors={LIGHT_COLORS}
      />
    );

    const zoomOut = screen.getByRole('button', { name: 'Zoom out' });
    expect(zoomOut).toBeInTheDocument();
    expect(zoomOut).toHaveAttribute('aria-label', 'Zoom out');
  });

  it('zoom-in button has aria-label="Zoom in"', () => {
    render(
      <ImageCropper
        imageUrl="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        mode="light"
        colors={LIGHT_COLORS}
      />
    );

    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
    expect(zoomIn).toBeInTheDocument();
    expect(zoomIn).toHaveAttribute('aria-label', 'Zoom in');
  });

  it('resets drag state and cursor on touch cancel', () => {
    render(
      <ImageCropper
        imageUrl="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        mode="light"
        colors={LIGHT_COLORS}
      />
    );

    const canvas = screen.getByRole('application', { name: /avatar crop position/i });
    expect(canvas).toHaveStyle({ cursor: 'grab' });

    // Simulate TouchStart to initiate drag
    const touch = { clientX: 10, clientY: 10 };
    const touchStartEvent = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [touch as unknown as Touch],
    });
    
    fireEvent(canvas, touchStartEvent);
    expect(canvas).toHaveStyle({ cursor: 'grabbing' });

    // Simulate TouchCancel to abort drag
    const touchCancelEvent = new TouchEvent('touchcancel', {
      bubbles: true,
      cancelable: true,
      touches: [],
    });
    fireEvent(canvas, touchCancelEvent);

    // After touch cancel, it should go back to default/grab
    expect(canvas).toHaveStyle({ cursor: 'grab' });
  });

  it('is focusable and clamps announced Arrow key positioning values', async () => {
    class MockImage {
      naturalWidth = 1000;
      naturalHeight = 500;
      crossOrigin: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private value = '';

      set src(value: string) {
        this.value = value;
        if (value) this.onload?.();
      }

      get src() {
        return this.value;
      }
    }

    const context = {
      clearRect: vi.fn(), drawImage: vi.fn(), save: vi.fn(), restore: vi.fn(),
      fillRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(),
      stroke: vi.fn(), setLineDash: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    vi.stubGlobal('Image', MockImage);

    try {
      render(
        <ImageCropper
          imageUrl="data:image/png;base64,avatar"
          mode="light"
          colors={LIGHT_COLORS}
        />
      );

      const canvas = screen.getByRole('application', { name: /avatar crop position/i });
      const status = screen.getByRole('status');
      expect(canvas).toHaveAttribute('tabindex', '0');
      expect(canvas).toHaveAttribute('aria-describedby');

      act(() => canvas.focus());
      expect(canvas).toHaveFocus();
      expect(canvas.style.outline).toContain('solid');

      await waitFor(() => expect(status).toHaveTextContent('horizontal centered'));
      expect(fireEvent.keyDown(canvas, { key: 'ArrowRight' })).toBe(false);
      await waitFor(() => expect(status).toHaveTextContent('horizontal 5 pixels right'));

      for (let index = 0; index < 20; index += 1) {
        fireEvent.keyDown(canvas, { key: 'ArrowRight', shiftKey: true });
      }
      await waitFor(() => expect(status).toHaveTextContent('horizontal 207 pixels right'));
    } finally {
      contextSpy.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
