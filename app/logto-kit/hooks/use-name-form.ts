'use client';

import { useState, useCallback, useRef } from 'react';
import type { UserData } from '../logic/types';
import type { ActionResult } from '../logic/actions/safe';

/** No-op setter — returned in `given_family` mode since username is not saved. */
const noopSetUsername = (_value: string) => {};

export interface UseNameFormOptions {
  userData: UserData;
  nameType: 'given_family' | 'username' | 'full';
  onUpdateBasicInfo: (updates: { name?: string; username?: string | null }) => Promise<ActionResult>;
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
  const saveInProgressRef = useRef(false);

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
  if (nameType !== 'given_family' && prevUsernameRef.current !== userData.username) {
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
    if (saveInProgressRef.current) return;
    saveInProgressRef.current = true;
    setIsLoading(true);
    let rollbackBasicInfo: { name?: string; username?: string | null } | null = null;

    const rollback = async () => {
      if (!rollbackBasicInfo) return;
      try {
        await onUpdateBasicInfo(rollbackBasicInfo);
      } catch {
        // Rollback is best-effort; authoritative refresh below reconciles state.
      }
    };

    try {
      if (nameType === 'given_family') {
        const name = `${givenName} ${familyName}`.trim();
        // Always send name (as '' when both fields are cleared) so the server can
        // clear userData.name. The previous falsy guard skipped the call, leaving
        // the name stale when both given and family names were emptied.
        const basicResult = await onUpdateBasicInfo({ name: name || '' });
        if (!basicResult.ok) { onError(basicResult.error); refreshData(); return; }
        rollbackBasicInfo = { name: userData.name ?? '' };
        const profileResult = await onUpdateProfile({ givenName, familyName });
        if (!profileResult.ok) {
          await rollback();
          onError(profileResult.error);
          refreshData();
          return;
        }
        rollbackBasicInfo = null;
      } else if (nameType === 'username') {
        const result = await onUpdateBasicInfo({ username });
        if (!result.ok) { onError(result.error); refreshData(); return; }
      } else { // full
        const nameFieldsChanged =
          givenName !== (userData.profile?.givenName ?? '') ||
          familyName !== (userData.profile?.familyName ?? '');
        const name = `${givenName} ${familyName}`.trim();
        // Always include name (as '' when both fields are cleared) so the server can
        // clear userData.name. The previous conditional omitted the key when name
        // was empty, leaving the name stale.
        const basicUpdates: { name: string; username: string } = { name: name || '', username };
        const basicResult = await onUpdateBasicInfo(basicUpdates);
        if (!basicResult.ok) { onError(basicResult.error); refreshData(); return; }
        if (nameFieldsChanged) {
          rollbackBasicInfo = {
            name: userData.name ?? '',
            // Logto clears an absent username with null; unlike other name
            // fields, an empty string is not a valid username clear sentinel.
            username: userData.username ?? null,
          };
          const profileResult = await onUpdateProfile({ givenName, familyName });
          if (!profileResult.ok) {
            await rollback();
            onError(profileResult.error);
            refreshData();
            return;
          }
          rollbackBasicInfo = null;
        }
      }
      onSuccess(successMessage);
      refreshData();
    } catch {
      await rollback();
      onError('UPDATE_FAILED');
      refreshData();
    } finally {
      saveInProgressRef.current = false;
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
    setUsername: nameType === 'given_family' ? noopSetUsername : setUsername,
    nameChanged,
    isLoading,
    save,
    discard,
  };
}
