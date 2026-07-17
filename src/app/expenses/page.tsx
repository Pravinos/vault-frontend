"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, Plus, Receipt, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import ExpenseFilters from "@/components/expenses/ExpenseFilters";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import ExpenseHeatmap from "@/components/expenses/ExpenseHeatmap";
import ExpenseList from "@/components/expenses/ExpenseList";
import ActiveFilterPills from "@/components/ui/ActiveFilterPills";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import TransactionSearch from "@/components/ui/TransactionSearch";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { exportToCsv, getVaultExportFilename } from "@/lib/csv";
import { formatMonth, getLocalDateString, getMonthString } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/currencyContext";
import { useExpenses } from "@/lib/hooks/useExpenses";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useCategories } from "@/lib/hooks/useCategories";
import { useDeleteExpense } from "@/lib/hooks/useExpenseMutations";
import { queryKeys } from "@/lib/queryKeys";
import type { Expense, CreateExpenseRequest } from "@/types";

function findCategoryByName(
  categories: { id: number; name: string; icon: string }[],
  name: string
) {
  const normalized = name.toLowerCase().trim();
  return categories.find((c) => c.name.toLowerCase().trim() === normalized);
}

export default function ExpensesPage() {
  const formatCurrency = useFormatCurrency();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonthString());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [heatmapYear, setHeatmapYear] = useState<number>(() =>
    parseInt(getMonthString().slice(0, 4), 10)
  );
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [initialExpenseValues, setInitialExpenseValues] = useState<
    CreateExpenseRequest | undefined
  >(undefined);

  const qc = useQueryClient();

  const { data, isLoading: loading, error, refetch } = useExpenses(selectedMonth);
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const deleteExpenseMutation = useDeleteExpense(selectedMonth);

  const expenses = data?.expenses ?? [];
  const summary = data?.summary ?? null;

  useEffect(() => {
    setHeatmapYear(parseInt(selectedMonth.slice(0, 4), 10));
  }, [selectedMonth]);

  const handleAddClick = () => {
    setEditingExpense(undefined);
    setInitialExpenseValues(undefined);
    setShowForm(true);
  };

  const handleDuplicate = (expense: Expense) => {
    setEditingExpense(undefined);
    setInitialExpenseValues({
      amount: expense.amount,
      categoryId: expense.category.id,
      accountId: expense.accountId,
      note: expense.note ?? undefined,
      expenseDate: getLocalDateString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExpenseMutation.mutateAsync(id);
      setToast({ message: "Expense deleted", type: "success" });
    } catch (error) {
      setToast({
        message: getApiErrorMessage(error, "Unable to delete expense."),
        type: "error",
      });
      throw error;
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingExpense(undefined);
    setInitialExpenseValues(undefined);
  }, []);

  const handleFormSuccess = useCallback(
    async (message: string) => {
      setToast({ message, type: "success" });
      await qc.invalidateQueries({ queryKey: queryKeys.expenses(selectedMonth) });
      await qc.invalidateQueries({ queryKey: queryKeys.expenseHeatmaps });
      await qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      await qc.invalidateQueries({ queryKey: queryKeys.accounts });
      await qc.invalidateQueries({ queryKey: queryKeys.goals });
    },
    [qc, selectedMonth]
  );

  const baseFilteredExpenses = useMemo(() => {
    let data = expenses;
    if (selectedCategoryId !== null) {
      data = data.filter((e) => e.category.id === selectedCategoryId);
    } else if (selectedCategoryName) {
      const normalized = selectedCategoryName.toLowerCase().trim();
      data = data.filter(
        (e) => e.category.name.toLowerCase().trim() === normalized
      );
    }
    if (selectedAccountId) data = data.filter((e) => e.accountId === selectedAccountId);
    if (selectedDate) {
      data = data.filter((e) => e.expenseDate.slice(0, 10) === selectedDate);
    }
    return data;
  }, [expenses, selectedCategoryId, selectedCategoryName, selectedAccountId, selectedDate]);

  const displayedExpenses = useMemo(() => {
    if (!searchQuery.trim()) return baseFilteredExpenses;
    const q = searchQuery.toLowerCase().trim();
    return baseFilteredExpenses.filter((item) => {
      const noteMatch = item.note?.toLowerCase().includes(q);
      const amountMatch = item.amount.toString().includes(q);
      const categoryMatch = item.category.name?.toLowerCase().includes(q);
      const accountMatch = item.accountName?.toLowerCase().includes(q);
      return Boolean(noteMatch || amountMatch || categoryMatch || accountMatch);
    });
  }, [baseFilteredExpenses, searchQuery]);

  const totalAmount = useMemo(
    () => baseFilteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [baseFilteredExpenses]
  );

  const monthLabel = selectedMonth ? formatMonth(selectedMonth) : "";

  const hasActiveFilters =
    selectedCategoryId !== null ||
    selectedCategoryName !== null ||
    selectedAccountId !== null ||
    selectedDate !== null;

  const hasExportFilter = searchQuery.trim() !== "" || hasActiveFilters;

  const categorySummary = useMemo(() => {
    if (hasActiveFilters) {
      const totalsByCategory = new Map<
        number,
        { categoryId: number; categoryName: string; icon: string; total: number }
      >();

      for (const expense of baseFilteredExpenses) {
        const id = expense.category.id;
        const existing = totalsByCategory.get(id);
        if (existing) {
          existing.total += expense.amount;
        } else {
          totalsByCategory.set(id, {
            categoryId: id,
            categoryName: expense.category.name,
            icon: expense.category.icon,
            total: expense.amount,
          });
        }
      }

      return Array.from(totalsByCategory.values()).sort((a, b) => b.total - a.total);
    }

    return (summary?.byCategory ?? [])
      .map((item) => {
        const category = findCategoryByName(categories, item.category);
        return {
          categoryId: category?.id,
          categoryName: item.category,
          icon: category?.icon ?? "🧾",
          total: item.total,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [hasActiveFilters, baseFilteredExpenses, categories, summary]);

  const clearFilters = () => {
    setSelectedCategoryId(null);
    setSelectedCategoryName(null);
    setSelectedAccountId(null);
    setSelectedDate(null);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    if (selectedDate && !selectedDate.startsWith(month)) {
      setSelectedDate(null);
    }
  };

  const handleHeatmapDayClick = (date: string) => {
    setSelectedDate(date);
    setSelectedMonth(date.slice(0, 7));
  };

  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const selectedCategoryLabel = useMemo(() => {
    if (selectedCategoryId !== null) {
      return (
        categories.find((c) => c.id === selectedCategoryId)?.name ??
        categorySummary.find((c) => c.categoryId === selectedCategoryId)?.categoryName
      );
    }
    return selectedCategoryName;
  }, [selectedCategoryId, selectedCategoryName, categories, categorySummary]);

  const selectedAccountLabel = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId)?.name ?? null,
    [accounts, selectedAccountId]
  );

  const filterPills = useMemo(() => {
    const pills: { key: string; label: string; onRemove: () => void }[] = [];

    if (selectedDate) {
      pills.push({
        key: "date",
        label: `Date: ${selectedDateLabel}`,
        onRemove: () => setSelectedDate(null),
      });
    }

    if (selectedCategoryLabel) {
      pills.push({
        key: "category",
        label: `Category: ${selectedCategoryLabel}`,
        onRemove: () => {
          setSelectedCategoryId(null);
          setSelectedCategoryName(null);
        },
      });
    }

    if (selectedAccountLabel) {
      pills.push({
        key: "account",
        label: `Account: ${selectedAccountLabel}`,
        onRemove: () => setSelectedAccountId(null),
      });
    }

    return pills;
  }, [selectedDate, selectedDateLabel, selectedCategoryLabel, selectedAccountLabel]);

  const handleCategoryChipClick = (
    categoryId: number | undefined,
    categoryName: string
  ) => {
    if (categoryId !== undefined) {
      setSelectedCategoryName(null);
      setSelectedCategoryId((prev) => (prev === categoryId ? null : categoryId));
      return;
    }

    setSelectedCategoryId(null);
    setSelectedCategoryName((prev) =>
      prev?.toLowerCase().trim() === categoryName.toLowerCase().trim() ? null : categoryName
    );
  };

  const isCategoryChipActive = (categoryId: number | undefined, categoryName: string) => {
    if (categoryId !== undefined) {
      return selectedCategoryId === categoryId;
    }
    return (
      selectedCategoryName?.toLowerCase().trim() === categoryName.toLowerCase().trim()
    );
  };

  const handleExportCsv = () => {
    exportToCsv(
      displayedExpenses.map((expense) => ({
        date: expense.expenseDate.slice(0, 10),
        description: expense.note ?? "",
        category: expense.category.name,
        account: expense.accountName,
        amount: expense.amount,
      })),
      getVaultExportFilename("expenses", selectedMonth)
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Expenses</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading || displayedExpenses.length === 0}
            className="btn-interactive flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-600 bg-[#111a28] px-4 py-2.5 text-base font-semibold text-gray-100 hover:border-emerald-400 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:text-sm"
          >
            <Download className="h-4 w-4" />
            {hasExportFilter
              ? `Export CSV (${displayedExpenses.length})`
              : "Export CSV"}
          </button>
          <button
            type="button"
            onClick={handleAddClick}
            className="btn-interactive flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-base font-semibold text-white hover:bg-emerald-400 sm:w-auto sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>

      <div className="border-b border-gray-800 px-0 py-2">
        {loading ? (
          <div className="mb-4 space-y-2">
            <Skeleton variant="text" className="h-5 w-48" />
            <Skeleton variant="text" className="h-4 w-32" />
          </div>
        ) : !error ? (
          <p className="mb-4 text-sm text-gray-400">
            <span className="font-semibold text-white">{formatCurrency(totalAmount)}</span>
            {selectedDate ? (
              <> spent on {selectedDateLabel}</>
            ) : (
              <> spent in {monthLabel}</>
            )}
            <span className="text-gray-600">
              {" "}
              · {baseFilteredExpenses.length}{" "}
              {baseFilteredExpenses.length === 1 ? "entry" : "entries"}
            </span>
          </p>
        ) : null}
      </div>

      <div className="space-y-5">
        <div>
          <TransactionSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search expenses..."
          />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowHeatmap((open) => !open)}
            aria-expanded={showHeatmap}
            className="mb-3 inline-flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-gray-300"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-modal ease-standard ${
                showHeatmap ? "rotate-0" : "-rotate-90"
              }`}
            />
            {showHeatmap ? "Hide heatmap" : "Show heatmap"}
          </button>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-modal ease-standard ${
              showHeatmap ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div
              className={`overflow-hidden ${showHeatmap ? "" : "pointer-events-none"}`}
              aria-hidden={!showHeatmap}
              inert={!showHeatmap}
            >
              <ExpenseHeatmap
                year={heatmapYear}
                onYearChange={setHeatmapYear}
                onDayClick={handleHeatmapDayClick}
                selectedDate={selectedDate}
                enabled={showHeatmap}
              />
            </div>
          </div>
        </div>

        <ExpenseFilters
          month={selectedMonth}
          categoryId={selectedCategoryId}
          categories={categories}
          accountId={selectedAccountId}
          accounts={accounts}
          onMonthChange={handleMonthChange}
          onCategoryChange={(id) => {
            setSelectedCategoryId(id);
            setSelectedCategoryName(null);
          }}
          onAccountChange={setSelectedAccountId}
        />

        <ActiveFilterPills pills={filterPills} onClearAll={clearFilters} />

        {!error && categorySummary.length > 0 && (
          <div className="mb-4 rounded-card-lg bg-surface-raised p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {selectedDate ? `${selectedDateLabel} - Breakdown` : `${monthLabel} - Breakdown`}
              {hasActiveFilters ? " (filtered)" : ""}
            </p>

            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {categorySummary.map(({ categoryId, categoryName, icon, total }) => {
                const active = isCategoryChipActive(categoryId, categoryName);

                return (
                  <button
                    key={categoryId ?? categoryName}
                    type="button"
                    className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                      active
                        ? "border-red-400/60 bg-red-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                    onClick={() => handleCategoryChipClick(categoryId, categoryName)}
                    title="Click to filter by this category"
                  >
                    <span className="text-base">{icon}</span>
                    <div>
                      <p className="mb-0.5 text-[10px] font-medium leading-none text-gray-400">
                        {categoryName}
                      </p>
                      <p className="text-sm font-bold text-red-400">{formatCurrency(total)}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
              <span className="text-xs text-gray-500">Total spent</span>
              <span className="text-sm font-bold text-white">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        )}

        {error ? (
          <ErrorMessage message="Unable to load expenses." onRetry={() => void refetch()} />
        ) : searchQuery.trim().length > 0 && !loading && displayedExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Search className="mb-3 h-8 w-8 opacity-50" />
            <p className="text-sm">No expenses match &quot;{searchQuery}&quot;</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                Clear search
              </button>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-gray-400 hover:text-gray-300"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="text" className="h-14 rounded-xl" />
            ))}
          </div>
        ) : baseFilteredExpenses.length === 0 && !hasActiveFilters ? (
          <EmptyState
            icon={Receipt}
            title={
              selectedDate
                ? `No expenses on ${selectedDateLabel}`
                : `No expenses in ${monthLabel}`
            }
            description="Try a different month or add your first expense."
            action={{ label: "Add expense", onClick: handleAddClick }}
          />
        ) : (
          <ExpenseList
            expenses={displayedExpenses}
            hasActiveFilters={hasActiveFilters}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onClearFilters={clearFilters}
          />
        )}
      </div>

      {showForm ? (
        <ExpenseForm
          expense={editingExpense}
          initialValues={initialExpenseValues}
          categories={categories}
          accounts={accounts}
          viewMonth={selectedMonth}
          onSuccess={handleFormSuccess}
          onClose={handleFormClose}
        />
      ) : null}

      {toast ? (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      ) : null}
    </div>
  );
}
