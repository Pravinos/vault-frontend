"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import ExpenseFilters from "@/components/expenses/ExpenseFilters";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import ExpenseList from "@/components/expenses/ExpenseList";
import Skeleton from "@/components/ui/Skeleton";
import { formatCurrency, formatMonth, getMonthString } from "@/lib/utils";
import { useExpenses } from "@/lib/hooks/useExpenses";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useCategories } from "@/lib/hooks/useCategories";
import { useDeleteExpense } from "@/lib/hooks/useExpenseMutations";
import { queryKeys } from "@/lib/queryKeys";
import type { Category, Expense } from "@/types";

export default function ExpensesPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonthString());
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);

  const qc = useQueryClient();

  const { data, isLoading: loading, error } = useExpenses(selectedMonth);
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const deleteExpenseMutation = useDeleteExpense(selectedMonth);

  const expenses = data?.expenses ?? [];
  const summary = data?.summary ?? null;

  const handleAddClick = () => {
    setEditingExpense(undefined);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await deleteExpenseMutation.mutateAsync(id);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleFormSuccess = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.expenses(selectedMonth) });
    await qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    await qc.invalidateQueries({ queryKey: queryKeys.accounts });
  }, [qc, selectedMonth]);

  const filteredExpenses = useMemo(
    () =>
      selectedAccountId
        ? expenses.filter((e) => e.accountId === selectedAccountId)
        : expenses,
    [expenses, selectedAccountId]
  );

  const totalAmount = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const monthLabel = selectedMonth ? formatMonth(selectedMonth) : "";

  const categorySummary = useMemo(
    () =>
      (summary?.byCategory ?? [])
        .map((item) => {
          const category = categories.find((c: Category) => c.name === item.category);
          return {
            categoryId: category?.id,
            categoryName: item.category,
            icon: category?.icon ?? "🧾",
            total: item.total,
          };
        })
        .sort((a, b) => b.total - a.total),
    [categories, summary]
  );

  const hasActiveFilters = selectedCategoryId !== null || selectedAccountId !== null;

  const clearFilters = () => {
    setSelectedCategoryId(null);
    setSelectedAccountId(null);
  };

  const handleCategoryChipClick = (categoryId: number | undefined) => {
    if (!categoryId) {
      return;
    }

    setSelectedCategoryId((prev) => (prev === categoryId ? null : categoryId));
  };
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Expenses</h1>
        <button
          type="button"
          onClick={handleAddClick}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-base font-semibold text-white transition-all duration-150 hover:bg-emerald-400 active:scale-95 sm:w-auto sm:text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
      </div>

      {/* Summary bar */}
      {!loading && (
        <div className="border-b border-gray-800 px-0 py-2">
          <p className="mb-4 text-sm text-gray-400">
            <span className="font-semibold text-white">{formatCurrency(totalAmount)}</span>
            {" "}spent in {monthLabel}
            <span className="text-gray-600">
              {" "}· {filteredExpenses.length} {filteredExpenses.length === 1 ? "entry" : "entries"}
            </span>
          </p>
        </div>
      )}

      <div className="space-y-5">
        <ExpenseFilters
          month={selectedMonth}
          categoryId={selectedCategoryId}
          categories={categories}
          accountId={selectedAccountId}
          accounts={accounts}
          onMonthChange={setSelectedMonth}
          onCategoryChange={setSelectedCategoryId}
          onAccountChange={setSelectedAccountId}
        />

        {categorySummary.length > 0 && (
          <div className="mb-4 rounded-2xl bg-[#1a2332] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {monthLabel} - Breakdown
            </p>

            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {categorySummary.map(({ categoryId, categoryName, icon, total }) => {
                const active = categoryId !== undefined && selectedCategoryId === categoryId;

                return (
                  <button
                    key={categoryName}
                    type="button"
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                      active
                        ? "border-red-400/60 bg-red-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                    onClick={() => handleCategoryChipClick(categoryId)}
                    title="Click to filter by this category"
                    disabled={categoryId === undefined}
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

        {error ? <p className="text-sm text-red-400">Unable to load expenses.</p> : null}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="text" className="h-14 rounded-xl" />
            ))}
          </div>
        ) : (
          <ExpenseList
            expenses={filteredExpenses}
            monthLabel={monthLabel}
            hasActiveFilters={hasActiveFilters}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onClearFilters={clearFilters}
          />
        )}
      </div>

      {showForm ? (
        <ExpenseForm
          expense={editingExpense}
          categories={categories}
          accounts={accounts}
          onSuccess={handleFormSuccess}
          onClose={() => setShowForm(false)}
        />
      ) : null}
    </div>
  );
}
