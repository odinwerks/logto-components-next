/**
 * ============================================================================
 * Input guards for server-action trust boundaries
 * ============================================================================
 *
 * Every `'use server'` function is callable from the browser with arbitrary
 * arguments. This file collects the validators used at every such boundary
 * so that the rule "validate at the entry point, never downstream" can be
 * followed consistently.
 *
 * Design goals:
 *
 *   1. Every guard `throws` on bad input — callers never have to check a
 *      return value. Throws a `ValidationError` so the sanitisation layer
 *      can produce a fixed error code in production.
 *
 *   2. Use `@logto/js` helpers where Logto ships one (base64url-correct
 *      token decode, etc.). Hand-roll the rest.
 *
 *   3. Every guard has an explicit corpus of inputs in `guards.test.ts` so
 *      regressions are caught on CI.
 *
 * Threat model:
 *
 *   - Path / query injection in URLs built from client-controlled IDs.
 *   - Mass-assignment of user customData with unexpected keys / prototype
 *     pollution.
 *   - Malformed or truncated JWT payloads that decode to empty-permission
 *     sets (fail-closed but noisy).
 *   - Bad MIME type claims from client in avatar uploads (handled elsewhere
 *     — see actions/avatar.ts magic-byte detection).
 */

import { decodeAccessToken, type AccessTokenClaims } from '@logto/js';
import { ValidationError } from './validation';

// ============================================================================
// ID format guards
// ============================================================================

/**
 * Allowed characters in any Logto-issued ID we accept from the client
 * (user IDs, session IDs, grant IDs, verification record IDs, MFA
 * verification IDs).
 *
 * Logto IDs are opaque alphanumeric strings; we allow underscore and hyphen
 * because the SDK sometimes produces those. Anything else (including `.`,
 * `/`, `?`, `#`, `%`, null byte) is rejected to prevent path/query injection
 * when these IDs are interpolated into URLs.
 */
const SAFE_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

export function assertSafeUserId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !SAFE_ID_REGEX.test(id)) {
    throw new ValidationError('INVALID_USER_ID', 'userId');
  }
}

export function assertSafeLogtoId(
  id: unknown,
  field = 'id',
): asserts id is string {
  if (typeof id !== 'string' || !SAFE_ID_REGEX.test(id)) {
    throw new ValidationError('INVALID_ID', field);
  }
}

// ============================================================================
// Enum / allowlist guards
// ============================================================================

const REVOKE_GRANTS_TARGETS = ['all', 'firstParty'] as const;
export type RevokeGrantsTarget = (typeof REVOKE_GRANTS_TARGETS)[number];

export function assertRevokeGrantsTarget(
  value: unknown,
): asserts value is RevokeGrantsTarget | undefined {
  if (value === undefined || value === null) return;
  if (
    typeof value !== 'string' ||
    !(REVOKE_GRANTS_TARGETS as readonly string[]).includes(value)
  ) {
    throw new ValidationError('INVALID_ENUM', 'revokeGrantsTarget');
  }
}

const MFA_TYPES = ['Totp', 'WebAuthn', 'BackupCode'] as const;
export type MfaType = (typeof MFA_TYPES)[number];

export function assertMfaType(value: unknown): asserts value is MfaType {
  if (typeof value !== 'string' || !(MFA_TYPES as readonly string[]).includes(value)) {
    throw new ValidationError('INVALID_MFA_TYPE', 'type');
  }
}

const VERIFICATION_TYPES = ['email', 'phone'] as const;
export type VerificationType = (typeof VERIFICATION_TYPES)[number];

export function assertVerificationType(
  value: unknown,
): asserts value is VerificationType {
  if (
    typeof value !== 'string' ||
    !(VERIFICATION_TYPES as readonly string[]).includes(value)
  ) {
    throw new ValidationError('INVALID_VERIFICATION_TYPE', 'type');
  }
}

// ============================================================================
// JWT decode (uses @logto/js — correct base64url handling)
// ============================================================================

/**
 * Decodes and shape-asserts a Logto-issued access token (JWT variant).
 * Wraps `@logto/js::decodeAccessToken` to ensure:
 *
 *   - base64url is handled correctly (Node's native base64 decoder mangles
 *     `-` and `_`; `@logto/js` does it properly).
 *   - shape is validated (throws if the decoded body is not an object).
 *
 * This function does NOT verify the JWT signature. Callers that need
 * signature verification must use `jose.jwtVerify` against the Logto JWKS
 * endpoint. For our use cases we either:
 *
 *   - introspect the token on the wire before decoding (validation.ts), OR
 *   - use SDK-provided tokens that are already trusted (organizations.ts).
 *
 * If those assumptions change, switch to `jwtVerify`.
 */
export function decodeLogtoAccessToken(token: unknown): AccessTokenClaims {
  if (typeof token !== 'string' || token.length === 0) {
    throw new ValidationError('INVALID_TOKEN', 'token');
  }
  try {
    return decodeAccessToken(token);
  } catch {
    throw new ValidationError('MALFORMED_TOKEN', 'token');
  }
}

// ============================================================================
// Mass-assignment whitelist for customData.Preferences
// ============================================================================

/**
 * Allowed keys inside `customData.Preferences`.
 *
 * If downstream devs extend this, they must update this allowlist. Having
 * the list in one place makes it auditable.
 */
const PREFERENCES_ALLOWED_KEYS = ['asOrg', 'themeMode', 'language'] as const;

type PreferencesShape = {
  asOrg?: string | null;
  themeMode?: 'light' | 'dark' | 'system';
  language?: string;
};

/**
 * Whitelists allowed Preferences keys, dropping anything else. Used by
 * `updateUserCustomData` to prevent mass-assignment.
 *
 * Validates:
 *   - asOrg: safe Logto ID or null
 *   - themeMode: one of 'light' | 'dark' | 'system'
 *   - language: alphanumeric + hyphen, ≤16 chars (BCP 47 shape)
 *
 * Throws `ValidationError` if any present key has a bad value.
 * Silently drops unknown keys (no throw — downstream must not be able to
 * cause errors by sending garbage they wouldn't otherwise send).
 */
export function pickPreferences(input: unknown): PreferencesShape {
  if (input === null || input === undefined) return {};
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('INVALID_PREFERENCES', 'Preferences');
  }

  const out: PreferencesShape = {};
  const src = input as Record<string, unknown>;

  for (const key of PREFERENCES_ALLOWED_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(src, key)) continue;
    const value = src[key];

    if (key === 'asOrg') {
      if (value === null) {
        out.asOrg = null;
      } else if (typeof value === 'string' && SAFE_ID_REGEX.test(value)) {
        out.asOrg = value;
      } else {
        throw new ValidationError('INVALID_ORG_ID', 'Preferences.asOrg');
      }
    } else if (key === 'themeMode') {
      if (value === 'light' || value === 'dark' || value === 'system') {
        out.themeMode = value;
      } else {
        throw new ValidationError('INVALID_THEME_MODE', 'Preferences.themeMode');
      }
    } else if (key === 'language') {
      if (typeof value === 'string' && /^[A-Za-z0-9-]{1,16}$/.test(value)) {
        out.language = value;
      } else {
        throw new ValidationError('INVALID_LANGUAGE', 'Preferences.language');
      }
    }
  }

  return out;
}

// ============================================================================
// Safe URL builder
// ============================================================================

/**
 * Builds a URL with path segments and query parameters safely encoded.
 *
 * Use this anywhere a client-controlled value is interpolated into a URL
 * path or query string. It prevents:
 *
 *   - Path traversal via `..` segments (rejected up front).
 *   - Query-parameter smuggling by embedding `?` in a path segment.
 *   - Double-encoding mistakes.
 *
 * Paths passed here must be `/`-separated. Segments MUST NOT be pre-encoded;
 * this function calls `encodeURIComponent` on each one.
 *
 * @param base   Base URL or origin — e.g. `https://auth.example.com`.
 * @param path   Path template — e.g. `/api/my-account/sessions/:id`.
 * @param params Replacement values for `:name` placeholders.
 * @param query  Optional query parameters.
 * @returns A fully-qualified URL string.
 */
export function safeUrl(
  base: string,
  path: string,
  params: Record<string, string> = {},
  query: Record<string, string | undefined> = {},
): string {
  const cleanBase = base.replace(/\/+$/, '');
  const normalised = path.startsWith('/') ? path : `/${path}`;

  const filled = normalised.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key) => {
    const value = params[key];
    if (typeof value !== 'string' || value.length === 0) {
      throw new ValidationError('MISSING_URL_PARAM', key);
    }
    if (value.includes('..') || value.includes('/')) {
      throw new ValidationError('INVALID_URL_PARAM', key);
    }
    return encodeURIComponent(value);
  });

  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    usp.set(k, v);
  }
  const qs = usp.toString();

  return `${cleanBase}${filled}${qs ? `?${qs}` : ''}`;
}

// ============================================================================
// Length / content guards for profile fields
// ============================================================================

const MAX_NAME_LEN = 128;
const MAX_USERNAME_LEN = 32;
const MAX_URL_LEN = 2048;

function stripControlChars(s: string): string {
  // strip ASCII control chars except whitespace-ish
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export function assertNameField(
  value: unknown,
  field: string,
): asserts value is string {
  if (value === undefined || value === null) return;
  if (typeof value !== 'string') {
    throw new ValidationError('INVALID_FIELD_TYPE', field);
  }
  if (value.length > MAX_NAME_LEN) {
    throw new ValidationError('FIELD_TOO_LONG', field);
  }
  if (value !== stripControlChars(value)) {
    throw new ValidationError('INVALID_CHARS', field);
  }
}

export function assertUsername(value: unknown): asserts value is string {
  if (value === undefined || value === null || value === '') return;
  if (typeof value !== 'string') {
    throw new ValidationError('INVALID_FIELD_TYPE', 'username');
  }
  if (value.length < 3 || value.length > MAX_USERNAME_LEN) {
    throw new ValidationError('FIELD_TOO_LONG', 'username');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new ValidationError('INVALID_CHARS', 'username');
  }
}

export function assertHttpUrl(value: unknown, field: string): asserts value is string {
  if (value === undefined || value === null || value === '') return;
  if (typeof value !== 'string' || value.length > MAX_URL_LEN) {
    throw new ValidationError('INVALID_URL', field);
  }
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new ValidationError('INVALID_URL_PROTOCOL', field);
    }
  } catch {
    throw new ValidationError('INVALID_URL', field);
  }
}

export function assertVerificationCode(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^\d{6}$/.test(value)) {
    throw new ValidationError('INVALID_CODE', 'code');
  }
}
