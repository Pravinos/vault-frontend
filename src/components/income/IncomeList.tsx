"use client";

import { Pencil, PlusCircle, Trash2, Wallet, Copy } from "lucide-react";

import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Income } from "@/types";

type IncomeListProps = {
  income: Income[];
  month: string;
  onEdit: (entry: Income) => void;
  onDuplicate?: (entry: Income) => void;
  onDelete: (id: string) => void;
  onAddClick: () => void;
};

export default function IncomeList({ income, month, onEdit, onDuplicate, onDelete, onAddClick }: IncomeListProps) {
  const { handleDelete: confirmDelete, isPendingConfirm } = useConfirmDelete();

  const monthLabel = month
    ? new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "this period";

  if (income.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 py-16 text-center">
        <Wallet className="mb-3 h-10 w-10 text-gray-600" />
        <p className="text-sm font-medium text-gray-300">
          No income in {monthLabel}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Try a different month or add your first income entry
        </p>
        <button
          type="button"
          onClick={onAddClick}
          className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:bg-emerald-400 active:scale-95"
        >
          <PlusCircle className="h-4 w-4" />
          Add Income
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-xl border border-gray-800">
      {/* Mobile: card layout */}
      <div className="block sm:hidden">
        {income.map((entry, index) => {
          const noteLabel = entry.note?.trim() || entry.categoryName;
          const isConfirming = isPendingConfirm(entry.id);

          return (
            <div
              key={entry.id}
              className={`border-b border-gray-800 p-4 last:border-b-0 ${
                index % 2 === 0 ? "bg-gray-900/40" : "bg-gray-900/70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-semibold tabular-nums text-white">
                    {formatCurrency(entry.amount)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-200 truncate">
                    {noteLabel}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-xs">
                      {entry.categoryIcon}
                    </span>
                    <span className="text-xs text-gray-400">{entry.categoryName}</span>
                    <span className="text-xs text-gray-500">{formatDate(entry.incomeDate)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(entry)}
                    className="rounded-md p-1.5 text-gray-400 hover:text-white transition-colors"
                    aria-label="Edit income"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate?.(entry)}
                    className="rounded-md p-1.5 text-gray-400 hover:text-white transition-colors"
                    aria-label="Duplicate income"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(entry.id, () => onDelete(entry.id))}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-all duration-150 active:scale-95 ${
                      isConfirming
                        ? "bg-red-500/20 text-red-300"
                        : "text-gray-400 hover:text-red-300"
                    }`}
                    aria-label="Delete income"
                  >
                    {isConfirming ? "Confirm?" : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table-style rows */}
      <div className="hidden sm:block">
        {income.map((entry, index) => {
          const noteLabel = entry.note?.trim() || entry.categoryName;
          const isConfirming = isPendingConfirm(entry.id);

          return (
            <div
              key={entry.id}
              className={`flex items-center gap-4 border-b border-gray-800/60 px-4 py-3 last:border-b-0 transition-colors hover:bg-gray-800/40 ${
                index % 2 === 0 ? "bg-gray-900/30" : "bg-gray-900/60"
              }`}
            >
              <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-sm">
                {entry.categoryIcon}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{noteLabel}</p>
                <p className="text-xs text-gray-500">
                  {entry.categoryName} · {entry.accountName}
                </p>
              </div>

              <span className="hidden w-32 flex-shrink-0 text-sm text-gray-400 lg:block">
                {formatDate(entry.incomeDate)}
              </span>

              <span className="w-28 flex-shrink-0 text-right text-sm font-semibold tabular-nums text-emerald-400">
                {formatCurrency(entry.amount)}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(entry)}
                  className="rounded-md p-1 text-gray-400 transition-colors hover:text-white"
                  aria-label="Edit income"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicate?.(entry)}
                  className="rounded-md p-1 text-gray-400 transition-colors hover:text-white"
                  aria-label="Duplicate income"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => confirmDelete(entry.id, () => onDelete(entry.id))}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-all duration-150 active:scale-95 ${
                    isConfirming
                      ? "bg-red-500/20 text-red-300"
                      : "text-gray-400 hover:text-red-300"
                  }`}
                  aria-label="Delete income"
                >
                  {isConfirming ? "Confirm?" : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

