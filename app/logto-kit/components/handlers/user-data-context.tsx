'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { UserData } from '../../logic/types';

const UserDataContext = createContext<UserData | null>(null);

export function UserDataProvider({
  children,
  userData,
}: {
  children: ReactNode;
  userData: UserData;
}) {
  return (
    <UserDataContext.Provider value={userData}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserDataContext(): UserData | null {
  return useContext(UserDataContext);
}
