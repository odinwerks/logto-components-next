'use server';

import { signOut } from '@logto/next/server-actions';
import { getLogtoConfig } from '../../../logto';

/**
 * Signs out the current user.
 */
export async function signOutUser(): Promise<void> {
  await signOut(getLogtoConfig());
}
