'use server';

import type { ActionConfig, ActionRegistry } from '../logic/types';
import { validateActionConfig } from './validate-action-config';

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
let _actionsError: Error | null = null;
// In-flight deduplication: concurrent callers share one loading promise
let _loadingPromise: Promise<ActionRegistry> | null = null;

/**
 * Classifies an error as fatal (permanently cached) or transient (allow retry).
 *
 * Fatal errors indicate mis-configuration that cannot be recovered at runtime:
 * - IMPROPER_SETUP_ERROR: action config is missing required fields
 * - RangeError: a logic/math error in config setup
 *
 * Transient errors can recover on retry:
 * - TypeError with "fetch" or "network" in the message: network failures during
 *   cold start or module loading
 * - Any other unknown error: default to transient so the registry can recover
 */
function isFatalRegistryError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  // TypeError from network/fetch during module load — transient
  if (
    err instanceof TypeError &&
    (err.message.includes('fetch') || err.message.includes('network'))
  ) {
    return false;
  }

  // IMPROPER_SETUP_ERROR from validateActionConfig — fatal config mis-setup
  if (err.message.startsWith('IMPROPER_SETUP_ERROR')) return true;

  // Legacy fatal patterns from validateActionConfig (kept for compatibility)
  if (err.message.startsWith('INVALID_ACTION_CONFIG')) return true;
  if (err.message.startsWith('MISSING_ACTION_')) return true;

  // RangeError = fatal logic error in config
  if (err instanceof RangeError) return true;

  // Default: treat as transient so the registry can recover
  return false;
}

async function doLoadActions(): Promise<ActionRegistry> {
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

  const registry: ActionRegistry = {
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
  for (const [name, config] of Object.entries(registry)) {
    validateActionConfig(config, name);
  }

  return registry;
}

async function loadActions(): Promise<ActionRegistry> {
  // Only permanently-cached fatal errors block future calls
  if (_actionsError) throw _actionsError;
  if (_actionsCache) return _actionsCache;
  // Coalesce concurrent callers onto one in-flight promise
  if (_loadingPromise) return _loadingPromise;

  // Create the loading promise and assign it before any async work begins.
  // We wrap in a new Promise to ensure the rejected promise is attached to
  // _loadingPromise before the rejection can be observed by Vitest's unhandled
  // rejection handler.
  let resolveLoading!: (registry: ActionRegistry) => void;
  let rejectLoading!: (err: Error) => void;
  _loadingPromise = new Promise<ActionRegistry>((resolve, reject) => {
    resolveLoading = resolve;
    rejectLoading = reject;
  });

  // Start the actual work asynchronously to ensure _loadingPromise is set
  // before anyone can observe the rejection (avoids unhandled rejection).
  Promise.resolve()
    .then(() => doLoadActions())
    .then(
      (registry) => {
        _actionsCache = registry;
        _loadingPromise = null;
        resolveLoading(registry);
      },
      (err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        if (isFatalRegistryError(error)) {
          // Only permanently cache fatal config errors — transient errors allow retry
          _actionsError = error;
        }
        _loadingPromise = null;
        rejectLoading(error);
      },
    );

  return _loadingPromise;
}

export async function getAction(actionName: string): Promise<ActionConfig | undefined> {
  const actions = await loadActions();
  return actions[actionName];
}
