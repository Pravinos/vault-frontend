"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { useEnterExitAnimation } from "@/lib/hooks/useEnterExitAnimation";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /**
   * Called once the close (exit) animation has fully finished and the modal has unmounted
   * itself internally. Use this — instead of unmounting the modal from a parent's conditional
   * render on `onClose` — to let the fade/scale-out transition actually play. See
   * ExpenseForm/AccountForm/etc. for the pattern: they keep a local `isOpen` state, pass
   * `onClose` for the request-to-close action, and pass the real parent unmount through
   * `onClosed`.
   */
  onClosed?: () => void;
};

const focusableSelector =
  "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

export default function Modal({ isOpen, onClose, onClosed, title, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { mounted, visible } = useEnterExitAnimation(isOpen);
  const wasMountedRef = useRef(mounted);

  useEffect(() => {
    if (wasMountedRef.current && !mounted) {
      onClosed?.();
    }
    wasMountedRef.current = mounted;
  }, [mounted, onClosed]);

  const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(focusableSelector)
    );
    const first = focusable[0] ?? panel;
    const last = focusable[focusable.length - 1] ?? panel;

    if (!panel.hasAttribute("tabindex")) {
      panel.setAttribute("tabindex", "-1");
    }

    first.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") {
        return;
      }

      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onMouseDown={handleBackdropMouseDown}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        className={`modal-panel w-full max-h-[90vh] overflow-y-auto rounded-t-3xl bg-surface-raised p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-white shadow-xl sm:mx-auto sm:w-full sm:max-w-md sm:rounded-2xl ${
          visible ? "scale-100 opacity-100" : "scale-[0.97] opacity-0"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-interactive rounded-md p-1 text-gray-300 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
