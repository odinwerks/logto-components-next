'use server';

import type { ActionConfig } from '../logic/types';

// ============================================================================
// Payload validators
// ============================================================================

function assertNumber(val: unknown, name: string): asserts val is number {
  if (typeof val !== 'number' || Number.isNaN(val)) {
    throw new Error(`INVALID_PAYLOAD: ${name} must be a number`);
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
const CALC_ORG_ID = '5b6sw6p5uzti';
const CALC_BASIC_PERM = 'calc:basic';
const CALC_SCI_PERM = 'calc:scientific';

function calcConfig(perm: string, handler: ActionConfig['handler']): ActionConfig {
  return {
    requiredOrgId: CALC_ORG_ID,
    requiredRoleId: CALC_ROLE_ID,
    requiredPermId: perm,
    handler,
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
    const rounded = Math.round(n);
    if (rounded < 0 || rounded > 170) throw new Error('INVALID_PAYLOAD: factorial out of range');
    let r = 1;
    for (let j = 2; j <= rounded; j++) r *= j;
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
