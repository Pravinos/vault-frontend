"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, Copy } from "lucide-react";

import { formatDate } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/currencyContext";
import type { Expense } from "@/types";

type ExpenseListProps = {
  expenses: Expense[];
  month?: string;
  monthLabel?: string;
  hasActiveFilters?: boolean;
  onEdit: (expense: Expense) => void;
  onDuplicate?: (expense: Expense) => void;
  onDelete: (id: string) => void | Promise<void>;
  onAddClick?: () => void;
  onClearFilters?: () => void;
};

export default function ExpenseList({
  expenses,
  month,
  monthLabel,
  hasActiveFilters,
  onEdit,
  onDuplicate,
  onDelete,
  onAddClick,
  onClearFilters,
}: ExpenseListProps) {
  const formatCurrency = useFormatCurrency();
  const [activeConfirmId, setActiveConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!activeConfirmId) return undefined;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveConfirmId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeConfirmId]);

  const computedMonthLabel = month
    ? new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "this period";
  const effectiveMonthLabel = monthLabel ?? computedMonthLabel;

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await Promise.resolve(onDelete(id));
      setActiveConfirmId(null);
      setErrors((s) => {
        const copy = { ...s };
        delete copy[id];
        return copy;
      });
    } catch (err) {
      const msg = (err as Error)?.message || "Unable to delete";
      setErrors((s) => ({ ...s, [id]: msg }));
      setActiveConfirmId(id);
      window.setTimeout(() => {
        setErrors((s) => {
          const copy = { ...s };
          delete copy[id];
          return copy;
        });
      }, 3500);
    } finally {
      setDeletingId(null);
    }
  };

  if (expenses.length === 0) {
    if (hasActiveFilters && onClearFilters) {
      return (
        <div className="flex flex-col items-center rounded-card-lg bg-[#1a2332] px-6 py-12 text-center">
          <span className="mb-3 text-4xl">🧾</span>
          <p className="mb-1 font-semibold text-white">No expenses found</p>
          <p className="text-sm text-gray-400">Try clearing your filters</p>
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 rounded-xl bg-white/5 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10"
          >
            Clear filters
          </button>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-card border border-gray-800">
      {/* Mobile: card layout */}
      <div className="block sm:hidden">
        {expenses.map((expense, index) => {
          const noteLabel = expense.note?.trim() || expense.category.name;
          const isConfirming = activeConfirmId === expense.id;

          return (
            <div
              key={expense.id}
              className={`border-b border-gray-800 p-4 last:border-b-0 ${index % 2 === 0 ? "bg-gray-900/40" : "bg-gray-900/70"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-semibold tabular-nums text-red-400">{formatCurrency(expense.amount)}</p>
                  <p className="mt-1 text-sm font-medium text-gray-200 truncate">{noteLabel}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-xs">{expense.category.icon}</span>
                    <span className="text-xs text-gray-400">{expense.category.name}</span>
                    <span className="text-xs text-gray-500">{formatDate(expense.expenseDate)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(expense)}
                    className="rounded-md p-1.5 text-gray-400 hover:text-white transition-colors"
                    aria-label="Edit expense"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate?.(expense)}
                    className="rounded-md p-1.5 text-gray-400 hover:text-white transition-colors"
                    aria-label="Duplicate expense"
                  >
                    <Copy className="h-4 w-4" />
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveConfirmId((cur) => (cur === expense.id ? null : expense.id))}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-all duration-150 active:scale-95 ${isConfirming ? "bg-red-500/20 text-red-300" : "text-gray-400 hover:text-red-300"}`}
                      aria-label="Delete expense"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Inline confirmation area */}
              <div className={`grid transition-all duration-200 ease-in-out ${isConfirming ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-3 px-4 pb-3 pl-[calc(1rem+48px)]">
                    <span className="text-sm text-red-400">Are you sure?</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(expense.id)}
                      disabled={deletingId === expense.id}
                      className="px-3 py-1 text-xs font-medium text-red-400 border border-red-400/30 rounded-md hover:bg-red-400/10 disabled:opacity-60"
                    >
                      {deletingId === expense.id ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveConfirmId(null)}
                      disabled={deletingId === expense.id}
                      className="px-3 py-1 text-xs font-medium text-slate-400 border border-slate-700 rounded-md hover:bg-slate-800 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    {errors[expense.id] ? <div className="ml-3 text-xs text-red-300">{errors[expense.id]}</div> : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table-style rows */}
      <div className="hidden sm:block">
        {expenses.map((expense, index) => {
          const noteLabel = expense.note?.trim() || expense.category.name;
          const isConfirming = activeConfirmId === expense.id;
          const isEven = index % 2 === 0;

          return (
            <div key={expense.id} className={`border-b border-gray-800/60 last:border-b-0 transition-colors hover:bg-gray-800/40 ${isEven ? "bg-gray-900/30" : "bg-gray-900/60"}`}>
              <div className={`flex items-center gap-4 px-4 py-3`}>
                <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-sm">{expense.category.icon}</span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{noteLabel}</p>
                  <p className="text-xs text-gray-500">{expense.category.name} · {expense.accountName}</p>
                </div>

                <span className="hidden w-32 flex-shrink-0 text-sm text-gray-400 lg:block">{formatDate(expense.expenseDate)}</span>

                <span className="w-28 flex-shrink-0 text-right text-sm font-semibold tabular-nums text-red-400">{formatCurrency(expense.amount)}</span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(expense)}
                    className="rounded-md p-1 text-gray-400 transition-colors hover:text-white"
                    aria-label="Edit expense"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate?.(expense)}
                    className="rounded-md p-1 text-gray-400 transition-colors hover:text-white"
                    aria-label="Duplicate expense"
                  >
                    <Copy className="h-4 w-4" />
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveConfirmId((cur) => (cur === expense.id ? null : expense.id))}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-all duration-150 active:scale-95 ${isConfirming ? "bg-red-500/20 text-red-300" : "text-gray-400 hover:text-red-300"}`}
                      aria-label="Delete expense"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Inline confirmation area for desktop */}
              <div className={`grid transition-all duration-200 ease-in-out ${isConfirming ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-3 px-4 pb-3 pl-[calc(1rem+48px)]">
                    <span className="text-sm text-red-400">Are you sure?</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(expense.id)}
                      disabled={deletingId === expense.id}
                      className="px-3 py-1 text-xs font-medium text-red-400 border border-red-400/30 rounded-md hover:bg-red-400/10 disabled:opacity-60"
                    >
                      {deletingId === expense.id ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveConfirmId(null)}
                      disabled={deletingId === expense.id}
                      className="px-3 py-1 text-xs font-medium text-slate-400 border border-slate-700 rounded-md hover:bg-slate-800 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    {errors[expense.id] ? <div className="ml-3 text-xs text-red-300">{errors[expense.id]}</div> : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
