import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateUrl,
  validateE164,
  validateJsonObject,
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

// BUG-L-002: validateE164 should strip all non-digits to match cleanPhoneNumber()
describe('validateE164', () => {
  it('accepts a plain E.164 phone number with +', () => {
    // digits after stripping: 18005551234 — valid
    expect(() => validateE164('+18005551234', mockTranslations)).not.toThrow();
  });

  it('accepts phone with spaces and dashes (common user input)', () => {
    // +1 (800) 555-1234 → digits: 18005551234
    expect(() => validateE164('+1 (800) 555-1234', mockTranslations)).not.toThrow();
  });

  it('accepts phone with only spaces and dashes stripped', () => {
    expect(() => validateE164('+1-800-555-1234', mockTranslations)).not.toThrow();
  });

  it('throws for empty string after digit stripping', () => {
    expect(() => validateE164('', mockTranslations)).toThrow(ValidationError);
  });

  it('throws for non-numeric-only input with no valid phone digits', () => {
    expect(() => validateE164('abc', mockTranslations)).toThrow(ValidationError);
  });

  it('throws for number starting with 0 (not valid E.164 country code)', () => {
    // Stripped digits: 01234567890 — starts with 0, fails /^[1-9]\d{1,14}$/
    expect(() => validateE164('+01234567890', mockTranslations)).toThrow(ValidationError);
  });
});

// BUG-049: validateJsonObject must strip __proto__ and constructor keys
describe('validateJsonObject - BUG-049 prototype pollution prevention', () => {
  it('returns valid JSON object with normal keys intact', () => {
    const result = validateJsonObject('{"name":"test","value":42}', mockTranslations);
    expect(result).toEqual({ name: 'test', value: 42 });
  });

  it('strips __proto__ key from parsed object', () => {
    const result = validateJsonObject('{"__proto__":{"polluted":"yes"},"safe":true}', mockTranslations);
    expect(result).toEqual({ safe: true });
    expect(Object.hasOwn(result, '__proto__')).toBe(false);
  });

  it('strips constructor key from parsed object', () => {
    const result = validateJsonObject('{"constructor":{"evil":true},"safe":true}', mockTranslations);
    expect(result).toEqual({ safe: true });
    expect(Object.hasOwn(result, 'constructor')).toBe(false);
  });

  it('strips both __proto__ and constructor when both present', () => {
    const result = validateJsonObject('{"__proto__":{"a":1},"constructor":{"b":2},"ok":"yes"}', mockTranslations);
    expect(result).toEqual({ ok: 'yes' });
    expect(Object.hasOwn(result, '__proto__')).toBe(false);
    expect(Object.hasOwn(result, 'constructor')).toBe(false);
  });

  it('does not modify prototype of returned object', () => {
    validateJsonObject('{"__proto__":{"polluted":"yes"}}', mockTranslations);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('throws ValidationError for invalid JSON', () => {
    expect(() => validateJsonObject('not json', mockTranslations)).toThrow(ValidationError);
  });

  it('throws ValidationError for JSON array', () => {
    expect(() => validateJsonObject('[1,2,3]', mockTranslations)).toThrow(ValidationError);
  });

  it('throws ValidationError for JSON null', () => {
    expect(() => validateJsonObject('null', mockTranslations)).toThrow(ValidationError);
  });

  it('throws ValidationError for JSON string primitive', () => {
    expect(() => validateJsonObject('"hello"', mockTranslations)).toThrow(ValidationError);
  });
});

// BUG-050: validateJsonObject must never leak raw error details in ValidationError.message
describe('validateJsonObject - BUG-050 error message safety', () => {
  it('throws ValidationError with safe unknownError message for malformed JSON', () => {
    let error: ValidationError | undefined;
    try {
      validateJsonObject('{invalid json!!}', mockTranslations);
    } catch (e) {
      error = e as ValidationError;
    }
    expect(error).toBeInstanceOf(ValidationError);
    expect(error?.message).toBe(mockTranslations.unknownError);
    // Must NOT contain raw parse error details
    expect(error?.message).not.toContain('SyntaxError');
    expect(error?.message).not.toContain('Unexpected');
  });

  it('throws ValidationError with safe unknownError message regardless of NODE_ENV', () => {
    // Even in dev mode, the message should not contain raw error details.
    // Previously, isDev would append ': ' + e.message.
    let error: ValidationError | undefined;
    try {
      validateJsonObject('<<<bad>>>', mockTranslations);
    } catch (e) {
      error = e as ValidationError;
    }
    expect(error).toBeInstanceOf(ValidationError);
    expect(error?.message).toBe('Unknown error');
    expect(error?.message).not.toContain('<<<');
  });

  it('sets field property on thrown ValidationError for invalid JSON', () => {
    let error: ValidationError | undefined;
    try {
      validateJsonObject('{bad}', mockTranslations, 'customData');
    } catch (e) {
      error = e as ValidationError;
    }
    expect(error).toBeInstanceOf(ValidationError);
    expect(error?.field).toBe('customData');
  });
});
