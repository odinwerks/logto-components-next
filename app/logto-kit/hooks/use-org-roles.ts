'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadOrganizationUserRoles } from '../server-actions';
import { captureMessage } from '../logic/capture-message';

export interface UseOrgRolesOptions {
  orgId: string | null | undefined;
  autoLoad?: boolean;
}

export interface UseOrgRolesReturn {
  roles: Record<string, { id: string; description?: string }>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useOrgRoles({ orgId, autoLoad = true }: UseOrgRolesOptions): UseOrgRolesReturn {
  const [roles, setRoles] = useState<Record<string, { id: string; description?: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGenerationRef = useRef(0);

  const fetchRoles = useCallback(async (targetOrgId: string): Promise<void> => {
    const generation = ++fetchGenerationRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await loadOrganizationUserRoles(targetOrgId);
      if (generation !== fetchGenerationRef.current) return;
      if (!result.ok) {
        setError(result.error);
        setIsLoading(false);
        return;
      }
      const map: Record<string, { id: string; description?: string }> = {};
      for (const role of result.data) {
        map[role.name] = { id: role.id, description: role.description };
      }
      setRoles(map);
    } catch (err) {
      if (generation !== fetchGenerationRef.current) return;
      setError(captureMessage(err));
    } finally {
      if (generation === fetchGenerationRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!autoLoad || !orgId) {
      fetchGenerationRef.current++;
      // Defer state resets to avoid synchronous setState inside effect body
      const t = setTimeout(() => { setRoles({}); setIsLoading(false); }, 0);
      return () => clearTimeout(t);
    }
    fetchRoles(orgId);
    return () => {
      fetchGenerationRef.current++;
      setRoles({});
    };
  }, [orgId, autoLoad, fetchRoles]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const orgIdRef = useRef(orgId);
  useEffect(() => { orgIdRef.current = orgId; }, [orgId]);

  const refresh = useCallback(async (): Promise<void> => {
    const id = orgIdRef.current;
    if (!id || isLoading) return;
    await fetchRoles(id);
  }, [isLoading, fetchRoles]);

  return { roles, isLoading, error, refresh };
}
