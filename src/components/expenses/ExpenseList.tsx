"use client";

import { Pencil, Trash2, Copy } from "lucide-react";

import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Expense } from "@/types";

type ExpenseListProps = {
  expenses: Expense[];
  monthLabel: string;
  hasActiveFilters: boolean;
  onEdit: (expense: Expense) => void;
  onDuplicate?: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onClearFilters: () => void;
};

export default function ExpenseList({
  expenses,
  monthLabel,
  hasActiveFilters,
  onEdit,
  onDuplicate,
  onDelete,
  onClearFilters,
}: ExpenseListProps) {
  const { handleDelete: confirmDelete, isPendingConfirm } = useConfirmDelete();

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl bg-[#1a2332] px-6 py-12 text-center">
        <span className="mb-3 text-4xl">🧾</span>
        <p className="mb-1 font-semibold text-white">No expenses found</p>
        <p className="text-sm text-gray-400">
          {hasActiveFilters ? "Try clearing your filters" : `No expenses recorded for ${monthLabel}`}
        </p>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 rounded-xl bg-white/5 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {/* Mobile: card layout */}
      <div className="space-y-3 sm:hidden">
        {expenses.map((expense) => {
          const noteLabel = expense.note?.trim() || expense.category.name;
          const isConfirming = isPendingConfirm(expense.id);

          return (
            <div
              key={expense.id}
              className="flex items-center gap-3 rounded-2xl bg-[#1a2332] px-4 py-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg">
                {expense.category.icon}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{noteLabel}</p>
                <p className="truncate text-xs text-gray-400">
                  {expense.category.name} · {expense.accountName}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">{formatDate(expense.expenseDate)}</p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <p className="text-sm font-bold text-red-400">{formatCurrency(expense.amount)}</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(expense)}
                    className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Edit expense"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate?.(expense)}
                    className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Duplicate expense"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      confirmDelete(expense.id, () => onDelete(expense.id))
                    }
                    className={`rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400 ${
                      isConfirming ? "bg-red-500/20 text-red-300" : ""
                    }`}
                    aria-label="Delete expense"
                  >
                    {isConfirming ? "?" : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table-style rows */}
      <div className="hidden overflow-hidden rounded-2xl bg-[#1a2332] sm:block">
        {expenses.map((expense, index) => {
          const noteLabel = expense.note?.trim() || expense.category.name;
          const isConfirming = isPendingConfirm(expense.id);

          return (
            <div
              key={expense.id}
              className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/5 ${
                index < expenses.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg">
                {expense.category.icon}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{noteLabel}</p>
                <p className="truncate text-xs text-gray-400">
                  {expense.category.name} · {expense.accountName}
                </p>
              </div>

              <p className="hidden shrink-0 text-sm text-gray-400 md:block">
                {formatDate(expense.expenseDate)}
              </p>

              <p className="w-24 shrink-0 text-right text-sm font-bold text-red-400">
                {formatCurrency(expense.amount)}
              </p>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(expense)}
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Edit expense"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicate?.(expense)}
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Duplicate expense"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    confirmDelete(expense.id, () => onDelete(expense.id))
                  }
                  className={`rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400 ${
                    isConfirming
                      ? "bg-red-500/20 text-red-300"
                      : ""
                  }`}
                  aria-label="Delete expense"
                >
                  {isConfirming ? "?" : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

