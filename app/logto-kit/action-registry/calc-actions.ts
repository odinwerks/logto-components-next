'use server';

import type { ActionConfig } from '../logic/types';

// ============================================================================
// Payload validators
// ============================================================================

/**
 * Validates that `val` is a finite number (rejects NaN, Infinity, -Infinity,
 * and all non-number values). This is the input boundary — non-finite inputs
 * (e.g. JSON `1e400` which parses to `Infinity`) MUST be rejected here, before
 * any computation runs, so they never reach the output guard or serializer.
 *
 * `Number.isFinite` returns `false` for NaN, ±Infinity, AND non-numbers, so it
 * is a single-call replacement for the previous `typeof + Number.isNaN` pair
 * that incorrectly let `Infinity`/`-Infinity` through.
 */
function assertNumber(val: unknown, name: string): asserts val is number {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    throw new Error(`INVALID_PAYLOAD: ${name} must be a finite number`);
  }
}

function getBinaryPayload(payload: unknown): { a: number; b: number } {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('INVALID_PAYLOAD: expected object');
  }
  const p = payload as Record<string, unknown>;
  assertNumber(p.a, 'a');
  assertNumber(p.b, 'b');
  return { a: p.a, b: p.b };
}

function getUnaryPayload(payload: unknown): { n: number } {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('INVALID_PAYLOAD: expected object');
  }
  const p = payload as Record<string, unknown>;
  assertNumber(p.n, 'n');
  return { n: p.n };
}

function getTrigPayload(payload: unknown): { n: number; mode: 'deg' | 'rad' } {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('INVALID_PAYLOAD: expected object');
  }
  const p = payload as Record<string, unknown>;
  assertNumber(p.n, 'n');
  if (p.mode !== 'deg' && p.mode !== 'rad') {
    throw new Error('INVALID_PAYLOAD: mode must be "deg" or "rad"');
  }
  return { n: p.n, mode: p.mode };
}

// ============================================================================
// Role / permission config helpers
//
// NOTE: These are placeholder IDs. In a real deployment the dev fills in the
// actual Logto role UUID and permission scope names that match their tenant.
// The action registry enforces that all three fields are non-empty.
// ============================================================================

const CALC_ROLE_ID = 'gvuq1krilkjypl5hl34sb';
const CALC_ORG_ID = '8joxv3kicmlz';
const CALC_BASIC_PERM = 'calc:basic';
const CALC_SCI_PERM = 'calc:scientific';

/**
 * Output guard — validates that a handler's computed `answer` is a finite
 * number. This is the computation boundary (defense-in-depth alongside the
 * input guard `assertNumber`): even with finite inputs, some operations yield
 * non-finite results — overflow (`Math.pow(10, 400)` → `Infinity`) and
 * domain violations (`Math.asin(2)` → `NaN`).
 *
 * Without this guard, `NaN`/`Infinity` would reach `NextResponse.json`, where
 * `JSON.stringify` silently coerces them to `null`, producing HTTP 200 with
 * `answer:null` — a contract violation (CAN-ACT-012). By throwing
 * `INVALID_PAYLOAD` here, the protected route's existing catch block maps it
 * to a 400 response.
 *
 * Centralized in `calcConfig` so every calc action is guarded uniformly — no
 * per-handler boilerplate, no chance of one handler being missed.
 */
function assertFiniteResult(result: unknown): void {
  if (result !== null && typeof result === 'object' && 'answer' in result) {
    const answer = (result as { answer: unknown }).answer;
    if (typeof answer !== 'number' || !Number.isFinite(answer)) {
      throw new Error('INVALID_PAYLOAD: result is not representable');
    }
  }
}

function calcConfig(perm: string, handler: ActionConfig['handler']): ActionConfig {
  // Wrap the handler so the output guard runs after computation, before the
  // result is returned to the protected route serializer.
  const wrappedHandler: ActionConfig['handler'] = async (ctx) => {
    const result = await handler(ctx);
    assertFiniteResult(result);
    return result;
  };
  return {
    requiredOrgId: CALC_ORG_ID,
    requiredRoleId: CALC_ROLE_ID,
    requiredPermId: perm,
    handler: wrappedHandler,
  };
}

// ============================================================================
// Arithmetic actions
// ============================================================================

export async function getCalcAdd(): Promise<ActionConfig> {
  return calcConfig(CALC_BASIC_PERM, async ({ payload }) => {
    const { a, b } = getBinaryPayload(payload);
    return { answer: a + b };
  });
}

export async function getCalcSubtract(): Promise<ActionConfig> {
  return calcConfig(CALC_BASIC_PERM, async ({ payload }) => {
    const { a, b } = getBinaryPayload(payload);
    return { answer: a - b };
  });
}

export async function getCalcMultiply(): Promise<ActionConfig> {
  return calcConfig(CALC_BASIC_PERM, async ({ payload }) => {
    const { a, b } = getBinaryPayload(payload);
    return { answer: a * b };
  });
}

export async function getCalcDivide(): Promise<ActionConfig> {
  return calcConfig(CALC_BASIC_PERM, async ({ payload }) => {
    const { a, b } = getBinaryPayload(payload);
    if (b === 0) throw new Error('INVALID_PAYLOAD: division by zero');
    return { answer: a / b };
  });
}

export async function getCalcModulo(): Promise<ActionConfig> {
  return calcConfig(CALC_BASIC_PERM, async ({ payload }) => {
    const { a, b } = getBinaryPayload(payload);
    if (b === 0) throw new Error('INVALID_PAYLOAD: modulo by zero');
    return { answer: a % b };
  });
}

export async function getCalcPower(): Promise<ActionConfig> {
  return calcConfig(CALC_BASIC_PERM, async ({ payload }) => {
    const { a, b } = getBinaryPayload(payload);
    return { answer: Math.pow(a, b) };
  });
}

// ============================================================================
// Trigonometric actions (deg / rad aware)
// ============================================================================

export async function getCalcSin(): Promise<ActionConfig> {
  return calcConfig(CALC_SCI_PERM, async ({ payload }) => {
    const { n, mode } = getTrigPayload(payload);
    const radians = mode === 'deg' ? n * (Math.PI / 180) : n;
    return { answer: Math.sin(radians) };
  });
}

export async function getCalcCos(): Promise<ActionConfig> {
  return calcConfig(CALC_SCI_PERM, async ({ payload }) => {
    const { n, mode } = getTrigPayload(payload);
    const radians = mode === 'deg' ? n * (Math.PI / 180) : n;
    return { answer: Math.cos(radians) };
  });
}

export async function getCalcTan(): Promise<ActionConfig> {
  return calcConfig(CALC_SCI_PERM, async ({ payload }) => {
    const { n, mode } = getTrigPayload(payload);
    const radians = mode === 'deg' ? n * (Math.PI / 180) : n;
    return { answer: Math.tan(radians) };
  });
}

export async function getCalcAsin(): Promise<ActionConfig> {
  return calcConfig(CALC_SCI_PERM, async ({ payload }) => {
    const { n, mode } = getTrigPayload(payload);
    const raw = Math.asin(n);
    const answer = mode === 'deg' ? raw * (180 / Math.PI) : raw;
    return { answer };
  });
}

export async function getCalcAcos(): Promise<ActionConfig> {
  return calcConfig(CALC_SCI_PERM, async ({ payload }) => {
    const { n, mode } = getTrigPayload(payload);
    const raw = Math.acos(n);
    const answer = mode === 'deg' ? raw * (180 / Math.PI) : raw;
    return { answer };
  });
}

export async function getCalcAtan(): Promise<ActionConfig> {
  return calcConfig(CALC_SCI_PERM, async ({ payload }) => {
    const { n, mode } = getTrigPayload(payload);
    const raw = Math.atan(n);
    const answer = mode === 'deg' ? raw * (180 / Math.PI) : raw;
    return { answer };
  });
}

// ============================================================================
// Single-argument scientific actions
// ============================================================================

export async function getCalcLn(): Promise<ActionConfig> {
  return calcConfig(CALC_SCI_PERM, async ({ payload }) => {
    const { n } = getUnaryPayload(payload);
    if (n <= 0) throw new Error('INVALID_PAYLOAD: ln requires positive input');
    return { answer: Math.log(n) };
  });
}

export async function getCalcLog(): Promise<ActionConfig> {
  return calcConfig(CALC_SCI_PERM, async ({ payload }) => {
    const { n } = getUnaryPayload(payload);
    if (n <= 0) throw new Error('INVALID_PAYLOAD: log requires positive input');
    return { answer: Math.log10(n) };
  });
}

export async function getCalcLog2(): Promise<ActionConfig> {
  return calcConfig(CALC_SCI_PERM, async ({ payload }) => {
    const { n } = getUnaryPayload(payload);
    if (n <= 0) throw new Error('INVALID_PAYLOAD: log2 requires positive input');
    return { answer: Math.log2(n) };
  });
}

export async function getCalcSqrt(): Promise<ActionConfig> {
  return calcConfig(CALC_SCI_PERM, async ({ payload }) => {
    const { n } = getUnaryPayload(payload);
    if (n < 0) throw new Error('INVALID_PAYLOAD: sqrt requires non-negative input');
    return { answer: Math.sqrt(n) };
  });
}

export async function getCalcFact(): Promise<ActionConfig> {
  return calcConfig(CALC_SCI_PERM, async ({ payload }) => {
    const { n } = getUnaryPayload(payload);
    if (!Number.isInteger(n)) throw new Error('INVALID_PAYLOAD: factorial requires an integer');
    if (n < 0 || n > 170) throw new Error('INVALID_PAYLOAD: factorial out of range');
    let r = 1;
    for (let j = 2; j <= n; j++) r *= j;
    return { answer: r };
  });
}

export async function getCalcAbs(): Promise<ActionConfig> {
  return calcConfig(CALC_SCI_PERM, async ({ payload }) => {
    const { n } = getUnaryPayload(payload);
    return { answer: Math.abs(n) };
  });
}

export async function getCalcInv(): Promise<ActionConfig> {
  return calcConfig(CALC_SCI_PERM, async ({ payload }) => {
    const { n } = getUnaryPayload(payload);
    if (n === 0) throw new Error('INVALID_PAYLOAD: division by zero');
    return { answer: 1 / n };
  });
}

export async function getCalcExp10(): Promise<ActionConfig> {
  return calcConfig(CALC_SCI_PERM, async ({ payload }) => {
    const { n } = getUnaryPayload(payload);
    return { answer: Math.pow(10, n) };
  });
}

export async function getCalcExp(): Promise<ActionConfig> {
  return calcConfig(CALC_SCI_PERM, async ({ payload }) => {
    const { n } = getUnaryPayload(payload);
    return { answer: Math.exp(n) };
  });
}
