import { describe, expect, it, vi } from 'vitest';
import {
  fetchAllManagementPages,
  MANAGEMENT_LIST_MAX_ITEMS,
  MANAGEMENT_LIST_MAX_PAGES,
  MANAGEMENT_LIST_PAGE_SIZE,
  MANAGEMENT_REQUEST_TIMEOUT_MS,
  ManagementRequestDeadlineExceededError,
  parseManagementResponseJson,
  getManagementRequestTimeoutMs,
} from './management-request';

const mockJsonResponse = <T>(data: T, status = 200): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(''),
  }) as unknown as Response;

describe('getManagementRequestTimeoutMs', () => {
  it('keeps the per-request timeout when no shared deadline is supplied', () => {
    expect(getManagementRequestTimeoutMs()).toBe(MANAGEMENT_REQUEST_TIMEOUT_MS);
  });

  it('limits a later request to the remaining shared lock budget', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(20_000);

    expect(getManagementRequestTimeoutMs(25_000)).toBe(5_000);

    now.mockRestore();
  });

  it('rejects a request once the shared lock deadline has elapsed', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(25_000);

    expect(() => getManagementRequestTimeoutMs(25_000)).toThrow(ManagementRequestDeadlineExceededError);

    now.mockRestore();
  });

  it('bounds a hung response JSON read by the shared deadline', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const response = {
      json: () => new Promise(() => {}),
    } as unknown as Response;

    const parse = parseManagementResponseJson(response, 1_100);
    const expectation = expect(parse).rejects.toBeInstanceOf(ManagementRequestDeadlineExceededError);
    await vi.advanceTimersByTimeAsync(100);

    await expectation;
    vi.useRealTimers();
  });
});

describe('fetchAllManagementPages', () => {
  it('preserves single-page list behavior while sending explicit pagination', async () => {
    const items = [{ id: 'role-1' }, { id: 'role-2' }];
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockJsonResponse(items));

    const result = await fetchAllManagementPages<{ id: string }>(
      'https://auth.example.org/api/users/user-1/roles',
      { token: 'm2m-token' },
    );

    expect(result).toEqual({ ok: true, data: items });
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(
      `https://auth.example.org/api/users/user-1/roles?page=1&page_size=${MANAGEMENT_LIST_PAGE_SIZE}`,
      expect.objectContaining({ method: 'GET' }),
    );
    fetchSpy.mockRestore();
  });

  it('accumulates more than two pages until a short page is returned', async () => {
    const first = Array.from({ length: MANAGEMENT_LIST_PAGE_SIZE }, (_, index) => ({ id: `role-${index}` }));
    const second = Array.from({ length: MANAGEMENT_LIST_PAGE_SIZE }, (_, index) => ({ id: `role-${index + MANAGEMENT_LIST_PAGE_SIZE}` }));
    const third = [{ id: 'role-final' }];
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse(first))
      .mockResolvedValueOnce(mockJsonResponse(second))
      .mockResolvedValueOnce(mockJsonResponse(third));

    const result = await fetchAllManagementPages<{ id: string }>(
      'https://auth.example.org/api/users/user-1/roles',
      { token: 'm2m-token' },
    );

    expect(result).toEqual({ ok: true, data: [...first, ...second, ...third] });
    expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
      `https://auth.example.org/api/users/user-1/roles?page=1&page_size=${MANAGEMENT_LIST_PAGE_SIZE}`,
      `https://auth.example.org/api/users/user-1/roles?page=2&page_size=${MANAGEMENT_LIST_PAGE_SIZE}`,
      `https://auth.example.org/api/users/user-1/roles?page=3&page_size=${MANAGEMENT_LIST_PAGE_SIZE}`,
    ]);
    fetchSpy.mockRestore();
  });

  it('terminates infinite full pages at the page cap with a sanitized error', async () => {
    const fullPage = Array.from({ length: MANAGEMENT_LIST_PAGE_SIZE }, (_, index) => ({
      id: `role-${index}`,
    }));
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => mockJsonResponse(fullPage));

    await expect(
      fetchAllManagementPages('https://auth.example.org/api/users/user-1/roles', {
        token: 'm2m-token',
      }),
    ).rejects.toMatchObject({
      name: 'SanitizedError',
      message: 'FETCH_FAILED',
      code: 'FETCH_FAILED',
    });
    expect(fetchSpy).toHaveBeenCalledTimes(MANAGEMENT_LIST_MAX_PAGES);
    fetchSpy.mockRestore();
  });

  it('fails closed without returning partial data when the item cap is exceeded', async () => {
    const oversizedPage = Array.from({ length: MANAGEMENT_LIST_MAX_ITEMS + 1 }, (_, index) => ({
      id: `role-${index}`,
    }));
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse(oversizedPage));

    await expect(
      fetchAllManagementPages('https://auth.example.org/api/users/user-1/roles', {
        token: 'm2m-token',
      }),
    ).rejects.toMatchObject({
      name: 'SanitizedError',
      message: 'FETCH_FAILED',
      code: 'FETCH_FAILED',
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
    fetchSpy.mockRestore();
  });

  it('returns a later-page failure without exposing partial accumulated data', async () => {
    const first = Array.from({ length: MANAGEMENT_LIST_PAGE_SIZE }, (_, index) => ({ id: `role-${index}` }));
    const failure = mockJsonResponse({ message: 'upstream detail' }, 503);
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse(first))
      .mockResolvedValueOnce(failure);

    const result = await fetchAllManagementPages<{ id: string }>(
      'https://auth.example.org/api/users/user-1/roles',
      { token: 'm2m-token' },
    );

    expect(result).toEqual({ ok: false, response: failure });
    expect(result).not.toHaveProperty('data');
    fetchSpy.mockRestore();
  });

  it('rejects a successful page whose JSON body is not an array', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockJsonResponse({ items: [] }));

    await expect(
      fetchAllManagementPages('https://auth.example.org/api/users/user-1/roles', {
        token: 'm2m-token',
      }),
    ).rejects.toThrow('non-array');
    fetchSpy.mockRestore();
  });
});
