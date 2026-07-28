import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Module Mocks - hoisted above all imports
// ============================================================================

vi.mock('@logto/next/server-actions', () => ({
  getLogtoContext: vi.fn(),
}));

vi.mock('../config', () => ({
  getLogtoConfig: vi.fn().mockReturnValue({}),
}));

vi.mock('../logic/actions', () => ({
  updateUserCustomData: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('../logic/log', () => ({
  warn: vi.fn(),
}));

// ============================================================================
// Imports of mocked modules (for vi.mocked usage)
// ============================================================================

import { getLogtoContext } from '@logto/next/server-actions';
import { getLogtoConfig } from '../config';
import { updateUserCustomData } from '../logic/actions';
import { warn } from '../logic/log';

// ============================================================================
// setActiveOrg tests
// ============================================================================

describe('setActiveOrg', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('persists asOrg:null via updateUserCustomData and returns { ok: true, data: true } on success', async () => {
    vi.mocked(updateUserCustomData).mockResolvedValue({ ok: true });
    const { setActiveOrg } = await import('./set-active-org');
    const result = await setActiveOrg(null);
    // Should short-circuit - no Logto call needed
    expect(result).toEqual({ ok: true, data: true });
    expect(getLogtoContext).not.toHaveBeenCalled();
    expect(updateUserCustomData).toHaveBeenCalledWith({ Preferences: { asOrg: null } });
  });

  it('returns { ok: false, error: "UPDATE_FAILED" } and logs a fixed code when orgId is null but persist fails (BUG-082, CAN-ACT-011)', async () => {
    const rawUpstreamDetail = 'network error: user record internal_db_constraint';
    vi.mocked(updateUserCustomData).mockResolvedValue({ ok: false, error: rawUpstreamDetail });
    const { setActiveOrg } = await import('./set-active-org');
    const result = await setActiveOrg(null);
    // CAN-ACT-011: the outer action overrides the inner safeAction code with
    // its own fixed code via `throw plainCode('UPDATE_FAILED')` so callers can
    // distinguish a server-side persist failure from "user not authenticated"
    // / "org membership invalid" (the pre-fix bare `false` was ambiguous).
    expect(result).toEqual({ ok: false, error: 'UPDATE_FAILED' });
    expect(getLogtoContext).not.toHaveBeenCalled();
    expect(updateUserCustomData).toHaveBeenCalledWith({ Preferences: { asOrg: null } });
    // Server-side `warn` (NOT client-gated `clientLog`) uses the fixed action
    // code. Do not trust even a nested action's envelope as log-safe input.
    expect(warn).toHaveBeenCalledWith('[setActiveOrg] null persist failed:', 'UPDATE_FAILED');
    expect(JSON.stringify(vi.mocked(warn).mock.calls)).not.toContain(rawUpstreamDetail);
  });

  it('does not let a failed best-effort warning alter the null-org persist result', async () => {
    vi.mocked(updateUserCustomData).mockResolvedValue({ ok: false, error: 'UPDATE_FAILED' });
    vi.mocked(warn).mockImplementationOnce(() => {
      throw new Error('log sink unavailable');
    });

    const { setActiveOrg } = await import('./set-active-org');

    await expect(setActiveOrg(null)).resolves.toEqual({ ok: false, error: 'UPDATE_FAILED' });
  });

  it('returns { ok: true, data: false } when the user is not authenticated', async () => {
    vi.mocked(getLogtoContext).mockResolvedValue({
      isAuthenticated: false,
      userInfo: undefined,
    } as never);

    const { setActiveOrg } = await import('./set-active-org');
    const result = await setActiveOrg('org_123');
    expect(result).toEqual({ ok: true, data: false });
  });

  it('returns { ok: true, data: true } when the org is in userInfo.organizations (live OIDC endpoint)', async () => {
    vi.mocked(getLogtoContext).mockResolvedValue({
      isAuthenticated: true,
      userInfo: { organizations: ['org_abc', 'org_def'] },
    } as never);

    const { setActiveOrg } = await import('./set-active-org');
    const result = await setActiveOrg('org_abc');
    expect(result).toEqual({ ok: true, data: true });
  });

  it('returns { ok: true, data: false } when the org is NOT in userInfo.organizations', async () => {
    vi.mocked(getLogtoContext).mockResolvedValue({
      isAuthenticated: true,
      userInfo: { organizations: ['org_abc'] },
    } as never);

    const { setActiveOrg } = await import('./set-active-org');
    const result = await setActiveOrg('org_xyz');
    expect(result).toEqual({ ok: true, data: false });
  });

  it('returns { ok: true, data: false } when userInfo.organizations is undefined (no orgs assigned yet)', async () => {
    vi.mocked(getLogtoContext).mockResolvedValue({
      isAuthenticated: true,
      userInfo: {},
    } as never);

    const { setActiveOrg } = await import('./set-active-org');
    const result = await setActiveOrg('org_123');
    expect(result).toEqual({ ok: true, data: false });
  });

  it('returns { ok: true, data: false } when userInfo itself is undefined', async () => {
    vi.mocked(getLogtoContext).mockResolvedValue({
      isAuthenticated: true,
      userInfo: undefined,
    } as never);

    const { setActiveOrg } = await import('./set-active-org');
    const result = await setActiveOrg('org_123');
    expect(result).toEqual({ ok: true, data: false });
  });

  it.each(['', '../org', 'org/123', 'org?admin=true'])('returns a validation envelope for malformed orgId %j', async (orgId) => {
    const { setActiveOrg } = await import('./set-active-org');

    await expect(setActiveOrg(orgId)).resolves.toEqual({ ok: false, error: 'INVALID_ID' });
    expect(getLogtoContext).not.toHaveBeenCalled();
  });

  it('returns a sanitized envelope when Logto context retrieval rejects', async () => {
    vi.mocked(getLogtoContext).mockRejectedValueOnce(new Error('SDK context transport failure'));
    const { setActiveOrg } = await import('./set-active-org');

    await expect(setActiveOrg('org_123')).resolves.toEqual({ ok: false, error: 'INTERNAL_ERROR' });
  });

  it('returns a sanitized envelope when Logto configuration retrieval throws', async () => {
    vi.mocked(getLogtoConfig).mockImplementationOnce(() => {
      throw new Error('SDK configuration failure');
    });
    const { setActiveOrg } = await import('./set-active-org');

    await expect(setActiveOrg('org_123')).resolves.toEqual({ ok: false, error: 'INTERNAL_ERROR' });
    expect(getLogtoContext).not.toHaveBeenCalled();
  });

  it('returns a sanitized envelope when null-mode persistence rejects', async () => {
    vi.mocked(updateUserCustomData).mockRejectedValueOnce(new Error('Account API failure'));
    const { setActiveOrg } = await import('./set-active-org');

    await expect(setActiveOrg(null)).resolves.toEqual({ ok: false, error: 'INTERNAL_ERROR' });
    expect(getLogtoContext).not.toHaveBeenCalled();
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
      claims: { organizations: [] },          // stale - empty
      userInfo: { organizations: ['org_new'] }, // live - has it
    } as never);

    const { setActiveOrg } = await import('./set-active-org');
    const result = await setActiveOrg('org_new');

    // Must return true because userInfo has the org, regardless of claims
    expect(result).toEqual({ ok: true, data: true });
  });
});
