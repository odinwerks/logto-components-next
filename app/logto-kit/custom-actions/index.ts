'use server';

export interface ProtectedActionHandler {
  (data: { userId: string; orgId: string; payload: unknown }): Promise<unknown>;
}

export interface ActionConfig {
  requiredPerm: string | string[];
  handler: ProtectedActionHandler;
}

export type ActionRegistry = Record<string, ActionConfig>;

import { getBasicCalc } from './calc-actions/basic';
import { getScientificCalc } from './calc-actions/scientific';

const actions: ActionRegistry = {
  'calc-basic': (await getBasicCalc()),
  'calc-scientific': (await getScientificCalc()),
};

export async function getAction(actionName: string): Promise<ActionConfig | undefined> {
  return actions[actionName];
}