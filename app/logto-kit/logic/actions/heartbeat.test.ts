import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetTokenForServerAction, mockMakeRequest, mockConfig, mockLogEvent } = vi.hoisted(() => {
  const getToken = vi.fn().mockResolvedValue('fake-token');
  const makeReq = vi.fn().mockResolvedValue({ ok: true });
  const config = {
    backendType: 'blacktop' as 'blacktop' | 'upstream',
    getBackendType: () => config.backendType,
  };
  const logEvent = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
    raw: {},
  };
  return {
    mockGetTokenForServerAction: getToken,
    mockMakeRequest: makeReq,
    mockConfig: config,
    mockLogEvent: logEvent,
  };
});

vi.mock('../../config', () => mockConfig);

vi.mock('./tokens', () => ({
  getTokenForServerAction: mockGetTokenForServerAction,
}));

vi.mock('./request', () => ({
  makeRequest: mockMakeRequest,
}));

vi.mock('../log', () => ({
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  logEvent: mockLogEvent,
}));

import { recordHeartbeat } from './heartbeat';

/** Minimal Response-shaped object for throwOnApiError. */
const mockResponse = (status: number): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    statusText: status === 204 ? 'No Content' : `HTTP ${status}`,
    text: vi.fn().mockResolvedValue(''),
    json: vi.fn().mockResolvedValue({}),
  }) as unknown as Response;

describe('recordHeartbeat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.backendType = 'blacktop';
    mockMakeRequest.mockResolvedValue(mockResponse(204));
  });

  it('makes request and returns { ok: true } when backendType is blacktop (204)', async () => {
    const result = await recordHeartbeat();
    expect(result).toEqual({ ok: true });
    expect(mockGetTokenForServerAction).toHaveBeenCalled();
    expect(mockMakeRequest).toHaveBeenCalledWith(
      '/api/my-account/sessions/heartbeat',
      expect.objectContaining({ method: 'POST' })
    );
    expect(mockLogEvent.info).toHaveBeenCalledWith(
      expect.any(String),
      'Heartbeat recorded'
    );
  });

  it.each([
    { status: 401, expected: 'UNAUTHORIZED' },
    { status: 403, expected: 'UNAUTHORIZED' },
    { status: 404, expected: 'UPDATE_FAILED' },
    { status: 429, expected: 'UPDATE_FAILED' },
    { status: 500, expected: 'UPDATE_FAILED' },
  ])('returns { ok: false, error: $expected } and does NOT log a recorded heartbeat on HTTP $status', async ({ status, expected }) => {
    mockMakeRequest.mockResolvedValueOnce(mockResponse(status));
    const result = await recordHeartbeat();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(expected);
    }
    // The "Heartbeat recorded" success log must NOT fire on a non-2xx response.
    expect(mockLogEvent.info).not.toHaveBeenCalled();
  });

  it('returns { ok: true } early when backendType is upstream', async () => {
    mockConfig.backendType = 'upstream';
    const result = await recordHeartbeat();
    expect(result).toEqual({ ok: true });
    expect(mockGetTokenForServerAction).not.toHaveBeenCalled();
    expect(mockMakeRequest).not.toHaveBeenCalled();
  });

  it('returns { ok: true } when token is unavailable (silent skip)', async () => {
    mockGetTokenForServerAction.mockResolvedValueOnce(null);
    const result = await recordHeartbeat();
    expect(result).toEqual({ ok: true });
    expect(mockMakeRequest).not.toHaveBeenCalled();
  });

  it('returns { ok: false, error } when makeRequest rejects (transport error)', async () => {
    mockMakeRequest.mockRejectedValueOnce(new Error('Network error'));
    const result = await recordHeartbeat();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('INTERNAL_ERROR');
    }
    expect(mockLogEvent.info).not.toHaveBeenCalled();
  });
});
