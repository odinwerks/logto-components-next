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

  it('handles different ports as different origins (production, no localhost bypass)', () => {
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = checkSameOrigin(makeRequest('http://localhost:4000'));
      expect(res).not.toBeNull();
      expect(res?.status).toBe(403);
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }
  });

  it('rejects when no base URL is configured, even in non-production', () => {
    delete process.env.BASE_URL;
    delete process.env.PUBLIC_BASE_URL;
    delete process.env.APP_URL;
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const req = new NextRequest('http://localhost:3000/api/wipe', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
      });
      const res = checkSameOrigin(req);
      expect(res).not.toBeNull();
      expect(res?.status).toBe(403);
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }
  });

  it('returns 403 when BASE_URL is not configured in production', () => {
    delete process.env.BASE_URL;
    delete process.env.PUBLIC_BASE_URL;
    delete process.env.APP_URL;
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const req = new NextRequest('http://localhost:3000/api/wipe', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
      });
      const res = checkSameOrigin(req);
      expect(res).not.toBeNull();
      expect(res?.status).toBe(403);
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
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

  // PUBLIC_BASE_URL and APP_URL fallback
  it('uses PUBLIC_BASE_URL when BASE_URL is not set', () => {
    delete process.env.BASE_URL;
    process.env.PUBLIC_BASE_URL = 'https://beta.example.org';
    delete process.env.APP_URL;
    try {
      const req = new NextRequest('http://beta.example.org/api/wipe', {
        method: 'POST',
        headers: { origin: 'https://beta.example.org' },
      });
      const res = checkSameOrigin(req);
      expect(res).toBeNull();
    } finally {
      delete process.env.PUBLIC_BASE_URL;
    }
  });

  it('uses APP_URL when neither BASE_URL nor PUBLIC_BASE_URL is set', () => {
    delete process.env.BASE_URL;
    delete process.env.PUBLIC_BASE_URL;
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
    }
  });

  // Dev localhost support
  describe('in non-production (dev)', () => {
    const prevNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = prevNodeEnv;
    });

    it('allows localhost origin when BASE_URL is a remote URL', () => {
      process.env.BASE_URL = 'https://beta.example.org';
      const req = new NextRequest('http://localhost:3000/api/wipe', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
      });
      const res = checkSameOrigin(req);
      expect(res).toBeNull();
    });

    it('allows localhost:any-port origin when BASE_URL is remote', () => {
      process.env.BASE_URL = 'https://beta.example.org';
      const req = new NextRequest('http://localhost:3000/api/wipe', {
        method: 'POST',
        headers: { origin: 'http://localhost:8420' },
      });
      const res = checkSameOrigin(req);
      expect(res).toBeNull();
    });

    it('allows 127.0.0.1 origin when BASE_URL is a remote URL', () => {
      process.env.BASE_URL = 'https://beta.example.org';
      const req = new NextRequest('http://127.0.0.1:3000/api/wipe', {
        method: 'POST',
        headers: { origin: 'http://127.0.0.1:3000' },
      });
      const res = checkSameOrigin(req);
      expect(res).toBeNull();
    });

    it('still allows same-origin POST when BASE_URL is remote and origin matches', () => {
      process.env.BASE_URL = 'https://beta.example.org';
      const req = new NextRequest('http://beta.example.org/api/wipe', {
        method: 'POST',
        headers: { origin: 'https://beta.example.org' },
      });
      const res = checkSameOrigin(req);
      expect(res).toBeNull();
    });

    it('rejects cross-origin from non-localhost when BASE_URL is remote', () => {
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

  // Production strict mode
  describe('in production', () => {
    const prevNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = prevNodeEnv;
    });

    it('rejects localhost origin when BASE_URL is remote (no dev bypass)', () => {
      process.env.BASE_URL = 'https://beta.example.org';
      const req = new NextRequest('http://beta.example.org/api/wipe', {
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

    it('rejects 127.0.0.1 origin (no dev bypass)', () => {
      process.env.BASE_URL = 'https://beta.example.org';
      const req = new NextRequest('http://beta.example.org/api/wipe', {
        method: 'POST',
        headers: { origin: 'http://127.0.0.1:3000' },
      });
      const res = checkSameOrigin(req);
      expect(res).not.toBeNull();
      expect(res?.status).toBe(403);
    });
  });
});
