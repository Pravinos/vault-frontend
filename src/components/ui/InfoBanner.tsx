"use client";

import { Info, X } from "lucide-react";

type InfoBannerProps = {
  message: string;
  onDismiss: () => void;
};

export default function InfoBanner({ message, onDismiss }: InfoBannerProps) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-gray-700/60 bg-[#141c2a] px-4 py-3 text-sm text-gray-400"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
      <p className="min-w-0 flex-1">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="btn-interactive shrink-0 rounded-md p-0.5 text-gray-500 hover:text-gray-300"
        aria-label="Dismiss notice"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
