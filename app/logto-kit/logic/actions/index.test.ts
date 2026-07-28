import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ============================================================================
// CAN-ACT-001 regression guard.
//
// `makeRequest` is the generic Logto Account API fetch helper used internally
// by every domain action (mfa, profile, verification, sessions, ...). It must
// NOT be:
//
//   1. A directly-callable Server Action — i.e. `request.ts` must NOT carry a
//      file-level `'use server'` directive. Otherwise any authenticated
//      same-origin caller could POST to the action endpoint with arbitrary
//      `/api/*` mutation paths and serializable options, and the upstream
//      request would run with the server-held session token *before*
//      return-value serialization. That bypasses the domain-action DTO
//      validation, identity-verification enforcement, fixed action results,
//      and audit paths that wrap every other exported action. (Logto endpoint
//      and token policy still bound the request, and tokens are not exposed
//      in the Response — but the authorization-policy bypass alone is the
//      vulnerability.)
//
//   2. Re-exported from the actions barrel — i.e. `index.ts` must not surface
//      `makeRequest` to consumers. Even without `'use server'`, a named barrel
//      re-export invites client/server-action reference files to reach it, and
//      a wildcard `export * from './request'` would do the same implicitly.
//
// We assert on the source text directly instead of importing the barrel.
// Importing the barrel eagerly pulls in *every* action module's dependency
// graph (Logto SDK, config, cookies, request helpers, ...) which would require
// broad mocking and make this regression guard fragile. The structural
// invariant — a specific name must not appear in the barrel's exports, and a
// specific directive must not appear at the top of request.ts — is exactly the
// property we need to defend here, so a source-text assertion is the most
// direct and stable expression of it.
//
// `node:fs` is used (rather than Vite's `import.meta.glob` with `?raw`) so the
// test stays statically type-clean under the project's `tsc` config without
// needing ambient `vite/client` types. `fileURLToPath(import.meta.url)` resolves
// to this test file's own directory, so the sibling source paths are stable
// regardless of the current working directory.
// ============================================================================

const here = dirname(fileURLToPath(import.meta.url));
const indexSource = readFileSync(join(here, 'index.ts'), 'utf8');
const requestSource = readFileSync(join(here, 'request.ts'), 'utf8');

describe('CAN-ACT-001: makeRequest must not be a directly-callable Server Action', () => {
  it('barrel and request sources were loaded (sanity)', () => {
    // Guards against the glob silently returning nothing and the assertions
    // below passing vacuously on an empty string.
    expect(indexSource.length).toBeGreaterThan(0);
    expect(requestSource.length).toBeGreaterThan(0);
  });

  it('request.ts has no file-level "use server" directive', () => {
    // A leading 'use server' string literal marks every exported function in
    // the file as a POST-reachable Server Action. makeRequest must NOT be one.
    // Trim leading whitespace/newlines so the anchor matches regardless of any
    // top-of-file spacing.
    expect(/^['"]use server['"];?/.test(requestSource.trimStart())).toBe(false);
  });

  it('request.ts imports the server-only marker', () => {
    // Confirms the file is pinned to the server runtime and cannot be
    // accidentally pulled into a client bundle.
    expect(/^import\s+['"]server-only['"];?/m.test(requestSource)).toBe(true);
  });

  it('barrel does not re-export makeRequest by name', () => {
    // Catches:  export { makeRequest } from './request'
    //           export { makeRequest as foo } from './request'
    //           export { foo, makeRequest, bar } from './request'
    // The [^}]* spans are scoped to a single { ... } block, so this only
    // matches when makeRequest is literally one of the exported names.
    const namedExportPattern = /export\s*\{[^}]*\bmakeRequest\b[^}]*\}/;
    expect(namedExportPattern.test(indexSource)).toBe(false);
  });

  it('barrel does not wildcard re-export from ./request', () => {
    // Catches:  export * from './request'
    // A wildcard re-export would surface makeRequest to barrel consumers even
    // though it is no longer named in the barrel.
    const wildcardPattern = /export\s*\*\s+from\s*['"]\.\/request['"]/;
    expect(wildcardPattern.test(indexSource)).toBe(false);
  });

  it('barrel still re-exports other actions (not gutted by the fix)', () => {
    // Sanity check: a known-unrelated export must still be present so the
    // regression guard cannot pass trivially if the barrel is emptied.
    expect(indexSource).toMatch(/export\s*\{\s*fetchDashboardData\s*\}/);
  });
});