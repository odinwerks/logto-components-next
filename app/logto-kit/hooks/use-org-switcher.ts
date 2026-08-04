'use client';

import { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setActiveOrg } from '../custom-logic/set-active-org';
import { useOrgMode } from '../components/providers/preferences';
import { captureMessage } from '../logic/capture-message';
import { createStorageHelpers } from '../logic/client-storage';
import { updateUserCustomData } from '../logic/actions/profile';
import type { OrganizationData } from '../logic/types';

const orgPreferenceStorage = createStorageHelpers<string | null>('org-mode');
const explicitPersonalStorage = createStorageHelpers<'1'>('org-mode-explicit-personal');

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
  /** Whether a personal/org preference exists (distinct from no preference). */
  hasOrgPreference: boolean;
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
  const [localSelection, setLocalSelection] = useState<{ value: string | null } | null>(null);
  const [preferenceHint, setPreferenceHint] = useState<string | null | undefined>(() => {
    if (currentOrgId !== undefined) return currentOrgId;
    const storedOrg = orgPreferenceStorage.get();
    if (storedOrg !== null) return storedOrg;
    return explicitPersonalStorage.get() === '1' ? null : undefined;
  });

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
    if (localSelection) return localSelection.value;
    if (asOrg === null) return null;             // explicit be-yourself
    if (asOrg !== undefined) return asOrg;        // explicit org id
    return currentOrgId ?? null;                  // no preference → server prop fallback
  })();
  const hasOrgPreference =
    preferenceHint !== undefined ||
    currentOrgId !== undefined ||
    (asOrg !== null && asOrg !== undefined);

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
        // CAN-ACT-010: setActiveOrg returns DataResult<boolean> (safeAction
        // envelope). We unwrap it — a non-ok result OR data:false means the
        // server-side persist failed. The pre-fix code treated the DataResult
        // object as a plain boolean, so `!{ok:false,error}` was always false
        // (objects are truthy) — failures were silently swallowed.
        const result = await setActiveOrg(null);
        if (!result.ok || !result.data) {
          const msg = 'Failed to switch to personal mode';
          setError(msg);
          onErrorRef.current?.(msg);
          return;
        }
        await setAsOrg(null);
        explicitPersonalStorage.set('1');
        orgPreferenceStorage.remove();
        setPreferenceHint(null);
        setLocalSelection({ value: null });
        startTransition(() => {
          router.refresh();
        });
        onSwitchRef.current?.(null);
      } else {
        // to-org / auto-single: setActiveOrg validates membership (live userinfo),
        // does NOT persist. Use the checked server action result directly so a
        // provider rollback cannot be mistaken for success (M-027). The local
        // selection is committed only after the server confirms persistence.
        // CAN-ACT-010: unwrap DataResult<boolean> — non-ok OR data:false means
        // validation failed or the action errored. The pre-fix `!isValid` check
        // was always false (DataResult objects are truthy), silently swallowing
        // membership failures and safeAction errors.
        const result = await setActiveOrg(target);
        if (!result.ok || !result.data) {
          const msg = 'Failed to switch organization';
          setError(msg);
          onErrorRef.current?.(msg);
          return;
        }
        const persisted = await updateUserCustomData({ Preferences: { asOrg: target } });
        if (!persisted.ok) {
          const msg = 'Failed to switch organization';
          setError(msg);
          onErrorRef.current?.(msg);
          return;
        }
        explicitPersonalStorage.remove();
        orgPreferenceStorage.set(target);
        setPreferenceHint(target);
        setLocalSelection({ value: target });
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
    // M-029: null is an explicit personal-mode preference, while undefined
    // means no preference. Auto-selection is allowed only for the latter.
    if (hasOrgPreference) return;
    if (isSwitching.current) return;
    if (hasAutoSwitched) return;

    // Intentional one-shot init gate (BUG-025)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasAutoSwitched(true);
    setIsAutoSwitching(true);
    switchOrg('auto-single', organizations[0].id).finally(() => {
      setIsAutoSwitching(false);
    });
  }, [autoSwitchSingleOrg, organizations, activeOrgId, hasOrgPreference, hasAutoSwitched, switchOrg]);

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
    hasOrgPreference,
  };
}
