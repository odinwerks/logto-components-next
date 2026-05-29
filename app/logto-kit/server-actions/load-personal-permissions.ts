'use server';

import { getUserScopes } from '../logic/actions';
import type { DataResult } from '../logic/actions/safe';
import type { PersonalPermission } from '../logic/types';

export async function loadPersonalPermissions(): Promise<DataResult<PersonalPermission[]>> {
  return getUserScopes();
}
