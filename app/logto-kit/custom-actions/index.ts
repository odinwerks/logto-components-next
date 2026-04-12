'use server';

export interface ProtectedActionHandler {
  (data: { userId: string; orgId: string; payload: unknown }): Promise<unknown>;
}

export interface ActionConfig {
  requiredPerm: string | string[];
  handler: ProtectedActionHandler;
}

export type ActionRegistry = Record<string, ActionConfig>;

import { getDestroyEconomy } from './president-actions/destroy-economy';
import { getStealTaxDollars } from './president-actions/steal-tax-dollars';
import { getKidnapChildren } from './president-actions/kidnap-children';
import { getLaunchNuke } from './president-actions/launch-nuke';

const actions: ActionRegistry = {
  'destroy-economy': (await getDestroyEconomy()),
  'steal-tax-dollars': (await getStealTaxDollars()),
  'kidnap-children': (await getKidnapChildren()),
  'launch-nuke': (await getLaunchNuke()),
};

export async function getAction(actionName: string): Promise<ActionConfig | undefined> {
  return actions[actionName];
}