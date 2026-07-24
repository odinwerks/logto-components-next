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

  // ── BUG-051: percent-encoded path traversal ──────────────────────────────

  it('rejects paths with percent-encoded traversal (%2e%2e)', async () => {
    await expect(makeRequest('/api/%2e%2e/admin')).rejects.toThrow('Invalid API path');
  });

  it('rejects mixed-case percent-encoded traversal (%2E%2E)', async () => {
    await expect(makeRequest('/api/%2E%2E/admin')).rejects.toThrow('Invalid API path');
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

  // ── BUG-025: extraHeaders must not override protected headers ─────────────

  it('prevents extraHeaders from overriding the Authorization header', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    await makeRequest('/api/my-account', {
      extraHeaders: { Authorization: 'Bearer evil-token' },
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token',
        }),
      })
    );
  });

  it('prevents extraHeaders from overriding the Content-Type header', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    await makeRequest('/api/my-account', {
      method: 'POST',
      body: { key: 'value' },
      extraHeaders: { 'Content-Type': 'text/plain' },
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });
