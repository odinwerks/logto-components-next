import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// CAN-ACT-011 regression tests
// ============================================================================
//
// These regression tests intentionally do NOT mock `../logic/log` so the real
// `warn` (server-side; gated only by LOG_BACKEND) is exercised end-to-end.
//
// They prove the post-fix contract for `setActiveOrg(null)` operational
// failures:
//   (a) the operational signal is logged server-side EVEN when
//       NEXT_PUBLIC_CLIENT_LOGS=false (the bug: the pre-fix code routed the
//       signal through `clientLog.warn`, which `emit()` early-returns on when
//       NEXT_PUBLIC_CLIENT_LOGS=false, leaving the action with no server-side
//       observability),
//   (b) the action surfaces the failure via the `safeAction` envelope
//       `{ ok: false, error: 'UPDATE_FAILED' }` instead of a bare `false`
//       (which callers could not distinguish from "not authenticated" /
//       "org membership invalid"),
//   (c) raw upstream details do NOT leak to the client or the operational log.
//       The outer action always uses its own fixed `UPDATE_FAILED` code.
//
// Production safety invariant (AGENTS.md): `safeAction` MUST NOT reveal/log
// raw upstream details in production. Only fixed/sanitized codes may reach a
// caller OR the operational signal. The nested action's envelope is treated
// as untrusted at this boundary, even though the normal safeAction contract
// already sanitizes it.
// ============================================================================

vi.mock('@logto/next/server-actions', () => ({
  getLogtoContext: vi.fn(),
}));

vi.mock('../config', () => ({
  getLogtoConfig: vi.fn().mockReturnValue({}),
}));

vi.mock('../logic/actions', () => ({
  updateUserCustomData: vi.fn().mockResolvedValue({ ok: true }),
}));

// NOTE: `../logic/log` is intentionally NOT mocked here so the real `warn`
// runs through `console.warn` (LOG_BACKEND=console).

import { updateUserCustomData } from '../logic/actions';

describe.each([
  ['disabled', 'false'],
  ['enabled', 'true'],
])('setActiveOrg — CAN-ACT-011 server-side operational logging (client logs %s)', (_clientLogsState, clientLogsEnabled) => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Stay on the console path so we can observe `warn` output via console.
    vi.stubEnv('LOG_BACKEND', 'console');
    // The client log toggle must NOT affect the server-side operational signal.
    vi.stubEnv('NEXT_PUBLIC_CLIENT_LOGS', clientLogsEnabled);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('logs null-org persist failures server-side independently of NEXT_PUBLIC_CLIENT_LOGS (CAN-ACT-011)', async () => {
    // `INTERNAL_ERROR` stands in for a real sanitized code the inner
    // `updateUserCustomData` `safeAction` would return on a Management API
    // failure (e.g. http 5xx collapsing via the `server` category).
    vi.mocked(updateUserCustomData).mockResolvedValue({
      ok: false,
      error: 'INTERNAL_ERROR',
    });

    const { setActiveOrg } = await import('./set-active-org');
    const result = await setActiveOrg(null);

    // (a) Server-side `warn` (from `../logic/log`) fires regardless of the
    //     client toggle. The pre-fix `clientLog.warn` would have been silenced
    //     when NEXT_PUBLIC_CLIENT_LOGS=false.
    expect(consoleWarnSpy).toHaveBeenCalled();
    const loggedOutput = consoleWarnSpy.mock.calls[0].join(' ');
    expect(loggedOutput).toContain('[setActiveOrg] null persist failed:');
    expect(loggedOutput).toContain('UPDATE_FAILED');
    expect(loggedOutput).not.toContain('INTERNAL_ERROR');

    // (b) Callers receive the safeAction envelope with the fixed code, NOT a
    //     bare `false`. Distinct from "not authenticated" / "org invalid".
    expect(result).toEqual({ ok: false, error: 'UPDATE_FAILED' });
  });

  it('logs and returns only the fixed code when the nested result contains raw upstream text', async () => {
    // Defense-in-depth: simulate a raw upstream detail that bypassed the inner
    // safeAction contract. The outer action must override it with its own
    // fixed code in both the return envelope and the server log.
    const rawUpstreamDetail =
      'entity.user.patch_failed_internal_db_constraint_violation_at_10_0_0_5';
    vi.mocked(updateUserCustomData).mockResolvedValue({
      ok: false,
      error: rawUpstreamDetail,
    });

    const { setActiveOrg } = await import('./set-active-org');
    const result = await setActiveOrg(null);

    // (c) The client envelope carries the outer action's fixed code ONLY.
    expect(result).toEqual({ ok: false, error: 'UPDATE_FAILED' });
    if (!result.ok) {
      // Type-narrowed check that the precise raw upstream detail never reaches
      // a caller that destructures `result.error`.
      expect(result.error).toBe('UPDATE_FAILED');
      expect(result.error).not.toBe(rawUpstreamDetail);
    }
    // Belt-and-suspenders: serialize and assert the raw detail is absent.
    expect(JSON.stringify(result)).not.toContain(rawUpstreamDetail);

    // The operational log also contains the fixed code only. Credential
    // scrubbing is not a substitute for avoiding arbitrary upstream text.
    expect(consoleWarnSpy).toHaveBeenCalled();
    const loggedOutput = consoleWarnSpy.mock.calls[0].join(' ');
    expect(loggedOutput).toContain('[setActiveOrg] null persist failed:');
    expect(loggedOutput).toContain('UPDATE_FAILED');
    expect(loggedOutput).not.toContain(rawUpstreamDetail);
  });
});
