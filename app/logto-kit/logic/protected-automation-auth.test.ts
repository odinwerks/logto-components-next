// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createServer, type Server } from 'node:http';

const introspectMock = vi.fn();
let endpoint = '';
const resource = 'https://resource.example.test';
let jwksBody = JSON.stringify({ keys: [] });

function mutateJwtSignature(token: string): string {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) throw new Error('test token is not compact JWT');

  const signatureBytes = Buffer.from(signature, 'base64url');
  if (signatureBytes.length === 0) throw new Error('test JWT signature is empty');
  signatureBytes[0] ^= 0x01;

  return `${header}.${payload}.${signatureBytes.toString('base64url')}`;
}

vi.mock('./utils', () => ({
  getCleanEndpoint: () => endpoint,
  introspectToken: introspectMock,
}));

describe('protected automation bearer JWT validation', () => {
  beforeEach(() => {
    process.env.PROTECTED_API_RESOURCE = resource;
    introspectMock.mockReset();
  });

  let server: Server;
  beforeEach(async () => {
    server = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(jwksBody);
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind');
    endpoint = `http://127.0.0.1:${address.port}`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    server.close();
  });

  async function makeToken(options: {
    audience?: string;
    issuer?: string;
    subject?: string;
    expired?: boolean;
  } = {}) {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    jwksBody = JSON.stringify({ keys: [{ ...jwk, kid: 'automation-test', alg: 'RS256' }] });

    return new SignJWT({ scope: 'calc:basic', organization_id: 'org-1' })
      .setProtectedHeader({ alg: 'RS256', kid: 'automation-test' })
      .setIssuer(options.issuer ?? endpoint)
      .setAudience(options.audience ?? resource)
      .setSubject(options.subject ?? 'user-123')
      .setIssuedAt()
      .setExpirationTime(options.expired ? '0s' : '5m')
      .sign(privateKey);
  }

  it('requires the configured API audience and agrees with introspection subject', async () => {
    introspectMock.mockResolvedValue({ active: true, sub: 'user-123' });
    const token = await makeToken();

    const { authenticateProtectedAutomationBearer } = await import('./protected-automation');
    const result = await authenticateProtectedAutomationBearer(token);

    expect(result.ok).toBe(true);
    expect(introspectMock).toHaveBeenCalledTimes(1);
    if (result.ok) {
      expect(result.context.userId).toBe('user-123');
      expect(result.context.scopes).toEqual(['calc:basic']);
      expect(result.context.organizationId).toBe('org-1');
    }
  });

  it('rejects the wrong API audience before introspection', async () => {
    const token = await makeToken({ audience: 'https://wrong-resource.example.test' });

    const { authenticateProtectedAutomationBearer } = await import('./protected-automation');
    const result = await authenticateProtectedAutomationBearer(token);

    expect(result).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    expect(introspectMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid JWT signature before introspection', async () => {
    const validToken = await makeToken();
    const invalidSignature = mutateJwtSignature(validToken);

    const { authenticateProtectedAutomationBearer } = await import('./protected-automation');
    const result = await authenticateProtectedAutomationBearer(invalidSignature);

    expect(result).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    expect(introspectMock).not.toHaveBeenCalled();
  });

  it('rejects a wrong issuer before introspection', async () => {
    const token = await makeToken({ issuer: 'http://wrong-issuer.example.test' });

    const { authenticateProtectedAutomationBearer } = await import('./protected-automation');
    const result = await authenticateProtectedAutomationBearer(token);

    expect(result).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    expect(introspectMock).not.toHaveBeenCalled();
  });

  it('rejects an expired JWT before introspection', async () => {
    const token = await makeToken({ expired: true });

    const { authenticateProtectedAutomationBearer } = await import('./protected-automation');
    const result = await authenticateProtectedAutomationBearer(token);

    expect(result).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    expect(introspectMock).not.toHaveBeenCalled();
  });

  it('rejects a subject mismatch between verified JWT and introspection', async () => {
    introspectMock.mockResolvedValue({ active: true, sub: 'different-user' });
    const token = await makeToken();

    const { authenticateProtectedAutomationBearer } = await import('./protected-automation');
    const result = await authenticateProtectedAutomationBearer(token);

    expect(result).toEqual({ ok: false, code: 'UNAUTHORIZED' });
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a primitive', 'malformed-introspection'],
    ['a response without active', { sub: 'user-123' }],
    ['a response with a non-boolean active value', { active: 'true', sub: 'user-123' }],
    ['an active response without a subject', { active: true }],
    ['an active response with an empty subject', { active: true, sub: '' }],
  ])('rejects %s introspection responses without invoking downstream authorization', async (_label, response) => {
    introspectMock.mockResolvedValue(response);
    const token = await makeToken();

    const { authenticateProtectedAutomationBearer } = await import('./protected-automation');
    const result = await authenticateProtectedAutomationBearer(token);

    expect(result).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    expect(introspectMock).toHaveBeenCalledTimes(1);
  });

  it('rejects an inactive introspection result after valid JWT verification', async () => {
    introspectMock.mockResolvedValue({ active: false });
    const token = await makeToken();

    const { authenticateProtectedAutomationBearer } = await import('./protected-automation');
    const result = await authenticateProtectedAutomationBearer(token);

    expect(result).toEqual({ ok: false, code: 'UNAUTHORIZED' });
    expect(introspectMock).toHaveBeenCalledTimes(1);
  });
});
