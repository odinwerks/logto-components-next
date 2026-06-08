import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@logto/next/server-actions', () => ({
  getAccessToken: vi.fn(),
}));

vi.mock('../../config', () => ({
  getLogtoConfig: vi.fn(),
}));

import { getAccessToken } from '@logto/next/server-actions';
import { getLogtoConfig } from '../../config';
import { getFreshAccessToken, getTokenForServerAction } from './tokens';

const mockLogtoConfig = {
  appId: 'mock-app-id',
  appSecret: 'mock-app-secret',
  endpoint: 'https://auth.example.org',
  baseUrl: 'http://localhost:3000',
  cookieSecret: 'mock-cookie-secret',
  cookieSecure: false,
  resources: ['urn:logto:resource:organizations'],
  scopes: ['openid'],
};

describe('token server-action helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLogtoConfig).mockReturnValue(mockLogtoConfig);
  });

  it('calls getAccessToken with only the Logto config and returns token', async () => {
    vi.mocked(getAccessToken).mockResolvedValue('account-api-token');

    await expect(getTokenForServerAction()).resolves.toBe('account-api-token');

    expect(getAccessToken).toHaveBeenCalledTimes(1);
    expect(getAccessToken).toHaveBeenCalledWith(mockLogtoConfig);
    expect(vi.mocked(getAccessToken).mock.calls[0]).toHaveLength(1);
  });

  it('throws when no account API access token is available', async () => {
    vi.mocked(getAccessToken).mockResolvedValue('');

    await expect(getTokenForServerAction()).rejects.toThrow('No access token available for Account API');
  });

  it('getFreshAccessToken delegates to the same canonical token fetch behavior', async () => {
    vi.mocked(getAccessToken).mockResolvedValue('fresh-token');

    await expect(getFreshAccessToken()).resolves.toBe('fresh-token');

    expect(getAccessToken).toHaveBeenCalledWith(mockLogtoConfig);
    expect(vi.mocked(getAccessToken).mock.calls[0]).toHaveLength(1);
  });
});
