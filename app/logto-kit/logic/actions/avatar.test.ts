import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const { mockPutObject, mockRemoveObject, MockMinioClient } = vi.hoisted(() => {
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
