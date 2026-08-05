/**
 * Server-sealed verification cookie (BUG-001 / defense-in-depth fix).
 *
 * Previously, `verificationTimestamp` (Logto's `expiresAt`) was returned to the
 * client by `verifyPasswordForIdentity` and round-tripped back as a parameter to
 * every destructive server action. Because Next.js server actions are publicly
 * addressable RPC endpoints, a malicious client could substitute
 * `verificationTimestamp = Date.now()` (or any value within the 30-minute
 * future cap) and bypass `assertVerificationNotExpired`. Logto's server-side
 * `logto-verification-id` TTL was the only real gate; the local check gave
 * false assurance.
 *
 * This module replaces that round-trip with a server-sealed, httpOnly, HMAC-
 * signed cookie. After `verifyPasswordForIdentity` succeeds, it seals
 * `{ recordId, expiresAt }` into the cookie. Each destructive action reads the
 * cookie, verifies the HMAC, binds the sealed `recordId` to the client-supplied
 * `identityVerificationRecordId`, and runs the staleness check against the
 * server-sealed `expiresAt` — a value the client cannot tamper with.
 *
 * Security properties:
 *   - httpOnly: client JS cannot read or forge the cookie.
 *   - HMAC-SHA256: tamper-evident; a forged cookie is rejected via
 *     `crypto.timingSafeEqual`.
 *   - Bound to `recordId`: a cookie sealed for verification A cannot authorize
 *     an action presenting verification B's `identityVerificationRecordId`.
 *   - Multi-instance safe: the signing key comes from an env var shared across
 *     instances — no shared server-side state required.
 *   - Short-lived: `maxAge` of 15 minutes (Logto's verification TTL is 10 min);
 *     the sealed `expiresAt` is the authoritative expiry and is re-checked on
 *     every action.
 *
 * This module is server-only. It must never be imported by client components.
 */

import 'server-only';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { assertVerificationNotExpired } from './helpers';
import { assertSafeLogtoId } from '../guards';
import { plainCode } from '../errors';
import { getTokenForServerAction } from './tokens';
import { introspectToken } from '../utils';

/** Cookie name. Not prefixed with `logto_` so it is distinct from SDK cookies. */
export const VERIFICATION_COOKIE_NAME = 'logto-verification-seal';

/** Cookie lifetime in seconds. 15 minutes (Logto's verification TTL is 10 min). */
export const VERIFICATION_COOKIE_MAX_AGE_SECONDS = 15 * 60;

/** Domain-separation prefix for the HMAC message (key reuse safety). */
const SIGNING_DOMAIN = 'logto-verification-cookie-v2';
const MAX_VERIFICATION_SEALS = 4;

export interface SealedVerification {
  /** The `verificationRecordId` returned by `verifyPasswordForIdentity`. */
  recordId: string;
  /** Logto's `expiresAt` for the verification record, in ms since epoch. */
  expiresAt: number;
  /** The server-derived user ID (sub) from session token introspection (CAN-ACT-002). */
  sub: string;
}

/**
 * Resolves the HMAC signing key.
 *
 * Preferred: `LOGTO_VERIFICATION_COOKIE_SECRET` (dedicated, 16+ chars).
 * Fallback: `COOKIE_SECRET` (reused with domain separation).
 * Dev/test: a deterministic insecure key (never used in production).
 *
 * @throws In production if neither secret is set (fail-closed).
 */
function getSigningKey(): Buffer {
  const explicit = process.env.LOGTO_VERIFICATION_COOKIE_SECRET;
  const cookieSecret = process.env.COOKIE_SECRET;
  const raw = explicit || cookieSecret;
  if (raw && raw.length >= 16) {
    return Buffer.from(raw, 'utf8');
  }
  if (process.env.NODE_ENV !== 'production') {
    return Buffer.from('dev-insecure-verification-secret', 'utf8');
  }
  throw new Error(
    'LOGTO_VERIFICATION_COOKIE_SECRET (or COOKIE_SECRET) must be set in production',
  );
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/** HMAC-SHA256 of `<domain>.<b64payload>` → base64url. */
function sign(key: Buffer, b64payload: string): string {
  return base64url(
    crypto.createHmac('sha256', key).update(`${SIGNING_DOMAIN}.${b64payload}`).digest(),
  );
}

/**
 * Seals `{ recordId, expiresAt, sub }` into an httpOnly, HMAC-signed cookie.
 *
 * Called by `verifyPasswordForIdentity` after Logto confirms the password.
 * Must run inside a Server Action or Route Handler (mutates cookies).
 */
export async function sealVerificationCookie(
  recordId: string,
  expiresAt: number,
  sub: string,
): Promise<void> {
  if (typeof recordId !== 'string' || recordId.length === 0) {
    throw plainCode('VERIFICATION_FAILED');
  }
  if (!Number.isFinite(expiresAt)) {
    throw plainCode('VERIFICATION_FAILED');
  }
  if (typeof sub !== 'string' || sub.length === 0) {
    throw plainCode('VERIFICATION_FAILED');
  }
  const key = getSigningKey();
  // Keep a small bounded set so a second verification in another tab does not
  // invalidate the first legitimate operation. Each entry remains covered by
  // the same HMAC, user binding, and server-authoritative expiry check.
  const existing = await readVerificationEntries();
  const entries = [
    { r: recordId, e: expiresAt, s: sub },
    ...existing.filter((entry) => entry.r !== recordId),
  ].slice(0, MAX_VERIFICATION_SEALS);
  const payload = JSON.stringify({ v: 2, seals: entries });
  const b64 = base64url(payload);
  const sig = sign(key, b64);
  const cookieStore = await cookies();
  cookieStore.set(VERIFICATION_COOKIE_NAME, `${b64}.${sig}`, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: VERIFICATION_COOKIE_MAX_AGE_SECONDS,
  });
}

/**
 * Reads and verifies the sealed verification cookie.
 *
 * @returns The sealed `{ recordId, expiresAt }` if the cookie is present and
 *   its HMAC is valid, otherwise `null`. Never throws for missing/tampered
 *   cookies — callers decide how to surface the failure.
 */
export async function readVerificationCookie(): Promise<SealedVerification | null> {
  const entries = await readVerificationEntries();
  const entry = entries[0];
  return entry ? { recordId: entry.r, expiresAt: entry.e, sub: entry.s } : null;
}

type SealedEntry = { r: string; e: number; s: string };

async function readVerificationEntries(): Promise<SealedEntry[]> {
  let value: string | undefined;
  try {
    const cookieStore = await cookies();
    value = cookieStore.get(VERIFICATION_COOKIE_NAME)?.value;
  } catch {
    return [];
  }
  if (!value || typeof value !== 'string') return [];

  // Split on the LAST '.' so a payload containing '.' (base64url never does,
  // but be defensive) is handled correctly.
  const dotIndex = value.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === value.length - 1) return [];
  const b64 = value.slice(0, dotIndex);
  const sig = value.slice(dotIndex + 1);

  let key: Buffer;
  try {
    key = getSigningKey();
  } catch {
    // No signing key configured (production misconfig) → treat as no cookie.
    return [];
  }

  const expected = sign(key, b64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  // Length check before timingSafeEqual (it throws on mismatched lengths).
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return [];
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
  } catch {
    return [];
  }
  if (typeof payload !== 'object' || payload === null) return [];
  const object = payload as Record<string, unknown>;
  const rawEntries = Array.isArray(object.seals)
    ? object.seals
    : [object]; // accept cookies issued before the bounded multi-seal format
  return rawEntries.filter((entry): entry is Record<string, unknown> => {
    if (typeof entry !== 'object' || entry === null) return false;
    const r = entry.r;
    const e = entry.e;
    const s = entry.s;
    return typeof r === 'string' && r.length > 0 && typeof e === 'number'
      && Number.isFinite(e) && typeof s === 'string' && s.length > 0;
  }).map((entry) => ({ r: entry.r as string, e: entry.e as number, s: entry.s as string }));
}

/**
 * Clears the sealed verification cookie (best-effort).
 *
 * Called after account deletion and other terminal flows.
 */
export async function clearVerificationCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(VERIFICATION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
  } catch {
    // Best-effort; never surface cookie errors to the caller.
  }
}

/**
 * Verifies a destructive action is covered by a valid, server-sealed
 * verification, bound to the supplied `identityVerificationRecordId` and
 * the current session user (CAN-ACT-002).
 *
 * This replaces the old `assertVerificationNotExpired(clientTimestamp)` call at
 * every destructive action entry point. It:
 *   1. Introspects the current session to get the live user ID (sub).
 *   2. Reads the sealed cookie and verifies its HMAC (tamper-evident).
 *   3. Validates the client-supplied record ID format (defense in depth).
 *   4. Binds the sealed `sub` to the live session sub, preventing a seal
 *      created for User A from being reused by User B on the same browser.
 *   5. Binds the sealed `recordId` to the client-supplied record ID, so a
 *      cookie from verification A cannot authorize verification B.
 *   6. Runs the staleness check against the server-sealed `expiresAt`.
 *
 * @throws A sanitized `VERIFICATION_EXPIRED` error (via `plainCode`) if the
 *   cookie is missing, tampered, unbound, session-mismatched, or expired.
 */
export async function requireVerifiedIdentity(
  identityVerificationRecordId: string,
): Promise<void> {
  // Introspect the current session to get the live user ID (server-derived).
  const sessionToken = await getTokenForServerAction();
  const introspection = await introspectToken(sessionToken, { assertAudience: true });
  if (!introspection.active || !introspection.sub) {
    throw plainCode('VERIFICATION_EXPIRED');
  }

  const sealed = (await readVerificationEntries())
    .find((entry) => entry.r === identityVerificationRecordId);
  if (!sealed) {
    throw plainCode('VERIFICATION_EXPIRED');
  }
  // Bind the seal's sub to the live session sub (CAN-ACT-002).
  // If User A verified their password and User B tries to use the seal,
  // this throws because the sub values differ.
  if (sealed.s !== introspection.sub) {
    throw plainCode('VERIFICATION_EXPIRED');
  }
  // Validate the client-supplied ID format before comparing (defense in depth).
  assertSafeLogtoId(identityVerificationRecordId, 'identityVerificationRecordId');
  // Bind the sealed record to the record the caller is presenting to Logto.
  // Staleness check against the server-sealed expiry (not client-supplied).
  assertVerificationNotExpired(sealed.e);
}
