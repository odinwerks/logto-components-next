'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserData } from '../../logic/types';

const STORAGE_KEY = 'user-data';

function getStoredUserData(): UserData | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('[UserDataContext] Failed to parse stored user data:', error);
    return null;
  }
}

function setStoredUserData(userData: UserData) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  } catch (error) {
    console.warn('[UserDataContext] Failed to store user data:', error);
  }
}

const UserDataContext = createContext<UserData | null>(null);

export function UserDataProvider({
  children,
  userData,
}: {
  children: ReactNode;
  userData: UserData;
}) {
  const [cachedUserData, setCachedUserData] = useState<UserData>(() => 
    getStoredUserData() ?? userData
  );

  useEffect(() => {
    setCachedUserData(userData);
    setStoredUserData(userData);
  }, [userData]);

  return (
    <UserDataContext.Provider value={cachedUserData}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserDataContext(): UserData | null {
  return useContext(UserDataContext);
}
