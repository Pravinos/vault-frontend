"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pin } from "lucide-react";

import Modal from "@/components/ui/Modal";
import { statusBarColor } from "@/lib/budgetStatus";
import { useHighlightedBudgets } from "@/lib/hooks/useHighlightedBudgets";
import {
  MAX_HIGHLIGHTED_BUDGETS,
  resolveDashboardBudgets,
} from "@/lib/highlightedBudgets";
import { useFormatCurrency } from "@/lib/currencyContext";
import type { BudgetSummaryItem } from "@/types/budget";

type BudgetHighlightsCardProps = {
  month: string;
  budgets: BudgetSummaryItem[];
  alerts: BudgetSummaryItem[];
};

function BudgetProgressRow({
  item,
  showHighlightedBadge,
  formatCurrency,
}: {
  item: BudgetSummaryItem;
  showHighlightedBadge: boolean;
  formatCurrency: (amount: number) => string;
}) {
  const progressWidth = Math.min(Math.max(item.percentageUsed, 0), 100);

  return (
    <div className="rounded-card border border-white/5 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-base">{item.categoryIcon}</span>
          <span className="truncate text-sm font-medium text-white">{item.categoryName}</span>
        </div>
        {showHighlightedBadge ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-300">
            <Pin className="h-3 w-3" />
            Highlighted
          </span>
        ) : null}
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${statusBarColor(item.status)}`}
          style={{ width: `${progressWidth}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="text-gray-400">
          {formatCurrency(item.spentAmount)} / {formatCurrency(item.budgetAmount)}
        </span>
        <span className="text-gray-500">{progressWidth.toFixed(0)}% used</span>
      </div>
    </div>
  );
}

export default function BudgetHighlightsCard({
  month,
  budgets,
  alerts,
}: BudgetHighlightsCardProps) {
  const formatCurrency = useFormatCurrency();
  const budgetCategoryIds = useMemo(
    () => budgets.map((item) => item.categoryId),
    [budgets]
  );
  const { highlightedIds, setHighlights } = useHighlightedBudgets(month, budgetCategoryIds);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftIds, setDraftIds] = useState<number[]>([]);

  const canCustomize = budgets.length > MAX_HIGHLIGHTED_BUDGETS;

  const displayed = useMemo(
    () => resolveDashboardBudgets(budgets, highlightedIds),
    [budgets, highlightedIds]
  );

  const hasPinnedHighlights = highlightedIds.length > 0;

  const openPicker = () => {
    setDraftIds(
      highlightedIds.filter((id) => budgets.some((item) => item.categoryId === id))
    );
    setPickerOpen(true);
  };

  const toggleDraft = (categoryId: number) => {
    setDraftIds((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      if (prev.length >= MAX_HIGHLIGHTED_BUDGETS) return prev;
      return [...prev, categoryId];
    });
  };

  const saveHighlights = () => {
    setHighlights(draftIds);
    setPickerOpen(false);
  };

  return (
    <>
      <div className="animate-card-enter rounded-card-lg border border-white/10 bg-[#1a1a1a] p-card-md">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white">Budgets</h2>
            {canCustomize ? (
              <p className="mt-0.5 text-xs text-gray-500">
                {hasPinnedHighlights
                  ? `${highlightedIds.length} / ${MAX_HIGHLIGHTED_BUDGETS} pinned`
                  : "No budgets pinned yet"}
              </p>
            ) : null}
          </div>
          <Link
            href="/budgets"
            className="text-xs font-medium text-teal-400 transition-colors hover:text-teal-300"
          >
            View all budgets →
          </Link>
        </div>

        {budgets.length === 0 ? (
          <div className="rounded-card border border-dashed border-gray-700/70 p-card-sm text-center">
            <p className="text-sm text-gray-400">No budgets set for this month.</p>
            <Link
              href="/budgets"
              className="mt-2 inline-block text-xs font-medium text-teal-400 hover:text-teal-300"
            >
              Set up budgets →
            </Link>
          </div>
        ) : canCustomize && !hasPinnedHighlights ? (
          <div className="rounded-card border border-dashed border-teal-500/20 bg-teal-500/5 p-card-sm text-center">
            <p className="text-sm text-gray-300">
              Pin up to {MAX_HIGHLIGHTED_BUDGETS} budgets to track them here.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Use the pin icon on the Budgets page, or choose them here.
            </p>
            <button
              type="button"
              onClick={openPicker}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-300 transition hover:bg-teal-500/20"
            >
              <Pin className="h-3.5 w-3.5" />
              Choose highlights
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {displayed.map((item) => (
                <BudgetProgressRow
                  key={item.categoryId}
                  item={item}
                  showHighlightedBadge={canCustomize}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>

            {alerts.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">All budgets on track ✓</p>
            ) : (
              <p className="mt-4 text-xs text-gray-500">
                {alerts.length} categor{alerts.length === 1 ? "y needs" : "ies need"} attention
                {" · "}
                <Link href="/budgets" className="text-teal-400 hover:text-teal-300">
                  View details
                </Link>
              </p>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Choose highlighted budgets"
      >
        <p className="text-sm text-gray-400">
          Select up to {MAX_HIGHLIGHTED_BUDGETS} categories to pin on your dashboard.
        </p>

        <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
          {budgets.map((item) => {
            const selected = draftIds.includes(item.categoryId);
            const atLimit = draftIds.length >= MAX_HIGHLIGHTED_BUDGETS;
            const disabled = !selected && atLimit;

            return (
              <li key={item.categoryId}>
                <button
                  type="button"
                  onClick={() => !disabled && toggleDraft(item.categoryId)}
                  disabled={disabled}
                  className={`flex w-full items-center justify-between gap-3 rounded-card border px-3 py-2.5 text-left transition ${
                    selected
                      ? "border-teal-500/50 bg-teal-500/10"
                      : disabled
                      ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-50"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span>{item.categoryIcon}</span>
                    <span className="truncate text-sm text-white">{item.categoryName}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {formatCurrency(item.spentAmount)} / {formatCurrency(item.budgetAmount)}
                    </span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${
                        selected
                          ? "border-teal-400 bg-teal-400 text-[#0d1520]"
                          : "border-gray-600 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-xs text-gray-500">
          {draftIds.length} / {MAX_HIGHLIGHTED_BUDGETS} selected
        </p>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveHighlights}
            disabled={draftIds.length === 0}
            className="flex-1 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-400 disabled:opacity-50"
          >
            Save highlights
          </button>
        </div>
      </Modal>
    </>
  );
}
