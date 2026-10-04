import type { ActionConfig } from '../logic/types';

const PROTECTED_CONTEXT_MODES = ['session', 'external'] as const;
const PERMISSION_BINDINGS = ['union', 'required-role'] as const;

function throwImproper(actionName: string, detail: string): never {
  throw new Error(`IMPROPER_SETUP_ERROR: Action "${actionName}" ${detail}`);
}

/**
 * Validates the generic extended ActionConfig contract.
 *
 * Catalog-specific policy belongs to the catalog registry. This validator
 * checks only context modes, permission binding, and their generic shape rules.
 */
function validateExtendedPolicy(config: ActionConfig, actionName: string): void {
  if (config.credentialModes !== undefined) {
    if (!Array.isArray(config.credentialModes) || config.credentialModes.length === 0) {
      throwImproper(
        actionName,
        'declares an empty or non-array credentialModes. When present, credentialModes must list at least one context mode.'
      );
    }

    for (const mode of config.credentialModes) {
      if (!(PROTECTED_CONTEXT_MODES as readonly string[]).includes(mode)) {
        throwImproper(
          actionName,
          `declares unknown credential mode "${String(mode)}". Allowed modes: ${PROTECTED_CONTEXT_MODES.join(', ')}.`
        );
      }
    }
  }

  if (
    config.permissionBinding !== undefined &&
    !(PERMISSION_BINDINGS as readonly string[]).includes(config.permissionBinding)
  ) {
    throwImproper(
      actionName,
      `declares invalid permissionBinding "${String(config.permissionBinding)}". Allowed: ${PERMISSION_BINDINGS.join(', ')}.`
    );
  }

  const roleIsAny = config.requiredRoleId === 'any';
  const permIsAny = config.requiredPermId === 'any';
  if (roleIsAny || permIsAny) {
    if (!(roleIsAny && permIsAny && config.requiredOrgId === 'self')) {
      throwImproper(
        actionName,
        'may use the \'any\' sentinel for requiredRoleId/requiredPermId ONLY when BOTH are exactly \'any\' AND requiredOrgId === \'self\'.'
      );
    }

    if (config.credentialModes?.includes('external')) {
      throwImproper(
        actionName,
        'must not allow external context when it uses the self + \'any\'/\'any\' sentinel.'
      );
    }
  }

  if (Array.isArray(config.requiredRoleId) && config.requiredRoleId.includes('any')) {
    throwImproper(actionName, 'must not mix the \'any\' sentinel inside requiredRoleId arrays.');
  }
  if (Array.isArray(config.requiredPermId) && config.requiredPermId.includes('any')) {
    throwImproper(actionName, 'must not mix the \'any\' sentinel inside requiredPermId arrays.');
  }

  if (config.permissionBinding === 'required-role') {
    if (
      Array.isArray(config.requiredRoleId) ||
      typeof config.requiredRoleId !== 'string' ||
      config.requiredRoleId.length === 0
    ) {
      throwImproper(
        actionName,
        'declares permissionBinding \'required-role\' and therefore requires a single-string requiredRoleId (not an array).'
      );
    }
    if (!Array.isArray(config.requiredPermId) || config.requiredPermId.length === 0) {
      throwImproper(
        actionName,
        'declares permissionBinding \'required-role\' and therefore requires a non-empty requiredPermId array.'
      );
    }
  }
}

/**
 * Returns an array of missing required field names from an ActionConfig.
 * An empty array means the required fields are present and well-shaped.
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
    ? config.requiredRoleId.length > 0 && config.requiredRoleId.every(
      (value) => typeof value === 'string' && value.trim().length > 0,
    )
    : typeof config.requiredRoleId === 'string' && config.requiredRoleId.length > 0;
  if (!hasRole) {
    missing.push('requiredRoleId');
  }

  const hasPerm = Array.isArray(config.requiredPermId)
    ? (config.requiredPermId.length > 0 && config.requiredPermId.every(
      (value) => typeof value === 'string' && value.trim().length > 0,
    )) ||
      (config.requiredPermId.length === 0 && config.permissionBinding === 'required-role')
    : typeof config.requiredPermId === 'string' && config.requiredPermId.length > 0;
  if (!hasPerm) {
    missing.push('requiredPermId');
  }

  return missing;
}

/**
 * Validates that an ActionConfig defines all three required RBAC check categories.
 * Throws IMPROPER_SETUP_ERROR with details if any field is missing or empty.
 */
export function validateActionConfig(config: ActionConfig, actionName: string): void {
  const missing = getMissingActionFields(config);

  if (missing.length > 0) {
    throw new Error(
      `IMPROPER_SETUP_ERROR: Action "${actionName}" is missing required fields: ${missing.join(', ')}. ` +
      'Every protected action MUST define requiredOrgId, requiredRoleId, and requiredPermId.'
    );
  }

  validateExtendedPolicy(config, actionName);
}
