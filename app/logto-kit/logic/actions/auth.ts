'use server';

import { signOut } from '@logto/next/server-actions';
import { getLogtoConfig } from '../../config';

/**
 * Signs out the current user.
 */
export async function signOutUser(): Promise<void> {
  await signOut(getLogtoConfig());
}
