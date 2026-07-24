import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetTokenForServerAction, mockMakeRequest, mockConfig } = vi.hoisted(() => {
  const getToken = vi.fn().mockResolvedValue('fake-token');
  const makeReq = vi.fn().mockResolvedValue({ ok: true });
  const config = {
    backendType: 'blacktop' as 'blacktop' | 'upstream',
    getBackendType: () => config.backendType,
  };
  return {
    mockGetTokenForServerAction: getToken,
    mockMakeRequest: makeReq,
    mockConfig: config,
  };
});

vi.mock('../../config', () => mockConfig);

vi.mock('./tokens', () => ({
  getTokenForServerAction: mockGetTokenForServerAction,
}));

vi.mock('./request', () => ({
  makeRequest: mockMakeRequest,
}));

import { recordHeartbeat } from './heartbeat';

describe('recordHeartbeat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.backendType = 'blacktop';
  });

  it('makes request and returns { ok: true } when backendType is blacktop', async () => {
    const result = await recordHeartbeat();
    expect(result).toEqual({ ok: true });
    expect(mockGetTokenForServerAction).toHaveBeenCalled();
    expect(mockMakeRequest).toHaveBeenCalledWith(
      '/api/my-account/sessions/heartbeat',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns { ok: true } early when backendType is upstream', async () => {
    mockConfig.backendType = 'upstream';
    const result = await recordHeartbeat();
    expect(result).toEqual({ ok: true });
    expect(mockGetTokenForServerAction).not.toHaveBeenCalled();
    expect(mockMakeRequest).not.toHaveBeenCalled();
  });

  it('returns { ok: true } when token is unavailable', async () => {
    mockGetTokenForServerAction.mockResolvedValueOnce(null);
    const result = await recordHeartbeat();
    expect(result).toEqual({ ok: true });
    expect(mockMakeRequest).not.toHaveBeenCalled();
  });

  it('returns { ok: false, error } when makeRequest throws', async () => {
    mockMakeRequest.mockRejectedValueOnce(new Error('Network error'));
    const result = await recordHeartbeat();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INTERNAL_ERROR');
    }
  });
});
