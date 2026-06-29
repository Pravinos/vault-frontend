"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

import { useEnterExitAnimation } from "@/lib/hooks/useEnterExitAnimation";

type ToastProps = {
  message: string;
  type: "success" | "error";
  onClose: () => void;
};

export default function Toast({ message, type, onClose }: ToastProps) {
  const [dismissing, setDismissing] = useState(false);
  const { mounted, visible } = useEnterExitAnimation(!dismissing);

  useEffect(() => {
    const timer = setTimeout(() => setDismissing(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted && dismissing) {
      onClose();
    }
  }, [mounted, dismissing, onClose]);

  const handleDismiss = () => {
    setDismissing(true);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`toast-panel fixed top-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-lg border px-4 py-3 shadow-lg sm:left-auto sm:right-4 sm:translate-x-0 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }
        ${type === "success" ? "border-green-500 bg-gray-900" : "border-red-500 bg-gray-900"}`}
      role="alert"
    >
      {type === "success" ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      )}
      <span className="text-sm text-gray-100">{message}</span>
      <button
        type="button"
        onClick={handleDismiss}
        className="btn-interactive ml-2 text-gray-400 hover:text-gray-200"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}
