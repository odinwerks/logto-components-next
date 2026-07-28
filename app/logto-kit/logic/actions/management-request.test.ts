import { describe, expect, it, vi } from 'vitest';
import {
  MANAGEMENT_REQUEST_TIMEOUT_MS,
  ManagementRequestDeadlineExceededError,
  parseManagementResponseJson,
  getManagementRequestTimeoutMs,
} from './management-request';

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
