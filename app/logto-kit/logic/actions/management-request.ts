/**
 * Shared helper for direct Management API fetch calls.
 *
 * Prevents the 13 duplicate timeout additions required by BUG-M-010.
 * Applies a 15-second per-request timeout, Authorization header, and JSON
 * content-type automatically for all Management API calls.
 */

export const MANAGEMENT_REQUEST_TIMEOUT_MS = 15_000;

/** Raised before starting a request that would exceed a caller's shared deadline. */
export class ManagementRequestDeadlineExceededError extends Error {
  constructor() {
    super('Management request deadline exceeded');
    this.name = 'ManagementRequestDeadlineExceededError';
  }
}

/** Throws when a caller's shared Management API deadline has elapsed. */
export function throwIfManagementDeadlineExceeded(deadlineAt?: number): void {
  if (deadlineAt !== undefined && deadlineAt - Date.now() <= 0) {
    throw new ManagementRequestDeadlineExceededError();
  }
}

/**
 * Returns the timeout for one request while respecting an optional shared
 * deadline. The deadline is checked before fetch starts, so a new request can
 * never begin after the caller's lock-held budget has elapsed.
 */
export function getManagementRequestTimeoutMs(deadlineAt?: number): number {
  if (deadlineAt === undefined) return MANAGEMENT_REQUEST_TIMEOUT_MS;

  const remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0) throw new ManagementRequestDeadlineExceededError();
  return Math.min(MANAGEMENT_REQUEST_TIMEOUT_MS, remainingMs);
}

/**
 * Awaits response-body work without allowing it to outlive a caller's shared
 * deadline. Fetch's abort signal protects the request itself, but a resolved
 * Response can still reject or hang while its body is consumed.
 */
export async function awaitWithinManagementDeadline<T>(
  operation: Promise<T>,
  deadlineAt?: number,
): Promise<T> {
  if (deadlineAt === undefined) return operation;

  const remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0) throw new ManagementRequestDeadlineExceededError();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ManagementRequestDeadlineExceededError()), remainingMs);
  });

  try {
    return await Promise.race([operation, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Reads a Management API JSON response within the caller's shared deadline. */
export function parseManagementResponseJson<T>(response: Response, deadlineAt?: number): Promise<T> {
  return awaitWithinManagementDeadline(response.json() as Promise<T>, deadlineAt);
}

export async function makeManagementFetch(
  url: string,
  options: {
    method?: string;
    token: string;
    body?: unknown;
    signal?: AbortSignal;
    /** Absolute Date.now() deadline shared by a lock-held request sequence. */
    deadlineAt?: number;
  },
): Promise<Response> {
  const { method = 'GET', token, body, signal, deadlineAt } = options;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const timeoutSignal = AbortSignal.timeout(getManagementRequestTimeoutMs(deadlineAt));
  // An explicitly supplied signal must be additive, never replace the hard
  // timeout. This preserves the Management API request hardening.
  const requestSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;

  return fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    signal: requestSignal,
  });
}
