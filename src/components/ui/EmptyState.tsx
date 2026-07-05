"use client";

import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[400px] h-full flex-col items-center justify-center rounded-card px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-gray-400">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>

      <h2 className="mb-1 text-lg font-semibold text-slate-200">{title}</h2>
      <p className="mb-6 text-sm text-slate-400">{description}</p>

      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          disabled={action.disabled}
          className="btn-interactive inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
