'use client';

import { useState, useCallback, useRef } from 'react';
import type { UserData } from '../logic/types';
import type { ActionResult } from '../logic/actions/safe';

export interface UseNameFormOptions {
  userData: UserData;
  nameType: 'given_family' | 'username' | 'full';
  onUpdateBasicInfo: (updates: { name?: string; username?: string }) => Promise<ActionResult>;
  onUpdateProfile: (profile: { givenName?: string; familyName?: string }) => Promise<ActionResult>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  refreshData: () => void;
  successMessage: string;
}

export interface UseNameFormReturn {
  /** Current given name field value */
  givenName: string;
  /** Setter for givenName */
  setGivenName: (value: string) => void;
  /** Current family name field value */
  familyName: string;
  /** Setter for familyName */
  setFamilyName: (value: string) => void;
  /** Current username field value */
  username: string;
  /** Setter for username */
  setUsername: (value: string) => void;
  /** Whether any name field differs from the server value */
  nameChanged: boolean;
  /** Whether a save operation is in progress */
  isLoading: boolean;
  /** Save the current name fields to the server */
  save: () => Promise<void>;
  /** Discard changes and revert to server values */
  discard: () => void;
}

export function useNameForm({
  userData,
  nameType,
  onUpdateBasicInfo,
  onUpdateProfile,
  onSuccess,
  onError,
  refreshData,
  successMessage,
}: UseNameFormOptions): UseNameFormReturn {
  const [givenName, setGivenName] = useState(userData.profile?.givenName ?? '');
  const [familyName, setFamilyName] = useState(userData.profile?.familyName ?? '');
  const [username, setUsername] = useState(userData.username ?? '');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Sync server data to local form state.
   *
   * We use the "adjust state during render" pattern (React docs: "You Might Not
   * Need an Effect") to overwrite local edits when server data changes. This is
   * a data-consistency tradeoff: the form always reflects the current server state.
   * User edits that haven't been saved are discarded when data refreshes.
   *
   * This avoids the useEffect + setState lint warning while preserving the same
   * behavior: when a prop changes, local state is synchronously updated during
   * render (no extra render cycle).
   */
  /* eslint-disable react-hooks/refs -- synchronous prop-change reset (React "adjusting state" pattern) */
  const prevUsernameRef = useRef(userData.username);
  if (prevUsernameRef.current !== userData.username) {
    prevUsernameRef.current = userData.username;
    setUsername(userData.username ?? '');
  }

  const prevGivenNameRef = useRef(userData.profile?.givenName);
  if (prevGivenNameRef.current !== userData.profile?.givenName) {
    prevGivenNameRef.current = userData.profile?.givenName;
    setGivenName(userData.profile?.givenName ?? '');
  }

  const prevFamilyNameRef = useRef(userData.profile?.familyName);
  if (prevFamilyNameRef.current !== userData.profile?.familyName) {
    prevFamilyNameRef.current = userData.profile?.familyName;
    setFamilyName(userData.profile?.familyName ?? '');
  }
  /* eslint-enable react-hooks/refs */

  const nameChanged = nameType === 'given_family'
    ? (givenName !== (userData.profile?.givenName ?? '') ||
       familyName !== (userData.profile?.familyName ?? ''))
    : nameType === 'username'
      ? username !== (userData.username ?? '')
      : (username !== (userData.username ?? '') ||
         givenName !== (userData.profile?.givenName ?? '') ||
         familyName !== (userData.profile?.familyName ?? ''));

  const save = useCallback(async () => {
    setIsLoading(true);
    try {
      if (nameType === 'given_family') {
        const name = `${givenName} ${familyName}`.trim();
        if (name) {
          const basicResult = await onUpdateBasicInfo({ name });
          if (!basicResult.ok) { onError(basicResult.error); refreshData(); return; }
        }
        const profileResult = await onUpdateProfile({ givenName, familyName });
        if (!profileResult.ok) {
          // Attempt rollback of name update since profile update failed
          try { await onUpdateBasicInfo({ name: userData.name ?? '' }); } catch { /* rollback best-effort */ }
          onError(profileResult.error);
          refreshData();
          return;
        }
      } else if (nameType === 'username') {
        const result = await onUpdateBasicInfo({ username });
        if (!result.ok) { onError(result.error); refreshData(); return; }
      } else { // full
        const nameFieldsChanged =
          givenName !== (userData.profile?.givenName ?? '') ||
          familyName !== (userData.profile?.familyName ?? '');
        const name = `${givenName} ${familyName}`.trim();
        const basicUpdates: { name?: string; username?: string } = { username };
        if (name) basicUpdates.name = name;
        const basicResult = await onUpdateBasicInfo(basicUpdates);
        if (!basicResult.ok) { onError(basicResult.error); refreshData(); return; }
        if (nameFieldsChanged) {
          const profileResult = await onUpdateProfile({ givenName, familyName });
          if (!profileResult.ok) {
            // Attempt rollback of name/username update since profile update failed
            try { await onUpdateBasicInfo({ name: userData.name ?? '', username: userData.username ?? '' }); } catch { /* rollback best-effort */ }
            onError(profileResult.error);
            refreshData();
            return;
          }
        }
      }
      onSuccess(successMessage);
      refreshData();
    } finally {
      setIsLoading(false);
    }
  }, [nameType, givenName, familyName, username, userData, onUpdateBasicInfo, onUpdateProfile, onSuccess, onError, refreshData, successMessage]);

  const discard = useCallback(() => {
    setGivenName(userData.profile?.givenName ?? '');
    setFamilyName(userData.profile?.familyName ?? '');
    if (nameType !== 'given_family') setUsername(userData.username ?? '');
  }, [userData, nameType]);

  return {
    givenName,
    setGivenName,
    familyName,
    setFamilyName,
    username,
    setUsername,
    nameChanged,
    isLoading,
    save,
    discard,
  };
}
