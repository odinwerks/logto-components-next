'use server';

import { captureMessage } from '../capture-message';

export type ActionResult = { ok: true } | { ok: false; error: string };
export type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function safeAction<T>(fn: () => Promise<T>): Promise<DataResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: captureMessage(err) };
  }
}
