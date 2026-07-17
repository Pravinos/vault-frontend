"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, Copy } from "lucide-react";

import { formatDate } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/currencyContext";
import { getStaggerDelayMs } from "@/lib/motion";
import type { Income } from "@/types";

type IncomeListProps = {
  income: Income[];
  hasActiveFilters?: boolean;
  onEdit: (entry: Income) => void;
  onDuplicate?: (entry: Income) => void;
  onDelete: (id: string) => void | Promise<void>;
  onClearFilters?: () => void;
};

export default function IncomeList({
  income,
  hasActiveFilters,
  onEdit,
  onDuplicate,
  onDelete,
  onClearFilters,
}: IncomeListProps) {
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

  if (income.length === 0) {
    if (hasActiveFilters && onClearFilters) {
      return (
        <div className="flex flex-col items-center rounded-card-lg bg-surface-raised px-6 py-12 text-center">
          <span className="mb-3 text-4xl">💶</span>
          <p className="mb-1 font-semibold text-white">No income found</p>
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

  // Keyed on the visible id sequence so the rows remount (and replay their stagger-fade)
  // whenever filters/search/month change the result set, but not on unrelated re-renders.
  const listKey = income.map((entry) => entry.id).join("|");

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-card border border-gray-800">
      {/* Mobile: card layout */}
      <div key={`${listKey}-mobile`} className="block sm:hidden">
        {income.map((entry, index) => {
          const noteLabel = entry.note?.trim() || entry.categoryName;
          const isConfirming = activeConfirmId === entry.id;

          return (
            <div
              key={entry.id}
              className={`animate-list-item-enter border-b border-gray-800 p-4 last:border-b-0 ${index % 2 === 0 ? "bg-gray-900/40" : "bg-gray-900/70"}`}
              style={{ animationDelay: `${getStaggerDelayMs(index)}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-semibold tabular-nums text-white">{formatCurrency(entry.amount)}</p>
                  <p className="mt-1 text-sm font-medium text-gray-200 truncate">{noteLabel}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-xs">{entry.categoryIcon}</span>
                    <span className="text-xs text-gray-400">{entry.categoryName}</span>
                    <span className="text-xs text-gray-500">· {entry.accountName}</span>
                    <span className="text-xs text-gray-500">{formatDate(entry.incomeDate)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(entry)}
                    className="btn-interactive rounded-md p-1.5 text-gray-400 hover:text-white"
                    aria-label="Edit income"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate?.(entry)}
                    className="btn-interactive rounded-md p-1.5 text-gray-400 hover:text-white"
                    aria-label="Duplicate income"
                  >
                    <Copy className="h-4 w-4" />
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveConfirmId((cur) => (cur === entry.id ? null : entry.id))}
                      className={`btn-interactive rounded-md px-2 py-1 text-xs font-medium ${isConfirming ? "bg-red-500/20 text-red-300" : "text-gray-400 hover:text-red-300"}`}
                      aria-label="Delete income"
                      aria-expanded={isConfirming}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Inline confirmation area */}
              <div className={`grid transition-all duration-base ease-standard ${isConfirming ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-3 px-4 pb-3 pl-[calc(1rem+48px)]">
                    <span className="text-sm text-red-400">Are you sure?</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      className="btn-interactive px-3 py-1 text-xs font-medium text-red-400 border border-red-400/30 rounded-md hover:bg-red-400/10 disabled:opacity-60"
                    >
                      {deletingId === entry.id ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveConfirmId(null)}
                      disabled={deletingId === entry.id}
                      className="btn-interactive px-3 py-1 text-xs font-medium text-slate-400 border border-slate-700 rounded-md hover:bg-slate-800 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    {errors[entry.id] ? <div className="ml-3 text-xs text-red-300">{errors[entry.id]}</div> : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table-style rows */}
      <div key={`${listKey}-desktop`} className="hidden sm:block">
        {income.map((entry, index) => {
          const noteLabel = entry.note?.trim() || entry.categoryName;
          const isConfirming = activeConfirmId === entry.id;

          return (
            <div
              key={entry.id}
              className={`animate-list-item-enter border-b border-gray-800/60 last:border-b-0 transition-colors duration-fast hover:bg-gray-800/40 ${index % 2 === 0 ? "bg-gray-900/30" : "bg-gray-900/60"}`}
              style={{ animationDelay: `${getStaggerDelayMs(index)}ms` }}
            >
              <div className={`flex items-center gap-4 px-4 py-3`}>
                <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-sm">{entry.categoryIcon}</span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{noteLabel}</p>
                  <p className="text-xs text-gray-500">{entry.categoryName} · {entry.accountName}</p>
                </div>

                <span className="hidden w-32 flex-shrink-0 text-sm text-gray-400 lg:block">{formatDate(entry.incomeDate)}</span>

                <span className="w-28 flex-shrink-0 text-right text-sm font-semibold tabular-nums text-emerald-400">{formatCurrency(entry.amount)}</span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(entry)}
                    className="btn-interactive rounded-md p-1 text-gray-400 hover:text-white"
                    aria-label="Edit income"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate?.(entry)}
                    className="btn-interactive rounded-md p-1 text-gray-400 hover:text-white"
                    aria-label="Duplicate income"
                  >
                    <Copy className="h-4 w-4" />
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveConfirmId((cur) => (cur === entry.id ? null : entry.id))}
                      className={`btn-interactive rounded-md px-2 py-1 text-xs font-medium ${isConfirming ? "bg-red-500/20 text-red-300" : "text-gray-400 hover:text-red-300"}`}
                      aria-label="Delete income"
                      aria-expanded={isConfirming}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Inline confirmation area */}
              <div className={`grid transition-all duration-base ease-standard ${isConfirming ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-3 px-4 pb-3 pl-[calc(1rem+48px)]">
                    <span className="text-sm text-red-400">Are you sure?</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      className="btn-interactive px-3 py-1 text-xs font-medium text-red-400 border border-red-400/30 rounded-md hover:bg-red-400/10 disabled:opacity-60"
                    >
                      {deletingId === entry.id ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveConfirmId(null)}
                      disabled={deletingId === entry.id}
                      className="btn-interactive px-3 py-1 text-xs font-medium text-slate-400 border border-slate-700 rounded-md hover:bg-slate-800 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    {errors[entry.id] ? <div className="ml-3 text-xs text-red-300">{errors[entry.id]}</div> : null}
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

