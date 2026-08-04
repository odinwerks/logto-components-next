/**
 * Shared helper for direct Management API fetch calls.
 *
 * Prevents the 13 duplicate timeout additions required by BUG-M-010.
 * Applies a 15-second per-request timeout, Authorization header, and JSON
 * content-type automatically for all Management API calls.
 */

import { plainCode } from '../errors';

export const MANAGEMENT_REQUEST_TIMEOUT_MS = 15_000;

/** Logto's documented default page size for Management API list endpoints. */
export const MANAGEMENT_LIST_PAGE_SIZE = 20;

/**
 * Fail-closed admin-dashboard safety caps. Five hundred pages / 10,000 items
 * are well above expected RBAC collections while bounding upstream requests
 * and aggregate memory if a buggy or malicious endpoint never exhausts.
 */
export const MANAGEMENT_LIST_MAX_PAGES = 500;
export const MANAGEMENT_LIST_MAX_ITEMS = 10_000;

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

export type ManagementPaginatedResult<T> =
  | { ok: true; data: T[] }
  | { ok: false; response: Response };

/** Raised when a successful Management API list response is not a JSON array. */
export class ManagementPaginationInvalidResponseError extends Error {
  constructor(page: number) {
    super(`Management API pagination page ${page} returned a non-array response`);
    this.name = 'ManagementPaginationInvalidResponseError';
  }
}

/**
 * Fetches a complete Management API collection using Logto's documented
 * one-based `page` / `page_size` contract.
 *
 * The four RBAC list operations do not document a total-count or Link response
 * header, so a short page is the authoritative exhaustion signal. A collection
 * whose size is an exact multiple of the page size therefore performs one final
 * empty-page request. Every successful body is validated as an array.
 *
 * HTTP failures return the failing Response without any accumulated data. This
 * lets each caller preserve its existing status-to-error mapping while making
 * later-page failures fail closed instead of silently authorizing from a
 * partial collection. Network, timeout, and JSON/shape failures reject.
 */
export async function fetchAllManagementPages<T>(
  url: string,
  options: {
    token: string;
    signal?: AbortSignal;
    /** Absolute Date.now() deadline shared by a lock-held request sequence. */
    deadlineAt?: number;
  },
): Promise<ManagementPaginatedResult<T>> {
  const data: T[] = [];

  for (let page = 1; ; page++) {
    if (page > MANAGEMENT_LIST_MAX_PAGES) {
      throw plainCode('FETCH_FAILED');
    }

    const pageUrl = new URL(url);
    pageUrl.searchParams.set('page', String(page));
    pageUrl.searchParams.set('page_size', String(MANAGEMENT_LIST_PAGE_SIZE));

    const response = await makeManagementFetch(pageUrl.toString(), {
      method: 'GET',
      ...options,
    });

    if (!response.ok) {
      return { ok: false, response };
    }

    const pageData = await parseManagementResponseJson<unknown>(response, options.deadlineAt);
    if (!Array.isArray(pageData)) {
      throw new ManagementPaginationInvalidResponseError(page);
    }

    if (data.length + pageData.length > MANAGEMENT_LIST_MAX_ITEMS) {
      throw plainCode('FETCH_FAILED');
    }

    data.push(...(pageData as T[]));
    if (pageData.length < MANAGEMENT_LIST_PAGE_SIZE) {
      return { ok: true, data };
    }
  }
}
