'use client';

import { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setActiveOrg } from '../custom-logic/set-active-org';
import { useOrgMode } from '../components/providers/preferences';
import { captureMessage } from '../logic/capture-message';

export interface UseOrgSwitcherOptions {
  currentOrgId?: string | null;
  errorClearMs?: number;
  onSwitch?: (newOrgId: string | null) => void;
  onError?: (message: string) => void;
}

export interface UseOrgSwitcherReturn {
  switchingOrgId: string | null;
  error: string | null;
  activeOrgId: string | null;
  switchToOrg: (orgId: string) => Promise<void>;
  switchToSelf: () => Promise<void>;
  clearError: () => void;
}

export function useOrgSwitcher(options: UseOrgSwitcherOptions = {}): UseOrgSwitcherReturn {
  const { errorClearMs = 3000 } = options;
  const router = useRouter();
  const { asOrg, setAsOrg } = useOrgMode();
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSwitching = useRef(false);
  const onSwitchRef = useRef(options.onSwitch);
  const onErrorRef = useRef(options.onError);
  useEffect(() => { onSwitchRef.current = options.onSwitch; }, [options.onSwitch]);
  useEffect(() => { onErrorRef.current = options.onError; }, [options.onError]);

  const activeOrgId = asOrg || null;

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), errorClearMs);
    return () => clearTimeout(timer);
  }, [error, errorClearMs]);

  const switchToOrg = useCallback(async (orgId: string): Promise<void> => {
    if (isSwitching.current) return;
    if (orgId === activeOrgId) return;

    isSwitching.current = true;
    setSwitchingOrgId(orgId);
    try {
      const isValid = await setActiveOrg(orgId);
      if (!isValid) {
        const msg = 'Failed to switch organization';
        setError(msg);
        onErrorRef.current?.(msg);
        return;
      }
      startTransition(() => {
        setAsOrg(orgId);
        router.refresh();
      });
      onSwitchRef.current?.(orgId);
    } catch (err) {
      const msg = captureMessage(err);
      setError(msg);
      onErrorRef.current?.(msg);
    } finally {
      setSwitchingOrgId(null);
      isSwitching.current = false;
    }
  }, [activeOrgId, setAsOrg, router]);

  const switchToSelf = useCallback(async (): Promise<void> => {
    if (isSwitching.current) return;
    if (activeOrgId === null || activeOrgId === undefined) return;

    isSwitching.current = true;
    setSwitchingOrgId('clear');
    try {
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
    } catch (err) {
      const msg = captureMessage(err);
      setError(msg);
      onErrorRef.current?.(msg);
    } finally {
      setSwitchingOrgId(null);
      isSwitching.current = false;
    }
  }, [activeOrgId, setAsOrg, router]);

  const clearError = useCallback(() => setError(null), []);

  return { switchingOrgId, error, activeOrgId, switchToOrg, switchToSelf, clearError };
}
