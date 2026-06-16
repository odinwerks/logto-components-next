/**
 * Shared types for security hooks.
 *
 * These types are used across the security flow hooks to maintain consistent
 * state shapes and avoid duplication.
 */

export interface VerificationToken {
  verificationRecordId: string;
  verificationTimestamp: number;
}

// Step types for each flow
export type TotpStep = 'password' | 'setup';
export type BackupCodesStep = 'confirm' | 'password';
export type PasswordChangeStep = 'password' | 'new-password';
export type PasskeyStep = 'password' | 'register' | 'rename';
export type DeletionStep = 'password';
