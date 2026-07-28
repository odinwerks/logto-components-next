import { useEffect, useRef, useState } from 'react';

/**
 * Shared focus trap utilities for modal dialogs.
 * Extracted from FlowModal.tsx and SessionMapModal.tsx to eliminate duplication.
 */

// ── Module-level Escape handler stack ─────────────────────────────────────────
// Every useFocusTrap call pushes an entry on mount and pops on unmount. When
// Escape fires, only the topmost (last-pushed) entry's onClose is invoked. This
// prevents stacked modals from all closing on a single keypress.
//
// Client-only: useFocusTrap is a client-side hook (useEffect runs in the
// browser only), so this module-level mutable state is never shared across
// SSR requests.
const trapStack: Array<{ id: symbol; onCloseRef: React.MutableRefObject<(() => void) | undefined> }> = [];

export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.hasAttribute('disabled') || el.tabIndex === -1 || el.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'file') {
      return false;
    }

    if (typeof window !== 'undefined') {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
    }

    return true;
  });
}

/**
 * Hook that traps focus within a dialog element and handles Escape key.
 * @param dialogRef - Ref to the dialog container element
 * @param onClose - Callback to close the dialog (called on Escape)
 */
export function useFocusTrap(
  dialogRef: React.RefObject<HTMLDivElement | null>,
  onClose: () => void
) {
  const onCloseRef = useRef(onClose);
  // Per-instance unique ID for the module-level trapStack.
  const idRef = useRef(Symbol());

  // BUG-030 fix: Capture the trigger element synchronously during render,
  // BEFORE React's commit phase fires autoFocus. In a passive useEffect,
  // autoFocus has already stolen focus, so we'd capture the dialog input
  // instead of the trigger button. By capturing here (render phase), we
  // capture the element that was focused before the dialog was committed
  // to the DOM. Only capture once (on first render of this hook instance).
  const [restoreFocus] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Push onto the module-level trap stack so only the topmost dialog
    // responds to Escape.
    const entry = { id: idRef.current, onCloseRef };
    trapStack.push(entry);

    // Focus the first autofocus element, or the dialog itself if focusable, or the first focusable
    const focusable = getFocusableElements(dialog);
    const autoFocused = focusable.find((el) => el.hasAttribute('autofocus'));
    const initial = autoFocused ?? (dialog.tabIndex === -1 || dialog.hasAttribute('tabindex') ? dialog : (focusable[0] ?? dialog));
    initial.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        // Only fire if this entry is the topmost on the trap stack.
        const top = trapStack[trapStack.length - 1];
        if (top && top.id === idRef.current) {
          onCloseRef.current?.();
        }
        return;
      }

      if (e.key !== 'Tab') return;

      const currentDialog = dialogRef.current;
      if (!currentDialog) return;

      const nodes = getFocusableElements(currentDialog);
      if (nodes.length === 0) {
        e.preventDefault();
        currentDialog.focus();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const outsideDialog = !active || !currentDialog.contains(active);
      const isContainerActive = active === currentDialog;

      if (e.shiftKey) {
        if (outsideDialog || active === first || isContainerActive) {
          e.preventDefault();
          last.focus();
        }
        return;
      }

      if (outsideDialog || active === last || isContainerActive) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      // Pop this entry from the trap stack on unmount.
      const idx = trapStack.indexOf(entry);
      if (idx !== -1) trapStack.splice(idx, 1);

      window.removeEventListener('keydown', handleKeyDown);
      const previous = restoreFocus;
      if (previous && document.contains(previous)) {
        // Programmatic focus() alone does not trigger :focus-visible in
        // browsers; we force the outline via a data attribute that is
        // removed on blur so the indicator is visible post-Escape but
        // does not linger.
        previous.setAttribute('data-focus-visible', '');
        previous.focus({ preventScroll: true });
        const remove = () => {
          previous.removeAttribute('data-focus-visible');
          previous.removeEventListener('blur', remove);
        };
        previous.addEventListener('blur', remove, { once: true });
      }
    };
  }, [dialogRef, restoreFocus]);
}
