'use server';

export interface ProtectedActionHandler {
  (data: { userId: string; orgId: string; payload: unknown }): Promise<unknown>;
}

export interface ActionConfig {
  requiredPerm: string | string[];
  handler: ProtectedActionHandler;
}

export type ActionRegistry = Record<string, ActionConfig>;

import { getBasicCalc, getScientificCalc } from './calc-actions';

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

  // Validate that every registered action has a valid requiredPerm
  for (const [name, config] of Object.entries(_actionsCache)) {
    const { requiredPerm } = config;
    const isValidString = typeof requiredPerm === 'string' && requiredPerm.length > 0;
    const isValidArray = Array.isArray(requiredPerm) && requiredPerm.length > 0 && requiredPerm.every((p) => typeof p === 'string' && p.length > 0);
    if (!isValidString && !isValidArray) {
      console.warn(`[loadActions] Action "${name}" has invalid requiredPerm: ${JSON.stringify(requiredPerm)}. Removing from registry.`);
      delete _actionsCache[name];
    }
  }

  return _actionsCache;
}

export async function getAction(actionName: string): Promise<ActionConfig | undefined> {
  const actions = await loadActions();
  return actions[actionName];
}
