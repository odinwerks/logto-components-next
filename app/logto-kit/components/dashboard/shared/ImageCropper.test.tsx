import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

    const canvas = screen.getByRole('img', { name: /image cropper canvas/i });
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
});
