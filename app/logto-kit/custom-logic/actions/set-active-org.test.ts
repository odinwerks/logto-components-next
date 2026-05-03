import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Module Mocks — hoisted above all imports
// ============================================================================

vi.mock('@logto/next/server-actions', () => ({
  getLogtoContext: vi.fn(),
}));

vi.mock('../../../logto', () => ({
  getLogtoConfig: vi.fn().mockReturnValue({}),
}));

// ============================================================================
// Imports of mocked modules (for vi.mocked usage)
// ============================================================================

import { getLogtoContext } from '@logto/next/server-actions';

// ============================================================================
// setActiveOrg tests
// ============================================================================

describe('setActiveOrg', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns true immediately when orgId is null (clear-org shortcut)', async () => {
    const { setActiveOrg } = await import('./set-active-org');
    const result = await setActiveOrg(null);
    // Should short-circuit — no Logto call needed
    expect(result).toBe(true);
    expect(getLogtoContext).not.toHaveBeenCalled();
  });

  it('returns false when the user is not authenticated', async () => {
    vi.mocked(getLogtoContext).mockResolvedValue({
      isAuthenticated: false,
      userInfo: undefined,
    } as never);

    const { setActiveOrg } = await import('./set-active-org');
    const result = await setActiveOrg('org_123');
    expect(result).toBe(false);
  });

  it('returns true when the org is in userInfo.organizations (live OIDC endpoint)', async () => {
    vi.mocked(getLogtoContext).mockResolvedValue({
      isAuthenticated: true,
      userInfo: { organizations: ['org_abc', 'org_def'] },
    } as never);

    const { setActiveOrg } = await import('./set-active-org');
    const result = await setActiveOrg('org_abc');
    expect(result).toBe(true);
  });

  it('returns false when the org is NOT in userInfo.organizations', async () => {
    vi.mocked(getLogtoContext).mockResolvedValue({
      isAuthenticated: true,
      userInfo: { organizations: ['org_abc'] },
    } as never);

    const { setActiveOrg } = await import('./set-active-org');
    const result = await setActiveOrg('org_xyz');
    expect(result).toBe(false);
  });

  it('returns false when userInfo.organizations is undefined (no orgs assigned yet)', async () => {
    vi.mocked(getLogtoContext).mockResolvedValue({
      isAuthenticated: true,
      userInfo: {},
    } as never);

    const { setActiveOrg } = await import('./set-active-org');
    const result = await setActiveOrg('org_123');
    expect(result).toBe(false);
  });

  it('returns false when userInfo itself is undefined', async () => {
    vi.mocked(getLogtoContext).mockResolvedValue({
      isAuthenticated: true,
      userInfo: undefined,
    } as never);

    const { setActiveOrg } = await import('./set-active-org');
    const result = await setActiveOrg('org_123');
    expect(result).toBe(false);
  });

  it('calls getLogtoContext with fetchUserInfo: true to get live org list', async () => {
    vi.mocked(getLogtoContext).mockResolvedValue({
      isAuthenticated: true,
      userInfo: { organizations: ['org_123'] },
    } as never);

    const { setActiveOrg } = await import('./set-active-org');
    await setActiveOrg('org_123');

    expect(getLogtoContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fetchUserInfo: true })
    );
  });

  it('does NOT read claims.organizations (old stale-JWT path no longer used)', async () => {
    // Simulate a scenario where claims.organizations is empty (stale token)
    // but userInfo.organizations has the new org (post-login assignment)
    vi.mocked(getLogtoContext).mockResolvedValue({
      isAuthenticated: true,
      claims: { organizations: [] },          // stale — empty
      userInfo: { organizations: ['org_new'] }, // live — has it
    } as never);

    const { setActiveOrg } = await import('./set-active-org');
    const result = await setActiveOrg('org_new');

    // Must return true because userInfo has the org, regardless of claims
    expect(result).toBe(true);
  });
});
