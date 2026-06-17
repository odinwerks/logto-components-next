'use client';

import { useCallback } from 'react';
import { useLogto } from '../components/providers/logto-provider';

/**
 * Returns a wrapper that gates an action behind authentication.
 *
 * When the user is authenticated, the original action is called normally.
 * When the user is unauthenticated, the dashboard auth-prompt modal is opened
 * instead, with an optional `routeTo` redirect after sign-in.
 *
 * By default, the modal opens in `'mandatory'` mode, showing a "Read Only Mode"
 * button instead of "Cancel" to communicate that the action requires sign-in.
 *
 * @example
 * ```tsx
 * const authGated = useAuthGatedAction();
 *
 * <button onClick={authGated(() => doSomething(), '/demo/calculator')}>
 *   Run Calculator
 * </button>
 * ```
 */
export function useAuthGatedAction() {
  const { isAuthenticated, openDashboard } = useLogto();

  return useCallback(
    <Args extends unknown[]>(action: (...args: Args) => void, routeTo?: string) =>
      (...args: Args) => {
        if (!isAuthenticated) {
          openDashboard({ routeTo, mode: 'mandatory' });
          return;
        }
        action(...args);
      },
    [isAuthenticated, openDashboard],
  );
}
