"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

const focusableSelector =
  "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
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
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        className="mx-auto mt-24 w-full max-w-md rounded-xl bg-gray-800 p-6 text-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-300 transition hover:text-white"
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
