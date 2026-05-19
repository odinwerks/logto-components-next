import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { checkSameOrigin } from './origin-guard';

function makeRequest(origin: string | null, baseUrl = 'http://localhost:3000'): NextRequest {
  process.env.BASE_URL = baseUrl;
  const req = new NextRequest('http://localhost:3000/api/wipe', {
    method: 'POST',
    headers: origin ? { origin } : {},
  });
  return req;
}

describe('checkSameOrigin', () => {
  it('returns null (allows) for same-origin POST', () => {
    const res = checkSameOrigin(makeRequest('http://localhost:3000'));
    expect(res).toBeNull();
  });

  it('returns 403 for cross-origin request', () => {
    const res = checkSameOrigin(makeRequest('https://evil.com'));
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });

  it('returns 403 when Origin header is missing (fail-closed)', () => {
    const res = checkSameOrigin(makeRequest(null));
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });

  it('returns 403 for null-origin header', () => {
    const res = checkSameOrigin(makeRequest('null'));
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });

  it('handles different ports as different origins', () => {
    const res = checkSameOrigin(makeRequest('http://localhost:4000'));
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });

  it('rejects when no base URL is configured', () => {
    delete process.env.BASE_URL;
    delete process.env.APP_URL;
    try {
      const req = new NextRequest('http://localhost:3000/api/wipe', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
      });
      const res = checkSameOrigin(req);
      expect(res).not.toBeNull();
      expect(res?.status).toBe(403);
    } finally {
      process.env.BASE_URL = 'http://localhost:3000';
    }
  });

  it('rejects referer header as origin (only Origin header accepted)', () => {
    process.env.BASE_URL = 'http://localhost:3000';
    const req = new NextRequest('http://localhost:3000/api/wipe', {
      method: 'POST',
      headers: { referer: 'http://localhost:3000/some-page' },
    });
    const res = checkSameOrigin(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });

  it('uses APP_URL when BASE_URL is not set', () => {
    delete process.env.BASE_URL;
    process.env.APP_URL = 'https://app.example.org';
    try {
      const req = new NextRequest('http://app.example.org/api/wipe', {
        method: 'POST',
        headers: { origin: 'https://app.example.org' },
      });
      const res = checkSameOrigin(req);
      expect(res).toBeNull();
    } finally {
      delete process.env.APP_URL;
      process.env.BASE_URL = 'http://localhost:3000';
    }
  });

  it('rejects localhost origin when BASE_URL is a remote URL', () => {
    process.env.BASE_URL = 'https://beta.example.org';
    const req = new NextRequest('http://localhost:3000/api/wipe', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
    });
    const res = checkSameOrigin(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });

  it('allows matching origin when BASE_URL is remote', () => {
    process.env.BASE_URL = 'https://beta.example.org';
    const req = new NextRequest('http://beta.example.org/api/wipe', {
      method: 'POST',
      headers: { origin: 'https://beta.example.org' },
    });
    const res = checkSameOrigin(req);
    expect(res).toBeNull();
  });

  it('rejects cross-origin when BASE_URL is remote', () => {
    process.env.BASE_URL = 'https://beta.example.org';
    const req = new NextRequest('http://beta.example.org/api/wipe', {
      method: 'POST',
      headers: { origin: 'https://evil.com' },
    });
    const res = checkSameOrigin(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });
});
