import { describe, it, expect } from 'vitest';
import { validateActionConfig } from './validate-action-config';
import type { ActionConfig, ProtectedContextMode } from '../logic/types';

const validConfig: ActionConfig = {
  requiredOrgId: 'org-123',
  requiredRoleId: 'role-1',
  requiredPermId: 'perm:1',
  handler: async () => ({}),
};

describe('validateActionConfig', () => {
  it('does not throw for a valid config with string fields', () => {
    expect(() => validateActionConfig(validConfig, 'test-action')).not.toThrow();
  });

  it('does not throw for a valid config with array fields', () => {
    const config: ActionConfig = {
      ...validConfig,
      requiredRoleId: ['role-1', 'role-2'],
      requiredPermId: ['perm:1', 'perm:2'],
    };
    expect(() => validateActionConfig(config, 'test-action')).not.toThrow();
  });

  it('throws when requiredOrgId is empty string', () => {
    const config: ActionConfig = { ...validConfig, requiredOrgId: '' };
    expect(() => validateActionConfig(config, 'test-action')).toThrow(
      /IMPROPER_SETUP_ERROR.*test-action.*requiredOrgId/
    );
  });

  it('throws when requiredRoleId is empty array', () => {
    const config: ActionConfig = { ...validConfig, requiredRoleId: [] };
    expect(() => validateActionConfig(config, 'test-action')).toThrow(
      /IMPROPER_SETUP_ERROR.*test-action.*requiredRoleId/
    );
  });

  it('throws when requiredRoleId is empty string', () => {
    const config: ActionConfig = { ...validConfig, requiredRoleId: '' };
    expect(() => validateActionConfig(config, 'test-action')).toThrow(
      /IMPROPER_SETUP_ERROR.*test-action.*requiredRoleId/
    );
  });

  it('throws when requiredPermId is empty array', () => {
    const config: ActionConfig = { ...validConfig, requiredPermId: [] };
    expect(() => validateActionConfig(config, 'test-action')).toThrow(
      /IMPROPER_SETUP_ERROR.*test-action.*requiredPermId/
    );
  });

  it('throws when requiredPermId is empty string', () => {
    const config: ActionConfig = { ...validConfig, requiredPermId: '' };
    expect(() => validateActionConfig(config, 'test-action')).toThrow(
      /IMPROPER_SETUP_ERROR.*test-action.*requiredPermId/
    );
  });

  it('reports all missing fields at once', () => {
    const config: ActionConfig = {
      requiredOrgId: '',
      requiredRoleId: [],
      requiredPermId: '',
      handler: async () => ({}),
    };
    expect(() => validateActionConfig(config, 'bad-action')).toThrow(/requiredOrgId/);
    expect(() => validateActionConfig(config, 'bad-action')).toThrow(/requiredRoleId/);
    expect(() => validateActionConfig(config, 'bad-action')).toThrow(/requiredPermId/);
  });

  it('rejects empty and non-string elements in role and permission arrays', () => {
    for (const config of [
      { ...validConfig, requiredRoleId: ['role-1', ''] },
      { ...validConfig, requiredRoleId: ['role-1', 7] as unknown as string[] },
      { ...validConfig, requiredPermId: ['perm:1', '   '] },
      { ...validConfig, requiredPermId: ['perm:1', null] as unknown as string[] },
    ]) {
      expect(() => validateActionConfig(config, 'bad-array')).toThrow('IMPROPER_SETUP_ERROR');
    }
  });
});

describe('validateActionConfig — credentialModes', () => {
  it('accepts session, external, and combined modes', () => {
    for (const credentialModes of [['session'], ['external'], ['session', 'external']] as const) {
      expect(() => validateActionConfig({ ...validConfig, credentialModes: [...credentialModes] }, 'a')).not.toThrow();
    }
  });

  it('rejects an empty credentialModes array', () => {
    expect(() => validateActionConfig({ ...validConfig, credentialModes: [] }, 'a')).toThrow(
      /IMPROPER_SETUP_ERROR.*credentialModes/,
    );
  });

  it('rejects unknown credential modes', () => {
    const config: ActionConfig = {
      ...validConfig,
      credentialModes: ['session', 'bogus'] as unknown as ProtectedContextMode[],
    };
    expect(() => validateActionConfig(config, 'a')).toThrow(/IMPROPER_SETUP_ERROR.*bogus/);
  });
});

describe('validateActionConfig — permissionBinding', () => {
  it('accepts union and required-role shapes', () => {
    expect(() => validateActionConfig({ ...validConfig, permissionBinding: 'union' }, 'a')).not.toThrow();
    expect(() => validateActionConfig({
      ...validConfig,
      permissionBinding: 'required-role',
      requiredPermId: ['perm:1'],
    }, 'a')).not.toThrow();
  });

  it('rejects unknown permission bindings', () => {
    const config: ActionConfig = {
      ...validConfig,
      permissionBinding: 'loose' as unknown as 'union',
    };
    expect(() => validateActionConfig(config, 'a')).toThrow(/IMPROPER_SETUP_ERROR.*permissionBinding/);
  });
});

describe('validateActionConfig — self sentinel', () => {
  it('accepts self + any/any for default session context', () => {
    const config: ActionConfig = {
      requiredOrgId: 'self',
      requiredRoleId: 'any',
      requiredPermId: 'any',
      handler: async () => ({}),
    };
    expect(() => validateActionConfig(config, 'self-action')).not.toThrow();
  });

  it('rejects any unless both fields use the sentinel and the org is self', () => {
    const configs: ActionConfig[] = [
      { ...validConfig, requiredRoleId: 'any', requiredPermId: 'any' },
      { requiredOrgId: 'self', requiredRoleId: 'any', requiredPermId: 'perm:1', handler: async () => ({}) },
      { requiredOrgId: 'self', requiredRoleId: 'role-1', requiredPermId: 'any', handler: async () => ({}) },
    ];
    for (const config of configs) {
      expect(() => validateActionConfig(config, 'a')).toThrow(/IMPROPER_SETUP_ERROR.*'any'/);
    }
  });

  it('rejects any when mixed into role or permission arrays', () => {
    const configs: ActionConfig[] = [
      { ...validConfig, requiredRoleId: ['role-1', 'any'] },
      { ...validConfig, requiredPermId: ['perm:1', 'any'] },
    ];
    for (const config of configs) {
      expect(() => validateActionConfig(config, 'a')).toThrow(/IMPROPER_SETUP_ERROR.*'any'/);
    }
  });

  it('rejects external mode for the self + any/any sentinel', () => {
    const config: ActionConfig = {
      requiredOrgId: 'self',
      requiredRoleId: 'any',
      requiredPermId: 'any',
      credentialModes: ['session', 'external'],
      handler: async () => ({}),
    };
    expect(() => validateActionConfig(config, 'self-action')).toThrow(/IMPROPER_SETUP_ERROR.*external context/);
  });
});

describe('validateActionConfig — required-role binding shape', () => {
  it('requires one role id and a non-empty permission array', () => {
    const invalidConfigs: ActionConfig[] = [
      { ...validConfig, permissionBinding: 'required-role', requiredRoleId: ['role-1'], requiredPermId: ['perm:1'] },
      { ...validConfig, permissionBinding: 'required-role', requiredPermId: [] },
      { ...validConfig, permissionBinding: 'required-role', requiredPermId: 'perm:1' },
    ];
    for (const config of invalidConfigs) {
      expect(() => validateActionConfig(config, 'a')).toThrow('IMPROPER_SETUP_ERROR');
    }
  });
});
