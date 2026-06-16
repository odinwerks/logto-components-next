import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock next/font/google
vi.mock('next/font/google', () => ({
  IBM_Plex_Mono: () => ({ className: 'ibm-plex-mono', style: {}, variable: 'ibm-plex-mono-var' }),
  Instrument_Serif: () => ({ className: 'instrument-serif', style: {}, variable: 'instrument-serif-var' }),
  DM_Sans: () => ({ className: 'dm-sans', style: {}, variable: 'dm-sans-var' }),
}));

import GlobalError from './global-error';

describe('GlobalError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders html and body tags with error message', () => {
    const error = new Error('Test global rendering crash');
    const reset = vi.fn();

    render(<GlobalError error={error} reset={reset} />);

    expect(screen.getByText('Test global rendering crash')).toBeInTheDocument();
    expect(screen.getByText(/Render Error/i)).toBeInTheDocument();
  });

  it('renders digest hash if available', () => {
    const error = new Error('Database connection failed');
    (error as unknown as { digest: string }).digest = 'ERR_DB_12345';
    const reset = vi.fn();

    render(<GlobalError error={error} reset={reset} />);

    expect(screen.getByText(/digest:/i)).toBeInTheDocument();
    expect(screen.getByText('ERR_DB_12345')).toBeInTheDocument();
  });

  it('calls reset when Try Again button is clicked', () => {
    const error = new Error('ChunkLoadError');
    const reset = vi.fn();

    render(<GlobalError error={error} reset={reset} />);

    const tryAgainBtn = screen.getByRole('button', { name: /try again/i });
    expect(tryAgainBtn).toBeInTheDocument();

    fireEvent.click(tryAgainBtn);
    expect(reset).toHaveBeenCalledOnce();
  });

  it('logs the error to console.error', () => {
    const error = new Error('Crash in root layout');
    const reset = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<GlobalError error={error} reset={reset} />);

    expect(consoleSpy).toHaveBeenCalledWith('[GlobalError] Crash inside root layout:', error);
    consoleSpy.mockRestore();
  });
});
