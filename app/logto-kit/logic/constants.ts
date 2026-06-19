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
 * 10 minutes from now. We allow an additional 20-minute buffer (30 minutes total)
 * to tolerate realistic client clock skew behind the server while still blocking
 * implausibly far-future timestamps that indicate tampering or severe misconfiguration.
 *
 * Previous value was 11 minutes (10 min TTL + 1 min buffer), which broke users
 * with more than 1 minute of clock skew behind the Logto server.
 */
export const LOGTO_VERIFICATION_MAX_FUTURE_MS = 30 * 60 * 1000;
