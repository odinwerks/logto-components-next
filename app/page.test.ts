import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

// Import after mocking
import HomePage from './page';

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /getting-started/pre-requisites when no auth_error param', async () => {
    const searchParams = Promise.resolve({});
    await HomePage({ searchParams });

    expect(mockRedirect).toHaveBeenCalledWith('/getting-started/pre-requisites');
    expect(mockRedirect).toHaveBeenCalledTimes(1);
  });

  it('redirects to /getting-started/pre-requisites with auth_error when present', async () => {
    const searchParams = Promise.resolve({ auth_error: 'access_denied' });
    await HomePage({ searchParams });

    expect(mockRedirect).toHaveBeenCalledWith(
      '/getting-started/pre-requisites?auth_error=access_denied'
    );
    expect(mockRedirect).toHaveBeenCalledTimes(1);
  });

  it('encodes special characters in auth_error', async () => {
    const searchParams = Promise.resolve({ auth_error: 'error with spaces&special=chars' });
    await HomePage({ searchParams });

    expect(mockRedirect).toHaveBeenCalledWith(
      '/getting-started/pre-requisites?auth_error=error%20with%20spaces%26special%3Dchars'
    );
    expect(mockRedirect).toHaveBeenCalledTimes(1);
  });

  it('handles undefined auth_error same as missing', async () => {
    const searchParams = Promise.resolve({ auth_error: undefined });
    await HomePage({ searchParams });

    expect(mockRedirect).toHaveBeenCalledWith('/getting-started/pre-requisites');
    expect(mockRedirect).toHaveBeenCalledTimes(1);
  });

  it('handles empty string auth_error same as missing', async () => {
    const searchParams = Promise.resolve({ auth_error: '' });
    await HomePage({ searchParams });

    expect(mockRedirect).toHaveBeenCalledWith('/getting-started/pre-requisites');
    expect(mockRedirect).toHaveBeenCalledTimes(1);
  });
});
