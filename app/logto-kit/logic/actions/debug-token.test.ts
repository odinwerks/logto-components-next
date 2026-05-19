import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Module Mocks — hoisted above all imports
// ============================================================================

vi.mock('server-only', () => ({}));

const mockToken = vi.fn<() => Promise<string>>();

vi.mock('./tokens', () => ({
  getTokenForServerAction: mockToken,
}));

// ============================================================================
// Tests
// ============================================================================

describe('getCurrentAccessToken', () => {
  beforeEach(() => {
    vi.stubEnv('LOGTO_DANGER_EXPOSE_TOKEN', '');
    mockToken.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null when LOGTO_DANGER_EXPOSE_TOKEN is not set', async () => {
    const { getCurrentAccessToken } = await import('./debug-token');
    const result = await getCurrentAccessToken();
    expect(result).toBeNull();
  });

  it('returns null when LOGTO_DANGER_EXPOSE_TOKEN is empty string', async () => {
    vi.stubEnv('LOGTO_DANGER_EXPOSE_TOKEN', '');
    const { getCurrentAccessToken } = await import('./debug-token');
    const result = await getCurrentAccessToken();
    expect(result).toBeNull();
  });

  it('returns null when LOGTO_DANGER_EXPOSE_TOKEN is "false"', async () => {
    vi.stubEnv('LOGTO_DANGER_EXPOSE_TOKEN', 'false');
    const { getCurrentAccessToken } = await import('./debug-token');
    const result = await getCurrentAccessToken();
    expect(result).toBeNull();
  });

  it('returns the token when LOGTO_DANGER_EXPOSE_TOKEN is "true"', async () => {
    vi.stubEnv('LOGTO_DANGER_EXPOSE_TOKEN', 'true');
    mockToken.mockResolvedValue('test-access-token-123');
    const { getCurrentAccessToken } = await import('./debug-token');
    const result = await getCurrentAccessToken();
    expect(result).toBe('test-access-token-123');
  });

  it('returns null when getTokenForServerAction throws', async () => {
    vi.stubEnv('LOGTO_DANGER_EXPOSE_TOKEN', 'true');
    mockToken.mockRejectedValue(new Error('API failure'));
    const { getCurrentAccessToken } = await import('./debug-token');
    const result = await getCurrentAccessToken();
    expect(result).toBeNull();
  });
});
