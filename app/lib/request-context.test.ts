import { describe, it, expect } from 'vitest';
import {
  requestContext,
  getRequestId,
  getRequestBindings,
} from './request-context';

describe('request-context', () => {
  it('getRequestId returns undefined outside a request scope', () => {
    expect(getRequestId()).toBeUndefined();
  });

  it('getRequestBindings returns {} outside a request scope', () => {
    expect(getRequestBindings()).toEqual({});
  });

  it('getRequestId returns the requestId inside requestContext.run', () => {
    const testId = 'test-request-id-123';
    requestContext.run({ requestId: testId }, () => {
      expect(getRequestId()).toBe(testId);
    });
  });

  it('getRequestBindings returns { requestId } inside requestContext.run', () => {
    const testId = 'test-request-id-456';
    requestContext.run({ requestId: testId }, () => {
      expect(getRequestBindings()).toEqual({ requestId: testId });
    });
  });

  it('getRequestId returns undefined after requestContext.run exits', () => {
    const testId = 'test-request-id-789';
    requestContext.run({ requestId: testId }, () => {
      expect(getRequestId()).toBe(testId);
    });
    expect(getRequestId()).toBeUndefined();
  });

  it('propagates across async hops inside requestContext.run', async () => {
    const testId = 'async-request-id';
    await requestContext.run({ requestId: testId }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(getRequestId()).toBe(testId);
    });
  });

  it('supports nested contexts (inner overrides outer)', () => {
    const outerId = 'outer-id';
    const innerId = 'inner-id';
    requestContext.run({ requestId: outerId }, () => {
      expect(getRequestId()).toBe(outerId);
      requestContext.run({ requestId: innerId }, () => {
        expect(getRequestId()).toBe(innerId);
      });
      expect(getRequestId()).toBe(outerId);
    });
  });
});
