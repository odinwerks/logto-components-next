import { describe, expect, it, vi } from 'vitest';
import HomePage from './page';
import { redirect } from 'next/navigation';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('HomePage', () => {
  it('redirects to /getting-started/pre-requisites', async () => {
    await HomePage();
    expect(redirect).toHaveBeenCalledWith('/getting-started/pre-requisites');
  });
});
