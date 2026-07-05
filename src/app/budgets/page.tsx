"use client";

import { useCallback, useMemo, useState } from "react";
import { Copy, PiggyBank, Plus } from "lucide-react";

import AddBudgetModal from "@/components/budgets/AddBudgetModal";
import BudgetCard from "@/components/budgets/BudgetCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Modal from "@/components/ui/Modal";
import MonthNavigator from "@/components/ui/MonthNavigator";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import { getBudgets } from "@/lib/api";
import { mergeBudgetSummaryItems } from "@/lib/highlightedBudgets";
import {
  useBudgetSummary,
  useBudgets,
  useDeleteBudget,
  useUpsertBudget,
} from "@/lib/hooks/useBudgets";
import { useCategories } from "@/lib/hooks/useCategories";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import { useHighlightedBudgets } from "@/lib/hooks/useHighlightedBudgets";
import { aggregateBudgetStatus, statusBarColor } from "@/lib/budgetStatus";
import { formatMonth, getMonthString } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/currencyContext";

function getPreviousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() - 1);
  return getMonthString(d);
}

function BudgetsPageSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Skeleton variant="card" className="h-28 rounded-2xl" />
      <div className="flex flex-wrap gap-2">
        <Skeleton variant="text" className="h-10 w-36 rounded-lg" />
        <Skeleton variant="text" className="h-10 w-48 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} variant="card" className="h-36 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const formatCurrency = useFormatCurrency();
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonthString());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);
  const [copying, setCopying] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null
  );
  const [savingCategoryId, setSavingCategoryId] = useState<number | null>(null);

  const {
    data: summary = [],
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useBudgetSummary(selectedMonth);
  const {
    data: budgets = [],
    isLoading: budgetsLoading,
    error: budgetsError,
    refetch: refetchBudgets,
  } = useBudgets(selectedMonth);
  const { data: categories = [] } = useCategories();
  const upsertBudgetMutation = useUpsertBudget();
  const deleteBudgetMutation = useDeleteBudget();
  const { handleDelete: confirmDelete, isPendingConfirm } = useConfirmDelete();
  const budgetCategoryIds = useMemo(
    () => budgets.map((budget) => budget.categoryId),
    [budgets]
  );
  const { highlightedIds, toggleHighlight, maxHighlights } = useHighlightedBudgets(
    selectedMonth,
    budgetCategoryIds
  );

  const error = summaryError ?? budgetsError;
  const refetch = useCallback(() => {
    void refetchSummary();
    void refetchBudgets();
  }, [refetchSummary, refetchBudgets]);

  const budgetItems = useMemo(
    () => mergeBudgetSummaryItems(budgets, summary),
    [budgets, summary]
  );

  const loading = summaryLoading || budgetsLoading;
  const monthLabel = formatMonth(selectedMonth);
  const previousMonth = getPreviousMonth(selectedMonth);
  const previousMonthLabel = formatMonth(previousMonth);
  const showHighlightControls = budgetItems.length > maxHighlights;

  const budgetIdByCategoryId = useMemo(() => {
    const map = new Map<number, string>();
    for (const budget of budgets) {
      map.set(budget.categoryId, budget.id);
    }
    return map;
  }, [budgets]);

  const budgetedCategoryIds = useMemo(
    () => new Set(budgets.map((budget) => budget.categoryId)),
    [budgets]
  );

  const availableCategories = useMemo(
    () => categories.filter((category) => !budgetedCategoryIds.has(category.id)),
    [categories, budgetedCategoryIds]
  );

  const totals = useMemo(() => {
    const totalBudgeted = budgetItems.reduce((sum, item) => sum + item.budgetAmount, 0);
    const totalSpent = budgetItems.reduce((sum, item) => sum + item.spentAmount, 0);
    const percentageUsed =
      totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0;
    const status = aggregateBudgetStatus(totalSpent, totalBudgeted);
    return { totalBudgeted, totalSpent, percentageUsed, status };
  }, [budgetItems]);

  const handleSave = useCallback(
    async (categoryId: number, amount: number) => {
      setSavingCategoryId(categoryId);
      try {
        await upsertBudgetMutation.mutateAsync({
          categoryId,
          month: selectedMonth,
          amount,
        });
        setToast({ message: "Budget updated", type: "success" });
      } catch {
        setToast({ message: "Unable to save budget.", type: "error" });
        throw new Error("Unable to save budget.");
      } finally {
        setSavingCategoryId(null);
      }
    },
    [selectedMonth, upsertBudgetMutation]
  );

  const handleAdd = useCallback(
    async (categoryId: number, amount: number) => {
      try {
        await upsertBudgetMutation.mutateAsync({
          categoryId,
          month: selectedMonth,
          amount,
        });
        setToast({ message: "Budget added", type: "success" });
      } catch {
        setToast({ message: "Unable to add budget.", type: "error" });
        throw new Error("Unable to add budget.");
      }
    },
    [selectedMonth, upsertBudgetMutation]
  );

  const handleDelete = useCallback(
    (id: string) => {
      confirmDelete(id, async () => {
        try {
          await deleteBudgetMutation.mutateAsync(id);
          setToast({ message: "Budget deleted", type: "success" });
        } catch {
          setToast({ message: "Unable to delete budget.", type: "error" });
        }
      });
    },
    [deleteBudgetMutation, confirmDelete]
  );

  const handleToggleHighlight = (categoryId: number) => {
    const result = toggleHighlight(categoryId);
    if (result?.error === "limit") {
      setToast({
        message: `You can highlight up to ${maxHighlights} budgets on the dashboard.`,
        type: "error",
      });
      return;
    }
    const isNowHighlighted = result?.ids.includes(categoryId);
    setToast({
      message: isNowHighlighted
        ? "Budget pinned to dashboard"
        : "Budget removed from dashboard highlights",
      type: "success",
    });
  };

  const handleCopyFromLastMonth = async () => {
    setCopying(true);
    try {
      const lastMonthBudgets = await getBudgets(previousMonth);
      if (lastMonthBudgets.length === 0) {
        setToast({ message: "No budgets found for last month.", type: "error" });
        setShowCopyConfirm(false);
        return;
      }

      const results = await Promise.allSettled(
        lastMonthBudgets.map((budget) =>
          upsertBudgetMutation.mutateAsync({
            categoryId: budget.categoryId,
            month: selectedMonth,
            amount: budget.amount,
          })
        )
      );

      const succeeded = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - succeeded;

      if (failed === 0) {
        setToast({
          message: `Copied ${succeeded} budget${succeeded === 1 ? "" : "s"} from ${previousMonthLabel}.`,
          type: "success",
        });
        setShowCopyConfirm(false);
      } else if (succeeded === 0) {
        setToast({ message: "Unable to copy budgets.", type: "error" });
      } else {
        setToast({
          message: `Copied ${succeeded} of ${results.length} budgets. ${failed} failed to copy.`,
          type: "error",
        });
        setShowCopyConfirm(false);
      }
    } catch {
      setToast({ message: "Unable to copy budgets.", type: "error" });
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Budgets</h1>
        <MonthNavigator value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {error ? (
        <ErrorMessage message="Unable to load budgets." onRetry={() => void refetch()} />
      ) : loading ? (
        <BudgetsPageSkeleton />
      ) : (
        <>
          {budgetItems.length > 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {monthLabel} summary
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    <span className="font-semibold text-white">
                      {formatCurrency(totals.totalSpent)}
                    </span>
                    {" spent of "}
                    <span className="font-semibold text-teal-300">
                      {formatCurrency(totals.totalBudgeted)}
                    </span>
                    {" budgeted"}
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  {formatCurrency(Math.max(totals.totalBudgeted - totals.totalSpent, 0))} remaining
                </p>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${statusBarColor(totals.status)}`}
                  style={{ width: `${totals.percentageUsed}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              disabled={availableCategories.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Budget
            </button>
            <button
              type="button"
              onClick={() => setShowCopyConfirm(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/5"
            >
              <Copy className="h-4 w-4" />
              Copy from last month
            </button>
          </div>

          {budgetItems.length === 0 ? (
            <EmptyState
              icon={PiggyBank}
              title={`No budgets for ${monthLabel}`}
              description="Set category budgets to track spending against your plan."
              action={{ label: "Add budget", onClick: () => setShowAddModal(true) }}
            />
          ) : (
            <>
              {showHighlightControls ? (
                <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 px-4 py-3">
                  <p className="text-sm text-gray-200">
                    Pin up to {maxHighlights} budgets to show on your dashboard.
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {highlightedIds.length} / {maxHighlights} highlighted
                    {highlightedIds.length === 0
                      ? " · Tap the pin icon on a budget card to choose"
                      : ""}
                  </p>
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {budgetItems.map((item) => (
                  <BudgetCard
                    key={item.categoryId}
                    item={item}
                    budgetId={budgetIdByCategoryId.get(item.categoryId)}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    isPendingConfirm={isPendingConfirm(
                      budgetIdByCategoryId.get(item.categoryId) ?? ""
                    )}
                    isSaving={savingCategoryId === item.categoryId}
                    showHighlightToggle={showHighlightControls}
                    isHighlighted={highlightedIds.includes(item.categoryId)}
                    onToggleHighlight={() => handleToggleHighlight(item.categoryId)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <AddBudgetModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        categories={availableCategories}
        onSubmit={handleAdd}
        isSubmitting={upsertBudgetMutation.isPending}
      />

      <Modal
        isOpen={showCopyConfirm}
        onClose={() => !copying && setShowCopyConfirm(false)}
        title="Copy budgets from last month"
      >
        <p className="text-sm text-gray-400">
          Copy all budgets from {previousMonthLabel} into {monthLabel}? Existing budgets for
          matching categories will be overwritten.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => setShowCopyConfirm(false)}
            disabled={copying}
            className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleCopyFromLastMonth()}
            disabled={copying}
            className="flex-1 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-400 disabled:opacity-50"
          >
            {copying ? "Copying…" : "Copy budgets"}
          </button>
        </div>
      </Modal>

      {toast ? (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      ) : null}
    </div>
  );
}
