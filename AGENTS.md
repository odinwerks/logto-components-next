# Next.js DevTools MCP

**When starting work on a Next.js project, ALWAYS call the `init` tool from next-devtools-mcp FIRST to set up proper context and establish documentation requirements. Do this automatically without being asked.**

This initializes the MCP context and ensures the AI assistant uses official Next.js documentation for all queries.

# NEVER TOUCH Rules

These functions/environmental constants must NEVER be modified without explicit approval and verification against git history + Logto docs:

## M2M Management API Token (`app/logto-kit/config.ts :: getManagementApiToken`)

- **`scope`** MUST be `'all'`. Do NOT remove it, do NOT change it to `''`. The M2M client_credentials flow requires explicit scope. The blast radius is determined by Logto Console permissions, not this string.
- **`resource`** for Logto OSS MUST be `'https://default.logto.app/api'` (hardcoded default). For Logto Cloud, it's `https://[tenant-id].logto.app/api` and should be set via `LOGTO_M2M_RESOURCE` env var.
- **Fallback chain**: `process.env.LOGTO_M2M_RESOURCE || 'https://default.logto.app/api'` — do NOT derive from ENDPOINT.
- These values are confirmed by Logto's official Management API documentation. Always verify against Logto MCP before proposing changes.

## Origin Guard (`app/logto-kit/logic/origin-guard.ts :: checkSameOrigin`)

- **Do NOT add to auth routes** (`/api/auth/sign-in`, `/api/auth/sign-out`). Logto's OAuth `state` parameter provides CSRF protection for these flows. Adding `checkSameOrigin` there breaks local dev when BASE_URL doesn't match the browser's Origin.
- **Only use on** `/api/wipe` and `/api/protected` — routes that don't go through Logto's OAuth flow and need CSRF protection.
- **Source chain**: `process.env.BASE_URL || process.env.APP_URL` — no localhost bypasses, no PUBLIC_BASE_URL fallback.

## Auth Redirect (`app/page.tsx`)

- Unauthenticated users redirect to **`/callback`**, not `/api/auth/sign-in`.
- The Logto SDK's `handleSignIn()` in the callback route handles BOTH OAuth callback AND sign-in initiation when no OAuth params are present.
- Do NOT add state/param guards before `handleSignIn()` — the SDK needs to see the raw request params to decide what to do.

## Env Vars

- `LOGTO_M2M_RESOURCE` is derived from `'https://default.logto.app/api'` by default and should NOT be required. Do not add throw-guards for it.
- `BASE_URL` should always fall back to `'http://localhost:3000'` where used in route handlers (not in `checkSameOrigin`).

## General Rules

- Before claiming a working pattern is a "bug," check git history to see if it was intentionally designed that way.
- Verify against Logto MCP (`Logto_queryKnowledgeBase`) before changing any OAuth/M2M/token-related code.
- When a commit introduces multiple changes, trace back to the last known-working commit and diff carefully.

# Commands

```bash
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npm test             # Vitest watch mode
npm run test:run     # Vitest single run
npm run lint         # Next.js lint
npm run type-check   # tsc --noEmit
```
