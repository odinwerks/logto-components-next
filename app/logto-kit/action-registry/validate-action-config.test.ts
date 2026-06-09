import { describe, it, expect } from 'vitest';
import { validateActionConfig } from './validate-action-config';
import type { ActionConfig } from '../logic/types';

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
});
