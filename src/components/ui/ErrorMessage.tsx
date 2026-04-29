"use client";

import { AlertCircle } from "lucide-react";

type ErrorMessageProps = {
  message: string;
  onRetry?: () => void;
};

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <AlertCircle className="mb-2 h-8 w-8 text-red-500" />
      <p className="mb-4 text-center text-gray-300">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
