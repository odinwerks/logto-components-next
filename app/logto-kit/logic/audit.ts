/**
 * ============================================================================
 * Audit log primitive
 * ============================================================================
 *
 * Provides a structured hook for security-relevant mutations. The default
 * implementation logs to the server console in dev and is a no-op in
 * production. Downstream developers replace the transport by re-exporting
 * a custom audit function from their project's logto-kit config.
 *
 * Usage (within server actions):
 *
 *   import { audit } from '../audit';
 *   await audit({ actor: userId, action: 'password.change', resource: userId });
 *
 * To replace the transport, create a file at
 * `app/logto-kit/audit-transport.ts` that exports a default async function:
 *
 *   export default async function customTransport(entry: AuditEntry) {
 *     await yourLogger.info('audit', entry);
 *   }
 */

import { isDev } from './dev-mode';

export interface AuditEntry {
  /** User ID of the actor performing the action. */
  actor: string;
  /** Dot-separated action identifier, e.g. 'password.change', 'mfa.totp.enroll'. */
  action: string;
  /** Resource being acted on — usually a user ID or org ID. */
  resource?: string;
  /** Optional bag of additional structured metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * Logs a security-relevant mutation.
 *
 * - In development: `console.info` with the full entry.
 * - In production: **no-op by default.** Zero audit records are produced until
 *   a transport is provided. See docs below for wiring a custom transport.
 *   Without a transport, account deletions, password changes, MFA changes,
 *   and avatar uploads are untracked in production.
 *
 * To add a transport: create `app/logto-kit/audit-transport.ts` and
 * import + call it here conditionally.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  if (isDev) {
    console.info(
      '[AUDIT]',
      JSON.stringify({
        ts: new Date().toISOString(),
        ...entry,
      }),
    );
  }
  // Production: no-op until a transport is provided.
  // To add a transport: create app/logto-kit/audit-transport.ts and
  // import it here conditionally.
}
