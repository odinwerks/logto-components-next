import { describe, expect, it, vi, beforeEach } from 'vitest';
import HomePage from './page';
import { redirect } from 'next/navigation';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /getting-started/pre-requisites', async () => {
    await HomePage({ searchParams: Promise.resolve({}) });
    expect(redirect).toHaveBeenCalledWith('/getting-started/pre-requisites');
  });

  it('preserves auth_error query param through redirect', async () => {
    await HomePage({ searchParams: Promise.resolve({ auth_error: 'access_denied' }) });
    expect(redirect).toHaveBeenCalledWith(
      '/getting-started/pre-requisites?auth_error=access_denied'
    );
  });

  it('encodes special characters in auth_error', async () => {
    await HomePage({ searchParams: Promise.resolve({ auth_error: 'invalid request&foo' }) });
    expect(redirect).toHaveBeenCalledWith(
      '/getting-started/pre-requisites?auth_error=invalid%20request%26foo'
    );
  });

  it('ignores empty auth_error and redirects normally', async () => {
    await HomePage({ searchParams: Promise.resolve({ auth_error: '' }) });
    expect(redirect).toHaveBeenCalledWith('/getting-started/pre-requisites');
  });
});
