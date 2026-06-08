import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const docsToCheck = [
  'app/demo/content/rbac/api.tsx',
  'app/demo/content/calculator/api-authorization.tsx',
] as const;

const disallowedPatterns = [
  /Authorization header fallback/i,
  /request\.headers\.get\('Authorization'\)/,
  /'Authorization':\s*'Bearer <access_token>'/,
  /\bbearer token\b/i,
];

describe('Protected API docs consistency', () => {
  it('documents /api/protected as session-token-only', () => {
    for (const relativePath of docsToCheck) {
      const source = readFileSync(path.join(process.cwd(), relativePath), 'utf8');

      for (const pattern of disallowedPatterns) {
        expect(source).not.toMatch(pattern);
      }

      expect(source).toMatch(/session token|session cookie/i);
    }
  });
});
