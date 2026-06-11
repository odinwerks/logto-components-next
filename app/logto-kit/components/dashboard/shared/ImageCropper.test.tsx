import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
