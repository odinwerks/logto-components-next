import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  ValidationError,
} from './validation';

const mockTranslations = {
  phoneE164Format: 'Phone must be E.164 format',
  invalidEmailFormat: 'Invalid email format',
  emailTooLong: 'Email too long (max 128 characters)',
  passwordRequired: 'Password is required',
  passwordTooLong: 'Password too long (max 256 characters)',
  codeMustBeSixDigits: 'Code must be exactly 6 digits',
  verificationIdRequired: 'Verification ID is required',
  usernameTooShort: 'Username too short (min 3 characters)',
  usernameTooLong: 'Username too long (max 32 characters)',
  usernameInvalidCharacters: 'Username can only contain letters, numbers, underscores, and hyphens',
  urlInvalidProtocol: 'URL must use http or https protocol',
  urlInvalidFormat: 'Invalid URL format',
  jsonMustBeObject: 'Must be a JSON object (not array or null)',
  invalidJson: 'Invalid JSON',
  unknownError: 'Unknown error',
};

describe('validateEmail', () => {
  it('should not throw for valid email', () => {
    expect(() => validateEmail('test@example.com', mockTranslations)).not.toThrow();
  });

  it('should throw ValidationError for invalid email', () => {
    expect(() => validateEmail('invalid-email', mockTranslations)).toThrow(ValidationError);
  });
});

describe('validatePassword', () => {
  it('should not throw for valid password', () => {
    expect(() => validatePassword('securePassword123', mockTranslations)).not.toThrow();
  });

  it('should throw ValidationError for empty password', () => {
    expect(() => validatePassword('', mockTranslations)).toThrow(ValidationError);
  });
});

describe('validateUsername', () => {
  it('should not throw for valid username', () => {
    expect(() => validateUsername('valid_user-123', mockTranslations)).not.toThrow();
  });

  it('should throw ValidationError for username too short', () => {
    expect(() => validateUsername('ab', mockTranslations)).toThrow(ValidationError);
  });

  it('should throw ValidationError for username too long', () => {
    expect(() => validateUsername('a'.repeat(33), mockTranslations)).toThrow(ValidationError);
  });
});
