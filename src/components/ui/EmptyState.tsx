"use client";

import type React from "react";

type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: React.ReactNode;
  onAction?: () => void;
  hideAction?: boolean;
  actionDisabled?: boolean;
};

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  hideAction,
  actionDisabled = false,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] rounded-xl px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-gray-400">
        {icon}
      </div>

      <h2 className="text-lg font-semibold text-slate-200 mb-1">{title}</h2>
      {description ? (
        <p className="text-sm text-slate-400 mb-6">{description}</p>
      ) : null}

      {!hideAction && actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
