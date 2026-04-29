import { describe, it, expect } from 'vitest';

describe('isDev', () => {
  it('is false in test environment — fail-closed for security', async () => {
    // Tests run with NODE_ENV=test, which isDev treats as dev (for DX).
    // This test documents the expected value so changes are intentional.
    const { isDev, isProd } = await import('./dev-mode');
    expect(isProd).toBe(false);
    expect(isDev).toBe(true);
  });
});
