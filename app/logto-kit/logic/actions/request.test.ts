import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies for the valid-path test case
vi.mock('./tokens', () => ({
  getTokenForServerAction: vi.fn().mockResolvedValue('mock-token'),
}));

vi.mock('../utils', () => ({
  getCleanEndpoint: vi.fn().mockReturnValue('https://auth.example.org'),
}));

import { makeRequest } from './request';

describe('makeRequest - path guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.mocked(globalThis.fetch).mockRestore?.();
  });

  // ── Valid paths ───────────────────────────────────────────────────────────

  it('allows valid /api/ paths', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    const result = await makeRequest('/api/my-account');

    expect(result.status).toBe(200);
  });

  // ── BUG-011: query-parameter smuggling ────────────────────────────────────

  it('rejects paths with query parameters (?)', async () => {
    await expect(makeRequest('/api/my-account?extra_param=evil')).rejects.toThrow(
      'Invalid API path'
    );
  });

  it('rejects paths with fragments (#)', async () => {
    await expect(makeRequest('/api/my-account#fragment')).rejects.toThrow(
      'Invalid API path'
    );
  });

  it('rejects paths with double slashes (//)', async () => {
    await expect(makeRequest('/api//my-account')).rejects.toThrow(
      'Invalid API path'
    );
  });

  // ── Existing guards ───────────────────────────────────────────────────────

  it('rejects paths with path traversal (..)', async () => {
    await expect(makeRequest('/api/../admin')).rejects.toThrow('Invalid API path');
  });

  it('rejects paths not starting with /api/', async () => {
    await expect(makeRequest('/admin')).rejects.toThrow('Invalid API path');
    await expect(makeRequest('//api/evil')).rejects.toThrow('Invalid API path');
  });
});

  // ── BUG-003: Session password entry spins eternally - missing fetch timeout ───

  it('passes a default AbortSignal.timeout when no signal option is provided', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    await makeRequest('/api/my-account');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('uses the caller-provided signal instead of a default timeout', async () => {
    const controller = new AbortController();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    await makeRequest('/api/my-account', { signal: controller.signal });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        signal: controller.signal,
      })
    );
  });
