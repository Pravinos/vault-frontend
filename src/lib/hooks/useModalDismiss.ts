"use client";

import { useCallback, useState } from "react";

/**
 * Local open/close state for a modal-wrapping component that its parent mounts/unmounts
 * conditionally (e.g. `{showForm ? <ExpenseForm onClose={...} /> : null}`).
 *
 * Without this, passing `isOpen={true}` straight through to `<Modal>` and letting the parent's
 * `onClose` unmount the component immediately means the exit (fade/scale-out) animation never
 * gets a chance to play — the whole subtree disappears instantly.
 *
 * Usage:
 *   const { isOpen, requestClose } = useModalDismiss();
 *   ...
 *   <Modal isOpen={isOpen} onClose={requestClose} onClosed={onClose} title="...">
 *
 * Call `requestClose()` from Cancel/Save/backdrop handlers instead of the parent's `onClose`
 * directly. `Modal` animates out, then calls `onClosed` (the parent's real close handler) once
 * it has finished, at which point the parent can safely unmount with no visual jump.
 */
export function useModalDismiss() {
  const [isOpen, setIsOpen] = useState(true);
  const requestClose = useCallback(() => setIsOpen(false), []);
  return { isOpen, requestClose };
}
