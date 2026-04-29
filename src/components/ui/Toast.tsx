"use client";

import { useEffect } from "react";
import { CheckCircle, XCircle } from "lucide-react";

type ToastProps = {
  message: string;
  type: "success" | "error";
  onClose: () => void;
};

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg
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
        onClick={onClose}
        className="ml-2 text-gray-400 hover:text-gray-200"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}
