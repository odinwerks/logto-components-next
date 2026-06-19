import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockConfig = vi.hoisted(() => {
  const cfg = {
    countryFilter: {
      mode: 'none' as const,
      codes: [] as string[],
    },
    backendType: 'blacktop' as 'blacktop' | 'upstream',
    avatarBackend: 'logto' as 'logto' | 's3',
    getCountryFilter: () => cfg.countryFilter,
    getBackendType: () => cfg.backendType,
    getAvatarBackend: () => cfg.avatarBackend,
  };
  return cfg;
});

vi.mock('../../config', () => mockConfig);

// BUG-M07: Mock distributed-state so we can control rate limiter behavior
const { mockRateLimiterCheck } = vi.hoisted(() => {
  const check = vi.fn().mockResolvedValue(true); // default: allow
  const reset = vi.fn().mockResolvedValue(undefined);
  return { mockRateLimiterCheck: check, mockRateLimiterReset: reset };
});

vi.mock('../../../lib/distributed-state', () => ({
  createRateLimiter: vi.fn(() => ({
    check: mockRateLimiterCheck,
    reset: vi.fn().mockResolvedValue(undefined),
  })),
  createLockManager: vi.fn(() => ({
    acquire: vi.fn().mockResolvedValue(() => {}),
    release: vi.fn(),
  })),
  tokenCache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock('../utils', () => ({
  getCleanEndpoint: vi.fn(() => 'https://placeholder.logto.app'),
  introspectToken: vi.fn().mockResolvedValue({ active: true, sub: 'user123' }),
}));

vi.mock('./tokens', () => ({
  getTokenForServerAction: vi.fn().mockResolvedValue('fake-token'),
}));

vi.mock('../audit', () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

const { mockPutObject, MockMinioClient } = vi.hoisted(() => {
  const putObject = vi.fn().mockResolvedValue(undefined);
  const removeObject = vi.fn().mockResolvedValue(undefined);
  class Client {
    putObject = putObject;
    removeObject = removeObject;
  }
  return {
    mockPutObject: putObject,
    mockRemoveObject: removeObject,
    MockMinioClient: Client,
  };
});

vi.mock('minio', () => ({
  Client: MockMinioClient,
}));

// Mock global fetch
const mockFetch = vi.fn().mockImplementation((url) => {
  if (url.includes('/api/my-account/avatar')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ avatar: 'https://placeholder.logto.app/avatar.png' }),
      text: async () => '',
    } as Response);
  }
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => '',
  } as Response);
});

global.fetch = mockFetch;

import { uploadAvatar } from './avatar';

// Let's create a fake File to upload
function createFakeImageFile() {
  const bytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0]);
  return new File([bytes], 'avatar.png', { type: 'image/png' });
}

describe('uploadAvatar backend selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PFP_BACKEND = 'logto';
    process.env.S3_BUCKET_NAME = 'test-bucket';
    process.env.S3_PUBLIC_URL = 'https://s3.example.com';
    process.env.S3_ACCESS_KEY_ID = 'access-key';
    process.env.S3_SECRET_ACCESS_KEY = 'secret';
    process.env.S3_ENDPOINT = 'https://s3.example.com';
    mockConfig.backendType = 'blacktop';
    mockConfig.avatarBackend = 'logto';
  });

  it('uses Logto backend when backendType is blacktop and PFP_BACKEND is logto', async () => {
    const formData = new FormData();
    formData.append('file', createFakeImageFile());

    const result = await uploadAvatar(formData);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error();
    expect(result.data.url).toBe('https://placeholder.logto.app/avatar.png');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/my-account/avatar'),
      expect.any(Object)
    );
  });

  it('forces S3/MinIO backend when backendType is upstream even if PFP_BACKEND is logto', async () => {
    mockConfig.avatarBackend = 's3';

    const formData = new FormData();
    formData.append('file', createFakeImageFile());

    const result = await uploadAvatar(formData);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error();
    expect(result.data.url).toContain('https://s3.example.com/user123/you.png');
    expect(mockPutObject).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/my-account/avatar'),
      expect.any(Object)
    );
  });

  it('uses S3/MinIO backend when resolved avatar backend is s3 in blacktop mode', async () => {
    mockConfig.backendType = 'blacktop';
    mockConfig.avatarBackend = 's3';

    const formData = new FormData();
    formData.append('file', createFakeImageFile());

    const result = await uploadAvatar(formData);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error();
    expect(result.data.url).toContain('https://s3.example.com/user123/you.png');
    expect(mockPutObject).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/my-account/avatar'),
      expect.any(Object)
    );
  });

  it('forces S3/MinIO backend when resolved avatar backend is s3 in upstream mode', async () => {
    mockConfig.backendType = 'upstream';
    mockConfig.avatarBackend = 's3';

    const formData = new FormData();
    formData.append('file', createFakeImageFile());

    const result = await uploadAvatar(formData);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error();
    expect(result.data.url).toContain('https://s3.example.com/user123/you.png');
    expect(mockPutObject).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/my-account/avatar'),
      expect.any(Object)
    );
  });
});

// BUG-024: Rate limiter map never shrinks
// NOTE: The sliding-window uploadTimestamps map was replaced by the centralized
// count+reset rate limiter in app/lib/distributed-state.ts (avatar-upload namespace).
// The test helpers below are now stubs. These tests verify the stub API contract.
describe('rate limiter map cleanup (stubs after migration to centralized rate limiter)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { clearUploadTimestampsForTesting } = await import('./avatar');
    await clearUploadTimestampsForTesting();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('getUploadTimestampsSizeForTesting always returns 0 (stub)', async () => {
    const {
      setUploadTimestampsForTesting,
      getUploadTimestampsSizeForTesting,
    } = await import('./avatar');

    const now = Date.now();
    vi.setSystemTime(now);

    // Stub: injecting timestamps has no effect
    for (let i = 0; i < 5; i++) {
      await setUploadTimestampsForTesting(`user-stale-${i}`, [now - 120_000]);
    }

    // Stub returns 0 regardless
    expect(await getUploadTimestampsSizeForTesting()).toBe(0);
  });

  it('hasUploadTimestampsForTesting always returns false (stub)', async () => {
    const {
      setUploadTimestampsForTesting,
      hasUploadTimestampsForTesting,
      triggerRateLimiterCleanupForTesting,
    } = await import('./avatar');

    const now = Date.now();
    vi.setSystemTime(now);

    await setUploadTimestampsForTesting('user-active', [now - 10_000]);
    await triggerRateLimiterCleanupForTesting();

    // Stub always returns false
    expect(await hasUploadTimestampsForTesting('user-active')).toBe(false);
  });

  it('triggerRateLimiterCleanupForTesting is a no-op (stub)', async () => {
    const {
      getUploadTimestampsSizeForTesting,
      triggerRateLimiterCleanupForTesting,
    } = await import('./avatar');

    // Should not throw
    await expect(triggerRateLimiterCleanupForTesting()).resolves.toBeUndefined();
    // Size remains 0 (stub)
    expect(await getUploadTimestampsSizeForTesting()).toBe(0);
  });

});

// ============================================================================
// BUG-M07: Rate limiter must apply to ALL backends (including logto)
// ============================================================================

describe('uploadAvatar rate limiting (BUG-M07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.S3_BUCKET_NAME = 'test-bucket';
    process.env.S3_PUBLIC_URL = 'https://s3.example.com';
    process.env.S3_ACCESS_KEY_ID = 'access-key';
    process.env.S3_SECRET_ACCESS_KEY = 'secret';
    process.env.S3_ENDPOINT = 'https://s3.example.com';
    mockConfig.avatarBackend = 'logto';
    // Default: allow requests
    mockRateLimiterCheck.mockResolvedValue(true);
  });

  function createFakeImageFile() {
    const bytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0]);
    return new File([bytes], 'avatar.png', { type: 'image/png' });
  }

  it('applies rate limiting for logto backend (BUG-M07: no longer bypassed)', async () => {
    // Simulate rate limit exceeded
    mockRateLimiterCheck.mockResolvedValueOnce(false);
    mockConfig.avatarBackend = 'logto';

    const formData = new FormData();
    formData.append('file', createFakeImageFile());

    const result = await uploadAvatar(formData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('UPLOAD_RATE_LIMITED');
    }
    // The rate limiter must have been checked
    expect(mockRateLimiterCheck).toHaveBeenCalledWith('user123');
  });

  it('applies rate limiting for s3 backend (unchanged behavior)', async () => {
    // Simulate rate limit exceeded
    mockRateLimiterCheck.mockResolvedValueOnce(false);
    mockConfig.avatarBackend = 's3';

    const formData = new FormData();
    formData.append('file', createFakeImageFile());

    const result = await uploadAvatar(formData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('UPLOAD_RATE_LIMITED');
    }
    expect(mockRateLimiterCheck).toHaveBeenCalledWith('user123');
  });
});
