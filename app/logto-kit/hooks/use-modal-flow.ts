'use client';

import { useState, useCallback } from 'react';

/**
 * Describes the state of a multi-step modal flow.
 *
 * `step` is null when the modal is closed, 'loading' when transitioning,
 * or a user-defined step string when on a specific step.
 */
export interface FlowState<TStep extends string> {
  /** Current step, 'loading' during transitions, or null when closed. */
  step: TStep | 'loading' | null;
  /** True when step === 'loading'. */
  isLoading: boolean;
  /** Error message string, or null if there is no error. */
  error: string | null;
}

/**
 * Base hook for modal flow state machines.
 *
 * Manages a discriminated-union step value (null | 'loading' | TStep),
 * an error message, and helpers for common transitions.
 *
 * @example
 * ```tsx
 * type Step = 'confirm' | 'verify';
 * const { state, open, close, setLoading, setError } = useModalFlow<Step>();
 * ```
 */
export function useModalFlow<TStep extends string>() {
  const [step, setStep] = useState<TStep | 'loading' | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Open the modal at the given initial step and clear any previous error. */
  const open = useCallback((initialStep: TStep) => {
    setStep(initialStep);
    setError(null);
  }, []);

  /** Close the modal and clear step + error. */
  const close = useCallback(() => {
    setStep(null);
    setError(null);
  }, []);

  /** Transition to the 'loading' step (sets isLoading=true). */
  const setLoading = useCallback(() => setStep('loading'), []);

  return {
    state: { step, isLoading: step === 'loading', error } as FlowState<TStep>,
    open,
    close,
    setLoading,
    setError,
  };
}
