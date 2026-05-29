'use server';

import { getUserRoles } from '../logic/actions';
import type { DataResult } from '../logic/actions/safe';
import type { UserRole } from '../logic/types';

export async function loadPersonalRoles(): Promise<DataResult<UserRole[]>> {
  return getUserRoles();
}
