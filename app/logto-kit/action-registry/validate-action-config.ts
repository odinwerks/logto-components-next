import type { ActionConfig } from '../logic/types';

/**
 * Returns an array of missing required field names from an ActionConfig.
 * An empty array means the config is valid.
 *
 * Used by the protected route to check config validity at request time
 * without throwing (unlike validateActionConfig which throws).
 */
export function getMissingActionFields(config: ActionConfig): string[] {
  const missing: string[] = [];

  if (!config.requiredOrgId || typeof config.requiredOrgId !== 'string' || config.requiredOrgId.length === 0) {
    missing.push('requiredOrgId');
  }

  const hasRole = Array.isArray(config.requiredRoleId)
    ? config.requiredRoleId.length > 0
    : typeof config.requiredRoleId === 'string' && config.requiredRoleId.length > 0;
  if (!hasRole) {
    missing.push('requiredRoleId');
  }

  const hasPerm = Array.isArray(config.requiredPermId)
    ? config.requiredPermId.length > 0
    : typeof config.requiredPermId === 'string' && config.requiredPermId.length > 0;
  if (!hasPerm) {
    missing.push('requiredPermId');
  }

  return missing;
}

/**
 * Validates that an ActionConfig defines all three required RBAC check categories.
 * Throws IMPROPER_SETUP_ERROR with details if any field is missing or empty.
 *
 * Shared between the action-registry loadActions() and the protected route handler
 * to avoid duplicating validation logic.
 */
export function validateActionConfig(config: ActionConfig, actionName: string): void {
  const missing = getMissingActionFields(config);

  if (missing.length > 0) {
    throw new Error(
      `IMPROPER_SETUP_ERROR: Action "${actionName}" is missing required fields: ${missing.join(', ')}. ` +
      'Every protected action MUST define requiredOrgId, requiredRoleId, and requiredPermId.'
    );
  }
}
