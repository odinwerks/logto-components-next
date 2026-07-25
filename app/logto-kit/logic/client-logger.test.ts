import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('client-logger', () => {
  let consoleSpies: {
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    debug: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpies = {
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('routes info to console.info with [scope] prefix', async () => {
    const { clientLog } = await import('./client-logger');
    clientLog.info('TestScope', 'hello', 'world');
    expect(consoleSpies.info).toHaveBeenCalledTimes(1);
    const args = consoleSpies.info.mock.calls[0];
    expect(args[0]).toBe('[TestScope]');
    expect(args[1]).toBe('hello');
    expect(args[2]).toBe('world');
  });

  it('routes warn to console.warn with [scope] prefix', async () => {
    const { clientLog } = await import('./client-logger');
    clientLog.warn('TestScope', 'warning message');
    expect(consoleSpies.warn).toHaveBeenCalledTimes(1);
    expect(consoleSpies.warn.mock.calls[0][0]).toBe('[TestScope]');
  });

  it('routes error to console.error with [scope] prefix', async () => {
    const { clientLog } = await import('./client-logger');
    clientLog.error('TestScope', 'error message');
    expect(consoleSpies.error).toHaveBeenCalledTimes(1);
    expect(consoleSpies.error.mock.calls[0][0]).toBe('[TestScope]');
  });

  it('routes debug to console.debug with [scope] prefix', async () => {
    const { clientLog } = await import('./client-logger');
    clientLog.debug('TestScope', 'debug message');
    expect(consoleSpies.debug).toHaveBeenCalledTimes(1);
    expect(consoleSpies.debug.mock.calls[0][0]).toBe('[TestScope]');
  });

  it('scrubs Bearer tokens from string arguments', async () => {
    const { clientLog } = await import('./client-logger');
    clientLog.error('Auth', 'Request failed: Bearer eySecretToken99 was rejected');
    const args = consoleSpies.error.mock.calls[0];
    const output = args.join(' ');
    expect(output).not.toContain('eySecretToken99');
    expect(output).toContain('Bearer [REDACTED]');
  });

  it('scrubs JWT tokens from string arguments', async () => {
    const { clientLog } = await import('./client-logger');
    const jwt = 'eyJ' + 'hbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signature123';
    clientLog.warn('Token', `Token: ${jwt}`);
    const output = consoleSpies.warn.mock.calls[0].join(' ');
    expect(output).not.toContain(jwt);
    expect(output).toContain('[JWT_REDACTED]');
  });

  it('passes non-string args through unchanged', async () => {
    const { clientLog } = await import('./client-logger');
    const obj = { key: 'value', num: 42 };
    clientLog.error('TestScope', obj);
    expect(consoleSpies.error.mock.calls[0][1]).toBe(obj);
  });

  it('scrubs Error.message', async () => {
    const { clientLog } = await import('./client-logger');
    const err = new Error('Auth failed: Bearer eySecretToken456');
    clientLog.error('TestScope', err);
    const loggedErr = consoleSpies.error.mock.calls[0][1] as Error;
    expect(loggedErr.message).not.toContain('eySecretToken456');
    expect(loggedErr.message).toContain('Bearer [REDACTED]');
  });

  it('is silenced when NEXT_PUBLIC_CLIENT_LOGS=false', async () => {
    vi.stubEnv('NEXT_PUBLIC_CLIENT_LOGS', 'false');
    vi.resetModules();
    const { clientLog } = await import('./client-logger');
    clientLog.error('TestScope', 'should not appear');
    clientLog.warn('TestScope', 'should not appear');
    clientLog.info('TestScope', 'should not appear');
    clientLog.debug('TestScope', 'should not appear');
    expect(consoleSpies.error).not.toHaveBeenCalled();
    expect(consoleSpies.warn).not.toHaveBeenCalled();
    expect(consoleSpies.info).not.toHaveBeenCalled();
    expect(consoleSpies.debug).not.toHaveBeenCalled();
  });

  it('is enabled by default (NEXT_PUBLIC_CLIENT_LOGS unset)', async () => {
    delete process.env.NEXT_PUBLIC_CLIENT_LOGS;
    vi.resetModules();
    const { clientLog } = await import('./client-logger');
    clientLog.error('TestScope', 'should appear');
    expect(consoleSpies.error).toHaveBeenCalledTimes(1);
  });

  it('never throws (best-effort)', async () => {
    const { clientLog } = await import('./client-logger');
    // console.error is mocked to not throw, but even if it did, the facade
    // should swallow. Let's force a throw.
    consoleSpies.error.mockRestore();
    vi.spyOn(console, 'error').mockImplementation(() => {
      throw new Error('console exploded');
    });
    expect(() => clientLog.error('TestScope', 'msg')).not.toThrow();
  });
});
