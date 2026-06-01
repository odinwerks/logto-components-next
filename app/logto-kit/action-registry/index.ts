'use server';

import type { ActionConfig, ActionRegistry } from '../logic/types';

import {
  getCalcAdd,
  getCalcSubtract,
  getCalcMultiply,
  getCalcDivide,
  getCalcModulo,
  getCalcPower,
  getCalcSin,
  getCalcCos,
  getCalcTan,
  getCalcAsin,
  getCalcAcos,
  getCalcAtan,
  getCalcLn,
  getCalcLog,
  getCalcLog2,
  getCalcSqrt,
  getCalcFact,
  getCalcAbs,
  getCalcInv,
  getCalcExp10,
  getCalcExp,
} from './calc-actions';

// Lazy-loaded action cache
let _actionsCache: ActionRegistry | null = null;

async function loadActions(): Promise<ActionRegistry> {
  if (_actionsCache) return _actionsCache;

  const [
    add,
    subtract,
    multiply,
    divide,
    modulo,
    power,
    sin,
    cos,
    tan,
    asin,
    acos,
    atan,
    ln,
    log,
    log2,
    sqrt,
    fact,
    abs,
    inv,
    exp10,
    exp,
  ] = await Promise.all([
    getCalcAdd(),
    getCalcSubtract(),
    getCalcMultiply(),
    getCalcDivide(),
    getCalcModulo(),
    getCalcPower(),
    getCalcSin(),
    getCalcCos(),
    getCalcTan(),
    getCalcAsin(),
    getCalcAcos(),
    getCalcAtan(),
    getCalcLn(),
    getCalcLog(),
    getCalcLog2(),
    getCalcSqrt(),
    getCalcFact(),
    getCalcAbs(),
    getCalcInv(),
    getCalcExp10(),
    getCalcExp(),
  ]);

  _actionsCache = {
    'calc/add': add,
    'calc/subtract': subtract,
    'calc/multiply': multiply,
    'calc/divide': divide,
    'calc/modulo': modulo,
    'calc/power': power,
    'calc/sin': sin,
    'calc/cos': cos,
    'calc/tan': tan,
    'calc/asin': asin,
    'calc/acos': acos,
    'calc/atan': atan,
    'calc/ln': ln,
    'calc/log': log,
    'calc/log2': log2,
    'calc/sqrt': sqrt,
    'calc/fact': fact,
    'calc/abs': abs,
    'calc/inv': inv,
    'calc/exp10': exp10,
    'calc/exp': exp,
  };

  // Strict validation: every action MUST define all three check categories.
  // Missing any field is a fatal setup error - the registry is unusable.
  for (const [name, config] of Object.entries(_actionsCache)) {
    const missing: string[] = [];
    if (!config.requiredOrgId || typeof config.requiredOrgId !== 'string' || config.requiredOrgId.length === 0) {
      missing.push('requiredOrgId');
    }
    const hasRole = Array.isArray(config.requiredRoleId)
      ? config.requiredRoleId.length > 0
      : typeof config.requiredRoleId === 'string' && config.requiredRoleId.length > 0;
    if (!hasRole) {
      missing.push('requiredRoleId');
    }
    const hasPerm = Array.isArray(config.requiredPermId)
      ? config.requiredPermId.length > 0
      : typeof config.requiredPermId === 'string' && config.requiredPermId.length > 0;
    if (!hasPerm) {
      missing.push('requiredPermId');
    }
    if (missing.length > 0) {
      throw new Error(
        `IMPROPER_SETUP_ERROR: Action "${name}" is missing required fields: ${missing.join(', ')}. ` +
        'Every protected action MUST define requiredOrgId, requiredRoleId, and requiredPermId.'
      );
    }
  }

  return _actionsCache;
}

export async function getAction(actionName: string): Promise<ActionConfig | undefined> {
  const actions = await loadActions();
  return actions[actionName];
}
