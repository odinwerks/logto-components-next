import type { Translations } from '../locales';

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const E164_REGEX = /^\+[1-9]\d{1,14}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

export function validateE164(phone: string, t: Translations['validation'], field = 'phone'): void {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (!E164_REGEX.test(cleaned)) {
    throw new ValidationError(t.phoneE164Format, field);
  }
}

export function validateEmail(email: string, t: Translations['validation'], field = 'email'): void {
  if (!EMAIL_REGEX.test(email)) {
    throw new ValidationError(t.invalidEmailFormat, field);
  }
  if (email.length > 128) {
    throw new ValidationError(t.emailTooLong, field);
  }
}

export function validatePassword(password: string, t: Translations['validation'], field = 'password'): void {
  if (!password || password.length === 0) {
    throw new ValidationError(t.passwordRequired, field);
  }
  if (password.length > 256) {
    throw new ValidationError(t.passwordTooLong, field);
  }
}

export function validateVerificationCode(code: string, t: Translations['validation'], field = 'code'): void {
  if (!/^\d{6}$/.test(code)) {
    throw new ValidationError(t.codeMustBeSixDigits, field);
  }
}

export function validateVerificationId(id: string, t: Translations['validation'], field = 'verificationId'): void {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new ValidationError(t.verificationIdRequired, field);
  }
}

export function validateUsername(username: string, t: Translations['validation'], field = 'username'): void {
  if (!username) return;
  if (username.length < 3) {
    throw new ValidationError(t.usernameTooShort, field);
  }
  if (username.length > 32) {
    throw new ValidationError(t.usernameTooLong, field);
  }
  if (!USERNAME_REGEX.test(username)) {
    throw new ValidationError(t.usernameInvalidCharacters, field);
  }
}

export function validateUrl(url: string, t: Translations['validation'], field = 'url'): void {
  if (!url) return;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new ValidationError(t.urlInvalidProtocol, field);
    }
  } catch {
    throw new ValidationError(t.urlInvalidFormat, field);
  }
}

export function validateJsonObject(value: string, t: Translations['validation'], field = 'json'): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new ValidationError(t.jsonMustBeObject, field);
    }
    return parsed;
  } catch (e) {
    if (e instanceof ValidationError) throw e;
    throw new ValidationError(
      `${t.invalidJson}: ${e instanceof Error ? e.message : 'parse error'}`,
      field
    );
  }
}

export function sanitizeLogtoError(errorText: string | null | undefined): string {
  if (!errorText) return 'Unknown error';

  return String(errorText)
    .replace(/https?:\/\/\S+/g, '[URL]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    .replace(/\+[1-9]\d{1,14}/g, '[PHONE]')
    .replace(/[A-Za-z0-9_-]{20,}/g, '[TOKEN]')
    .substring(0, 200);
}

export type ValidationResult<T = void> =
  | { success: true; value: T }
  | { success: false; error: string; field?: string };
