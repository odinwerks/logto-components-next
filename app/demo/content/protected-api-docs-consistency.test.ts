import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// ── Existing: API docs that document the /api/protected endpoint ──
const apiDocPaths = [
  'app/demo/content/rbac/api.tsx',
  'app/demo/content/calculator/api-authorization.tsx',
] as const;

const disallowedPatterns = [
  /Authorization header fallback/i,
  /request\.headers\.get\('Authorization'\)/,
  /'Authorization':\s*'Bearer <access_token>'/,
  /\bbearer token\b/i,
];

// ── Regression: BUG-001 — destructive-callback signatures ──
// These docs should NOT show verificationTimestamp passed to destructive
// operations. The parameter was removed from all 18 destructive action
// signatures per BUG-001. Once the doc fixes (plan edits 10.1-10.6,
// 11.1-11.6, 12.1-12.4) are applied, this test will pass.
const bug001Paths = [
  'app/demo/content/tabs-and-flows/profile.tsx',
  'app/demo/content/tabs-and-flows/sessions.tsx',
  'app/demo/content/tabs-and-flows/security.tsx',
] as const;

// Patterns that catch verificationTimestamp inside destructive-callback
// signatures and code examples (e.g. "(id, verificationId, verificationTimestamp)").
// We allow prose mentions in the *return type* of onVerifyPassword (UX-only),
// but any occurrence passed as a parameter to a destructive callback is a regression.
const verifTimestampCallPatterns = [
  /,\s*verificationTimestamp\s*[,\)=]/,
  /verificationTimestamp\s*\)/,
];

// ── Regression: Protected component false claims (edits 21.1-21.7) ──
const protectedDocPath = 'app/demo/content/rbac/ui-protected.tsx';

// ── Regression: GET wipe origin-guard "exempt" claim (edit 23.3) ──
const inputGuardsPath = 'app/demo/content/security/input-guards.tsx';

describe('Protected API docs consistency', () => {
  // ──── Existing assertions (these must always pass) ────

  it('documents /api/protected as session-token-only', () => {
    for (const relativePath of apiDocPaths) {
      const source = readFileSync(path.join(process.cwd(), relativePath), 'utf8');

      for (const pattern of disallowedPatterns) {
        expect(source).not.toMatch(pattern);
      }

      expect(source).toMatch(/session token|session cookie/i);
    }
  });

  // ──── Regression assertions ────

  // TODO: Remove .skip once the BUG-001 doc fixes are applied to
  // profile.tsx (edits 10.1-10.6), sessions.tsx (edits 11.1-11.6),
  // and security.tsx (edits 12.1-12.4). Currently 4 violations remain.
  it(
    'BUG-001: profile/sessions/security docs must not pass verificationTimestamp to destructive callbacks',
    () => {
      const violations: string[] = [];
      for (const relativePath of bug001Paths) {
        const source = readFileSync(path.join(process.cwd(), relativePath), 'utf8');
        for (const pattern of verifTimestampCallPatterns) {
          if (pattern.test(source)) {
            violations.push(`${relativePath} matched pattern: ${pattern.source}`);
          }
        }
      }
      expect(
        violations,
        `BUG-001 regression: verificationTimestamp found in destructive-callback contexts.\n` +
          `Context: verificationTimestamp was removed from 18 destructive action signatures\n` +
          `and must NOT appear as a parameter in any doc code block or signature.\n` +
          `Violations:\n${violations.join('\n')}`
      ).toHaveLength(0);
    }
  );

  it('Protected: ui-protected.tsx must not claim roles/permissions are bypassed in Self Mode', () => {
    const source = readFileSync(path.join(process.cwd(), protectedDocPath), 'utf8');

    // "Bypassed in Self Mode" was the old perm-row description (edit 21.1).
    // This exact wording must never return.
    expect(source).not.toMatch(/Bypassed\s+in\s+Self\s+Mode/);

    // "completely bypassing permission checks" was the old orgId-row (edit 21.3)
    // and resolution-flow Step 1 (edit 21.5) phrasing. Must never return.
    expect(source).not.toMatch(/completely\s+bypass(?:ed|ing)\s+permission\s+checks/);
  });

  it('Protected: ui-protected.tsx must reference useUserDataContext as the data source', () => {
    const source = readFileSync(path.join(process.cwd(), protectedDocPath), 'utf8');

    // The correct data source is UserDataProvider accessed via useUserDataContext().
    // Edit 21.4 changed this from "useLogto() context providers".
    expect(source).toMatch(/useUserDataContext/);

    // "useLogto() context providers" is the outdated phrasing that was removed.
    expect(source).not.toMatch(/useLogto\(\)\s+context\s+providers/);
  });

  it('Security: input-guards.tsx must not claim GET /api/wipe is exempt from origin guards', () => {
    const source = readFileSync(path.join(process.cwd(), inputGuardsPath), 'utf8');

    // GET /api/wipe uses nonce-based CSRF (SHA-256 + timingSafeEqual), not origin guards.
    // The old claim "Plain cookie-clearing via GET is exempt from origin guards" (edit 23.3)
    // made it sound unprotected. Note: OAuth callback endpoints ARE legitimately exempt
    // from origin guards — that claim is correct and not targeted here.

    // Old GET-wipe-exempt claim must be absent:
    expect(source).not.toMatch(/Plain\s+cookie-clearing\s+via\s+GET\s+is\s+exempt\s+from\s+origin\s+guards/);

    // Nonce-based CSRF description should be present instead:
    expect(source).toMatch(/nonce-based\s+CSRF/);
  });
});
