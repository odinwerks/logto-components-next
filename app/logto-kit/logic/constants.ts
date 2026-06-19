/**
 * Clock skew tolerance for verification staleness checks.
 * 
 * 15 seconds forward tolerance only (no backward tolerance).
 * - App clock AHEAD of Logto: allows 15s grace to prevent user lockout (availability)
 * - App clock BEHIND Logto: no tolerance - cannot detect locally without external time source
 * - Logto's default verification TTL is 10 minutes (600,000 ms), so 15s = 2.5% of window
 */
export const VERIFICATION_CLOCK_SKEW_TOLERANCE_MS = 15_000;

/**
 * Maximum allowable future offset for a verification record's expiresAt timestamp.
 *
 * Logto's verification TTL is 10 minutes. A legitimate expiresAt will be at most
 * 10 minutes from now (plus a 1-minute clock-skew buffer = 11 minutes total).
 * Timestamps beyond this window indicate tampering or clock misconfiguration and
 * are rejected to prevent bypass attacks.
 */
export const LOGTO_VERIFICATION_MAX_FUTURE_MS = 11 * 60 * 1000;
