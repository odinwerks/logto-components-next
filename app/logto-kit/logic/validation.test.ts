import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateUrl,
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
  phoneCountryNotAllowed: 'Phone number from this country is not supported',
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

describe('validateUrl', () => {
  it('should not throw for valid HTTP/HTTPS URLs', () => {
    expect(() => validateUrl('http://localhost:3000', mockTranslations)).not.toThrow();
    expect(() => validateUrl('https://example.com/some/path?query=1#hash', mockTranslations)).not.toThrow();
  });

  it('should not throw if URL is empty or falsy', () => {
    expect(() => validateUrl('', mockTranslations)).not.toThrow();
  });

  it('should throw ValidationError for malformed URLs', () => {
    expect(() => validateUrl('invalid-url', mockTranslations)).toThrow(ValidationError);
    expect(() => validateUrl('http://', mockTranslations)).toThrow(ValidationError);
  });

  it('should throw ValidationError for non-HTTP/HTTPS protocols', () => {
    expect(() => validateUrl('ftp://example.com', mockTranslations)).toThrow(ValidationError);
    expect(() => validateUrl('javascript:alert(1)', mockTranslations)).toThrow(ValidationError);
  });
});

// LOGIC-BUG-002: validateUrl must separate URL parsing errors from protocol errors
describe('validateUrl', () => {
  it('does not throw for valid http URL', () => {
    expect(() => validateUrl('http://example.com', mockTranslations)).not.toThrow();
  });

  it('does not throw for valid https URL', () => {
    expect(() => validateUrl('https://example.com/path?q=1', mockTranslations)).not.toThrow();
  });

  it('does not throw for empty string (no-op)', () => {
    expect(() => validateUrl('', mockTranslations)).not.toThrow();
  });

  it('throws urlInvalidFormat for a completely malformed URL', () => {
    let error: ValidationError | undefined;
    try {
      validateUrl('not-a-url-at-all', mockTranslations);
    } catch (e) {
      error = e as ValidationError;
    }
    expect(error).toBeInstanceOf(ValidationError);
    expect(error?.message).toBe(mockTranslations.urlInvalidFormat);
  });

  it('throws urlInvalidProtocol (not urlInvalidFormat) for a valid URL with wrong scheme', () => {
    // This is the key regression test for LOGIC-BUG-002:
    // ftp://example.com is a valid URL but the wrong protocol.
    // The old code swallowed it as urlInvalidFormat; the new code surfaces urlInvalidProtocol.
    let error: ValidationError | undefined;
    try {
      validateUrl('ftp://example.com/file.txt', mockTranslations);
    } catch (e) {
      error = e as ValidationError;
    }
    expect(error).toBeInstanceOf(ValidationError);
    expect(error?.message).toBe(mockTranslations.urlInvalidProtocol);
  });

  it('throws urlInvalidProtocol for javascript: scheme', () => {
    let error: ValidationError | undefined;
    try {
      validateUrl('javascript:alert(1)', mockTranslations);
    } catch (e) {
      error = e as ValidationError;
    }
    expect(error).toBeInstanceOf(ValidationError);
    expect(error?.message).toBe(mockTranslations.urlInvalidProtocol);
  });

  it('throws urlInvalidProtocol for data: scheme', () => {
    let error: ValidationError | undefined;
    try {
      validateUrl('data:text/html,<h1>hi</h1>', mockTranslations);
    } catch (e) {
      error = e as ValidationError;
    }
    expect(error).toBeInstanceOf(ValidationError);
    expect(error?.message).toBe(mockTranslations.urlInvalidProtocol);
  });
});
