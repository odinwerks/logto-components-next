/**
 * Clock skew tolerance for verification staleness checks.
 * 
 * 15 seconds forward tolerance only (no backward tolerance).
 * - App clock AHEAD of Logto: allows 15s grace to prevent user lockout (availability)
 * - App clock BEHIND Logto: no tolerance - cannot detect locally without external time source
 * - Logto's default verification TTL is 10 minutes (600,000 ms), so 15s = 2.5% of window
 */
export const VERIFICATION_CLOCK_SKEW_TOLERANCE_MS = 15_000;
