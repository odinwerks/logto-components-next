import { describe, expect, it, vi } from 'vitest';

const introspectMock = vi.hoisted(() => vi.fn());

vi.mock('./utils', () => ({
  getCleanEndpoint: () => 'https://logto.example.test',
  introspectToken: introspectMock,
}));
import {
  authenticateProtectedAutomationBearer,
  evaluateProtectedAutomationCors,
  extractProtectedAutomationBearer,
  parseProtectedAutomationAllowedOrigins,
} from './protected-automation';

describe('protected automation CORS configuration', () => {
  it('defaults blank configuration to wildcard mode', () => {
    const policy = parseProtectedAutomationAllowedOrigins('  ');
    expect(policy.mode).toBe('wildcard');
    expect(evaluateProtectedAutomationCors('null', policy)).toMatchObject({
      allowed: true,
      allowOrigin: '*',
    });
  });

  it('parses exact origins and rejects paths, credentials, queries, hashes, and patterns', () => {
    const policy = parseProtectedAutomationAllowedOrigins(' https://opnform.example.test:8443 ');
    expect(policy.mode).toBe('exact');
    expect(policy.origins.has('https://opnform.example.test:8443')).toBe(true);

    for (const malformed of [
      'https://opnform.example.test/form',
      'https://opnform.example.test/.',
      'https://user:pass@opnform.example.test',
      'https://opnform.example.test?x=1',
      'https://opnform.example.test#fragment',
      'https://opnform.example.test:',
      'https://*.example.test',
      'https://opnform.example.test, *',
    ]) {
      expect(() => parseProtectedAutomationAllowedOrigins(malformed)).toThrow();
    }
  });

  it('rejects malformed URL spellings before URL normalization', () => {
    const malformedWithRuntimeCharacters = [
      'https://opnform.example.test' + '\\',
      'https://opnform.example.test' + String.fromCharCode(0),
      'https:example.com',
      'https:/example.com',
    ];

    for (const malformed of malformedWithRuntimeCharacters) {
      expect(() => parseProtectedAutomationAllowedOrigins(malformed)).toThrow();
    }
  });

  it('does not match an unconfigured exact origin or reflect it', () => {
    const policy = parseProtectedAutomationAllowedOrigins('https://opnform.example.test');
    const decision = evaluateProtectedAutomationCors('https://evil.example.test', policy);
    expect(decision.allowed).toBe(false);
    expect(decision.allowOrigin).toBeUndefined();
  });
});

describe('protected automation bearer extraction', () => {
  it('accepts only a non-empty bearer credential', () => {
    expect(extractProtectedAutomationBearer(new Request('https://example.test', {
      headers: { Authorization: 'Bearer exchanged-token' },
    }))).toBe('exchanged-token');
    expect(extractProtectedAutomationBearer(new Request('https://example.test', {
      headers: { Authorization: 'Bearer ' },
    }))).toBeNull();
    expect(extractProtectedAutomationBearer(new Request('https://example.test', {
      headers: { Authorization: 'Basic credentials' },
    }))).toBeNull();
  });

  it('rejects a raw PAT before any token introspection or exchange', async () => {
    process.env.PROTECTED_API_RESOURCE = 'https://resource.example.test';
    const result = await authenticateProtectedAutomationBearer('pat_never-send-this-to-the-api');
    expect(result).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    expect(introspectMock).not.toHaveBeenCalled();
  });
});
