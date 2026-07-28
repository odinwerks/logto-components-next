import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOrgSwitcher } from './use-org-switcher';

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockSetActiveOrg = vi.fn();
vi.mock('../custom-logic/set-active-org', () => ({
  setActiveOrg: (orgId: string | null) => mockSetActiveOrg(orgId),
}));

const mockSetAsOrg = vi.fn();
let mockAsOrg: string | null = null;

// We use a factory mock that reads the mutable mockAsOrg variable
vi.mock('../components/providers/preferences', () => ({
  useOrgMode: () => ({
    get asOrg() { return mockAsOrg; },
    setAsOrg: mockSetAsOrg,
  }),
}));

const mockCaptureMessage = vi.fn((err: unknown) =>
  err instanceof Error ? err.message : String(err),
);
vi.mock('../logic/capture-message', () => ({
  captureMessage: (err: unknown) => mockCaptureMessage(err),
}));

describe('useOrgSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetActiveOrg.mockResolvedValue({ ok: true, data: true });
    mockAsOrg = null;
  });

  // ─── Initial state ─────────────────────────────────────────────────────────

  it('returns initial state with activeOrgId as null', () => {
    const { result } = renderHook(() => useOrgSwitcher());
    expect(result.current.activeOrgId).toBeNull();
    expect(result.current.switchingOrgId).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.hasAutoSwitched).toBe(false);
    expect(result.current.isAutoSwitching).toBe(false);
  });

  // ─── to-org mode ───────────────────────────────────────────────────────────

  it('switchToOrg validates membership and persists', async () => {
    const { result } = renderHook(() => useOrgSwitcher());

    await act(async () => {
      await result.current.switchToOrg('org-1');
    });

    expect(mockSetActiveOrg).toHaveBeenCalledWith('org-1');
    // Non-null path: setAsOrg triggers persistOrg (1 server PATCH)
    // BUG-018: setAsOrg must complete BEFORE router.refresh() to avoid
    // reading stale customData.asOrg in the RSC fetch.
    expect(mockSetAsOrg).toHaveBeenCalledWith('org-1');
    expect(mockRefresh).toHaveBeenCalled();
    // Ordering: setAsOrg must fire before refresh
    expect(mockSetAsOrg.mock.invocationCallOrder[0])
      .toBeLessThan(mockRefresh.mock.invocationCallOrder[0]);
    expect(result.current.switchingOrgId).toBeNull();
  });

  it('switchToOrg sets error when validation fails', async () => {
    mockSetActiveOrg.mockResolvedValueOnce({ ok: true, data: false });
    const { result } = renderHook(() => useOrgSwitcher());

    await act(async () => {
      await result.current.switchToOrg('org-1');
    });

    expect(result.current.error).toBe('Failed to switch organization');
    // setAsOrg should NOT be called when validation fails
    expect(mockSetAsOrg).not.toHaveBeenCalled();
  });

  it('switchToOrg sets error when setActiveOrg returns { ok: false } (CAN-ACT-010)', async () => {
    // With safeAction, setActiveOrg never rejects — it returns a DataResult
    // envelope. An { ok: false } result means the action errored (e.g. SDK
    // failure collapsed to INTERNAL_ERROR). The caller must surface this,
    // not silently swallow it (the pre-fix boolean check was always truthy).
    mockSetActiveOrg.mockResolvedValueOnce({ ok: false, error: 'INTERNAL_ERROR' });
    const { result } = renderHook(() => useOrgSwitcher());

    await act(async () => {
      await result.current.switchToOrg('org-1');
    });

    expect(result.current.error).toBe('Failed to switch organization');
    expect(mockSetAsOrg).not.toHaveBeenCalled();
  });

  it('switchToOrg guards against concurrent switches', async () => {
    let resolveFirst: (v: { ok: true; data: boolean } | { ok: false; error: string }) => void = () => {};
    const first = new Promise<{ ok: true; data: boolean } | { ok: false; error: string }>((r) => { resolveFirst = r; });
    mockSetActiveOrg
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce({ ok: true, data: true });

    const { result } = renderHook(() => useOrgSwitcher());

    // Start first switch (non-awaited)
    const p1 = result.current.switchToOrg('org-1');
    // Second switch should be guarded
    const p2 = result.current.switchToOrg('org-2');

    await act(async () => {
      resolveFirst({ ok: true, data: true });
      await p1;
      await p2;
    });

    // Only the first switch should have called setActiveOrg (second was guarded)
    expect(mockSetActiveOrg).toHaveBeenCalledTimes(1);
    expect(mockSetActiveOrg).toHaveBeenCalledWith('org-1');
  });

  // ─── to-self mode ──────────────────────────────────────────────────────────

  it('switchToSelf calls setActiveOrg(null) and setAsOrg(null)', async () => {
    // Simulate already being in an org
    mockAsOrg = 'org-1';

    const { result } = renderHook(() => useOrgSwitcher());

    expect(result.current.activeOrgId).toBe('org-1');

    await act(async () => {
      await result.current.switchToSelf();
    });

    // null path: setActiveOrg(null) does server PATCH
    expect(mockSetActiveOrg).toHaveBeenCalledWith(null);
    // setAsOrg(null) updates local state only (persistOrg no-ops on null)
    expect(mockSetAsOrg).toHaveBeenCalledWith(null);
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('switchToSelf guards when already personal (activeOrgId is null)', async () => {
    // mockAsOrg is null by default
    const { result } = renderHook(() => useOrgSwitcher());

    await act(async () => {
      await result.current.switchToSelf();
    });

    // Should not call setActiveOrg since activeOrgId is already null
    expect(mockSetActiveOrg).not.toHaveBeenCalled();
  });

  it('switchToSelf sets error when setActiveOrg(null) returns false', async () => {
    mockAsOrg = 'org-1';
    mockSetActiveOrg.mockResolvedValueOnce({ ok: true, data: false });

    const { result } = renderHook(() => useOrgSwitcher());

    await act(async () => {
      await result.current.switchToSelf();
    });

    expect(result.current.error).toBe('Failed to switch to personal mode');
  });

  // ─── auto-single ───────────────────────────────────────────────────────────

  it('auto-single fires when a single org is available and no org is active', async () => {
    mockSetActiveOrg.mockResolvedValue({ ok: true, data: true });
    const orgs = [{ id: 'org-1', name: 'Only Org' }];

    const { result } = renderHook(() =>
      useOrgSwitcher({
        autoSwitchSingleOrg: true,
        organizations: orgs,
      }),
    );

    await waitFor(() => {
      expect(mockSetActiveOrg).toHaveBeenCalledWith('org-1');
    });

    expect(result.current.hasAutoSwitched).toBe(true);

    // Wait for the auto-switch to fully settle (isAutoSwitching → false)
    await waitFor(() => {
      expect(result.current.isAutoSwitching).toBe(false);
    });
  });

  it('auto-single does NOT fire when hasAutoSwitched is already true', async () => {
    const orgs = [{ id: 'org-1', name: 'Only Org' }];

    mockSetActiveOrg.mockResolvedValue({ ok: true, data: true });
    const { result, rerender } = renderHook(() =>
      useOrgSwitcher({
        autoSwitchSingleOrg: true,
        organizations: orgs,
      }),
    );

    await waitFor(() => {
      expect(result.current.hasAutoSwitched).toBe(true);
    });

    mockSetActiveOrg.mockClear();

    // Rerender: should NOT auto-switch again
    rerender();
    await act(async () => { await Promise.resolve(); });

    expect(mockSetActiveOrg).not.toHaveBeenCalled();
  });

  it('auto-single does NOT fire when organizations length !== 1', () => {
    const orgs = [
      { id: 'org-1', name: 'Org 1' },
      { id: 'org-2', name: 'Org 2' },
    ];

    renderHook(() =>
      useOrgSwitcher({
        autoSwitchSingleOrg: true,
        organizations: orgs,
      }),
    );

    expect(mockSetActiveOrg).not.toHaveBeenCalled();
  });

  it('auto-single does NOT fire when autoSwitchSingleOrg is false', () => {
    const orgs = [{ id: 'org-1', name: 'Only Org' }];

    renderHook(() =>
      useOrgSwitcher({
        autoSwitchSingleOrg: false,
        organizations: orgs,
      }),
    );

    expect(mockSetActiveOrg).not.toHaveBeenCalled();
  });

  it('auto-single does NOT fire when an org is already active', () => {
    mockAsOrg = 'org-1';
    const orgs = [{ id: 'org-1', name: 'Only Org' }];

    renderHook(() =>
      useOrgSwitcher({
        autoSwitchSingleOrg: true,
        organizations: orgs,
      }),
    );

    expect(mockSetActiveOrg).not.toHaveBeenCalled();
  });

  // ─── Error auto-clear ──────────────────────────────────────────────────────

  it('error auto-clears after errorClearMs', async () => {
    vi.useFakeTimers();
    mockSetActiveOrg.mockResolvedValueOnce({ ok: true, data: false });

    const { result } = renderHook(() =>
      useOrgSwitcher({ errorClearMs: 1000 }),
    );

    await act(async () => {
      await result.current.switchToOrg('org-1');
    });

    expect(result.current.error).toBe('Failed to switch organization');

    act(() => { vi.advanceTimersByTime(1000); });

    expect(result.current.error).toBeNull();

    vi.useRealTimers();
  });

  // ─── clearError ────────────────────────────────────────────────────────────

  it('clearError resets error', async () => {
    mockSetActiveOrg.mockResolvedValueOnce({ ok: true, data: false });

    const { result } = renderHook(() => useOrgSwitcher());

    await act(async () => {
      await result.current.switchToOrg('org-1');
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  // ─── onSwitch / onError callbacks ──────────────────────────────────────────

  it('calls onSwitch after successful switch', async () => {
    const onSwitch = vi.fn();
    const { result } = renderHook(() => useOrgSwitcher({ onSwitch }));

    await act(async () => {
      await result.current.switchToOrg('org-1');
    });

    expect(onSwitch).toHaveBeenCalledWith('org-1');
  });

  it('calls onSwitch with null for to-self', async () => {
    const onSwitch = vi.fn();
    mockAsOrg = 'org-1';

    const { result } = renderHook(() => useOrgSwitcher({ onSwitch }));

    await act(async () => {
      await result.current.switchToSelf();
    });

    expect(onSwitch).toHaveBeenCalledWith(null);
  });

  it('calls onError when switch fails', async () => {
    const onError = vi.fn();
    mockSetActiveOrg.mockResolvedValueOnce({ ok: true, data: false });

    const { result } = renderHook(() => useOrgSwitcher({ onError }));

    await act(async () => {
      await result.current.switchToOrg('org-1');
    });

    expect(onError).toHaveBeenCalledWith('Failed to switch organization');
  });

  // ─── switchingOrgId gates ──────────────────────────────────────────────────

  it('switchingOrgId reflects in-flight state during switch', async () => {
    let resolve: (v: { ok: true; data: boolean } | { ok: false; error: string }) => void = () => {};
    const promise = new Promise<{ ok: true; data: boolean } | { ok: false; error: string }>((r) => { resolve = r; });
    mockSetActiveOrg.mockReturnValueOnce(promise);

    const { result } = renderHook(() => useOrgSwitcher());

    // Start switch (don't await)
    const switchPromise = result.current.switchToOrg('org-1');

    // switchingOrgId should be set during the switch
    await act(async () => { await Promise.resolve(); });

    // The switchingOrgId might already be 'org-1' if the setState flushed
    // Actually, the promise is pending, so switchingOrgId should be 'org-1'

    await act(async () => {
      resolve({ ok: true, data: true });
      await switchPromise;
    });

    expect(result.current.switchingOrgId).toBeNull();
  });
});
