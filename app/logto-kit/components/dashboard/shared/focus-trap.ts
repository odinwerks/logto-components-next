import { useEffect, useRef } from 'react';

/**
 * Shared focus trap utilities for modal dialogs.
 * Extracted from FlowModal.tsx and SessionMapModal.tsx to eliminate duplication.
 */

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
    return !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.getAttribute('aria-hidden') !== 'true';
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
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Restore focus to the element that had focus before the modal opened
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Focus the first autofocus element, or the first focusable, or the dialog itself
    const focusable = getFocusableElements(dialog);
    const autoFocused = focusable.find((el) => el.hasAttribute('autofocus'));
    const initial = autoFocused ?? focusable[0] ?? dialog;
    initial.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current?.();
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

      if (e.shiftKey) {
        if (outsideDialog || active === first) {
          e.preventDefault();
          last.focus();
        }
        return;
      }

      if (outsideDialog || active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      const previous = restoreFocusRef.current;
      if (previous && document.contains(previous)) {
        previous.focus();
      }
    };
  }, [dialogRef]);
}
