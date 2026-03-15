'use server';

import { cookies } from 'next/headers';

const ACTIVE_ORG_COOKIE = 'logto-active-org';

export async function getActiveOrgId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ACTIVE_ORG_COOKIE);
  return cookie?.value;
}
