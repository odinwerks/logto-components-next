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

describe('recordHeartbeat backend check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.backendType = 'blacktop';
  });

  it('makes request when backendType is blacktop', async () => {
    await recordHeartbeat();
    expect(mockGetTokenForServerAction).toHaveBeenCalled();
    expect(mockMakeRequest).toHaveBeenCalledWith(
      '/api/my-account/sessions/heartbeat',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns early (does not make request) when backendType is upstream', async () => {
    mockConfig.backendType = 'upstream';
    await recordHeartbeat();
    expect(mockGetTokenForServerAction).not.toHaveBeenCalled();
    expect(mockMakeRequest).not.toHaveBeenCalled();
  });
});
