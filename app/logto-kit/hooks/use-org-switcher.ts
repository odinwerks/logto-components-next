'use client';

import { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setActiveOrg } from '../custom-logic/set-active-org';
import { useOrgMode } from '../components/providers/preferences';
import { captureMessage } from '../logic/capture-message';
import type { OrganizationData } from '../logic/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrgSwitchMode = 'to-org' | 'to-self' | 'auto-single';

export interface UseOrgSwitcherOptions {
  /** Current active org id (synced from useOrgMode + server prop). */
  currentOrgId?: string | null;
  /** Auto-dismiss error after N ms. Default 3000. */
  errorClearMs?: number;
  /** Fired after a successful switch (newOrgId is null for to-self). */
  onSwitch?: (newOrgId: string | null) => void;
  /** Fired when a switch fails (validation false or thrown). */
  onError?: (message: string) => void;
  /**
   * Enable single-org auto-switch on mount. When true AND `organizations`
   * has exactly one entry AND no org is active AND no switch is in flight AND
   * auto-switch hasn't already fired, calls switch('auto-single', orgs[0].id).
   * Default false.
   */
  autoSwitchSingleOrg?: boolean;
  /** Required when autoSwitchSingleOrg is true. */
  organizations?: OrganizationData[];
}

export interface UseOrgSwitcherReturn {
  /** Org id currently in-flight, the sentinel 'clear' for to-self, or null. */
  switchingOrgId: string | null;
  /** Last error message (auto-clears after errorClearMs). */
  error: string | null;
  /** Resolved active org id from useOrgMode().asOrg (null = personal). */
  activeOrgId: string | null;
  /** Unified mode-aware entry point. */
  switch: (mode: OrgSwitchMode, orgId?: string) => Promise<void>;
  /** Convenience: switch('to-org', orgId). Backward-compatible. */
  switchToOrg: (orgId: string) => Promise<void>;
  /** Convenience: switch('to-self'). Backward-compatible. */
  switchToSelf: () => Promise<void>;
  /** Manually clear the error. */
  clearError: () => void;
  /** True once auto-single has fired (or been skipped). */
  hasAutoSwitched: boolean;
  /** True while the auto-single switch is in flight (BUG-025 hide-gate). */
  isAutoSwitching: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOrgSwitcher(options: UseOrgSwitcherOptions = {}): UseOrgSwitcherReturn {
  const {
    currentOrgId,
    errorClearMs = 3000,
    autoSwitchSingleOrg = false,
    organizations,
  } = options;

  const router = useRouter();
  const { asOrg, setAsOrg } = useOrgMode();
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);
  const [isAutoSwitching, setIsAutoSwitching] = useState(false);

  const isSwitching = useRef(false);
  const onSwitchRef = useRef(options.onSwitch);
  const onErrorRef = useRef(options.onError);
  useEffect(() => { onSwitchRef.current = options.onSwitch; }, [options.onSwitch]);
  useEffect(() => { onErrorRef.current = options.onError; }, [options.onError]);

  // Resolve active org:
  // - asOrg === undefined → no preference yet → fall back to server prop
  // - asOrg === null → explicit "be yourself" → stay null (BUG-002 semantics)
  // - asOrg === string → use that org id
  // NOTE: explicit null means "be yourself" mode and must NOT fall back to
  // a stale server prop (NEVER-TOUCH rule).
  const activeOrgId: string | null = (() => {
    if (asOrg === null) return null;             // explicit be-yourself
    if (asOrg !== undefined) return asOrg;        // explicit org id
    return currentOrgId ?? null;                  // no preference → server prop fallback
  })();

  // ── Error auto-clear ──
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), errorClearMs);
    return () => clearTimeout(timer);
  }, [error, errorClearMs]);

  // ── Unified mode-aware switch ──
  const switchOrg = useCallback(async (mode: OrgSwitchMode, orgId?: string): Promise<void> => {
    if (isSwitching.current) return;

    const target = mode === 'to-self' ? null : (orgId ?? null);
    if (target === activeOrgId) return;

    isSwitching.current = true;
    setSwitchingOrgId(target ?? 'clear');

    try {
      if (target === null) {
        // to-self / null: setActiveOrg(null) does the server PATCH.
        // persistOrg short-circuits on null (BUG-L06 guard), so setAsOrg(null)
        // only updates local sessionStorage — zero server writes.
        const isCleared = await setActiveOrg(null);
        if (!isCleared) {
          const msg = 'Failed to switch to personal mode';
          setError(msg);
          onErrorRef.current?.(msg);
          return;
        }
        startTransition(() => {
          setAsOrg(null);
          router.refresh();
        });
        onSwitchRef.current?.(null);
      } else {
        // to-org / auto-single: setActiveOrg validates membership (live userinfo),
        // does NOT persist. setAsOrg(orgId) triggers persistOrg — ONE server PATCH.
        // Await persistOrg before router.refresh() to prevent BUG-018: the RSC
        // fetch must read the already-persisted customData.asOrg, not the old value.
        const isValid = await setActiveOrg(target);
        if (!isValid) {
          const msg = 'Failed to switch organization';
          setError(msg);
          onErrorRef.current?.(msg);
          return;
        }
        await setAsOrg(target);
        startTransition(() => {
          router.refresh();
        });
        onSwitchRef.current?.(target);
      }
    } catch (err) {
      const msg = captureMessage(err);
      setError(msg);
      onErrorRef.current?.(msg);
    } finally {
      setSwitchingOrgId(null);
      isSwitching.current = false;
    }
  }, [activeOrgId, setAsOrg, router]);

  // ── Thin backward-compatible wrappers ──
  const switchToOrg = useCallback(async (orgId: string): Promise<void> => {
    return switchOrg('to-org', orgId);
  }, [switchOrg]);

  const switchToSelf = useCallback(async (): Promise<void> => {
    return switchOrg('to-self');
  }, [switchOrg]);

  const clearError = useCallback(() => setError(null), []);

  // ── Auto-single org effect ──
  useEffect(() => {
    if (!autoSwitchSingleOrg) return;
    if (!organizations || organizations.length !== 1) return;
    if (activeOrgId) return;
    if (isSwitching.current) return;
    if (hasAutoSwitched) return;

    // Intentional one-shot init gate (BUG-025)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasAutoSwitched(true);
    setIsAutoSwitching(true);
    switchOrg('auto-single', organizations[0].id).finally(() => {
      setIsAutoSwitching(false);
    });
  }, [autoSwitchSingleOrg, organizations, activeOrgId, hasAutoSwitched, switchOrg]);

  return {
    switchingOrgId,
    error,
    activeOrgId,
    switch: switchOrg,
    switchToOrg,
    switchToSelf,
    clearError,
    hasAutoSwitched,
    isAutoSwitching,
  };
}
