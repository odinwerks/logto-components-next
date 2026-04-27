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

// Lazy-loaded action cache
let _actionsCache: ActionRegistry | null = null;

async function loadActions(): Promise<ActionRegistry> {
  if (_actionsCache) return _actionsCache;

  const [basic, scientific] = await Promise.all([
    getBasicCalc(),
    getScientificCalc(),
  ]);

  _actionsCache = {
    'calc-basic': basic,
    'calc-scientific': scientific,
  };

  return _actionsCache;
}

export async function getAction(actionName: string): Promise<ActionConfig | undefined> {
  const actions = await loadActions();
  return actions[actionName];
}
