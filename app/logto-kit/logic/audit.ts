/**
 * ============================================================================
 * Audit log primitive
 * ============================================================================
 *
 * Provides a structured hook for security-relevant mutations. In development,
 * audit records are logged via `console.info` for readability. In production,
 * they are routed through the shared Pino-aware logger (`log()` from ./log),
 * ensuring they reach whichever backend is configured (console, Pino, or both).
 *
 * Downstream developers can replace the transport by re-exporting a custom
 * audit function from their project's logto-kit config.
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
import { log } from './log';

export interface AuditEntry {
  /** User ID of the actor performing the action. */
  actor: string;
  /** Dot-separated action identifier, e.g. 'password.change', 'mfa.totp.enroll'. */
  action: string;
  /** Resource being acted on - usually a user ID or org ID. */
  resource?: string;
  /** Optional bag of additional structured metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * Logs a security-relevant mutation.
 *
 * - In development: `console.info` with the full entry.
 * - In production: routed through the shared logger (`log()`), which writes
 *   to the configured backend (console, Pino, or both).
 *
 * To customise: create `app/logto-kit/audit-transport.ts` and
 * import + call it here conditionally.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  const record = JSON.stringify({
    ts: new Date().toISOString(),
    ...entry,
  });

  if (isDev) {
    console.info('[AUDIT]', record);
  } else {
    log('[AUDIT]', record);
  }
}
