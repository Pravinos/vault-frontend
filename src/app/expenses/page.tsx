"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import ExpenseFilters from "@/components/expenses/ExpenseFilters";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import ExpenseList from "@/components/expenses/ExpenseList";
import TransactionSearch from "@/components/ui/TransactionSearch";
import Skeleton from "@/components/ui/Skeleton";
import { formatCurrency, formatMonth, getMonthString } from "@/lib/utils";
import { useExpenses } from "@/lib/hooks/useExpenses";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useCategories } from "@/lib/hooks/useCategories";
import { useDeleteExpense } from "@/lib/hooks/useExpenseMutations";
import { queryKeys } from "@/lib/queryKeys";
import type { Category, Expense, CreateExpenseRequest } from "@/types";

export default function ExpensesPage() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonthString());
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [initialExpenseValues, setInitialExpenseValues] = useState<
    CreateExpenseRequest | undefined
  >(undefined);

  const qc = useQueryClient();

  const { data, isLoading: loading, error } = useExpenses(selectedMonth);
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const deleteExpenseMutation = useDeleteExpense(selectedMonth);

  const expenses = data?.expenses ?? [];
  const summary = data?.summary ?? null;

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
      expenseDate: new Date().toISOString().slice(0, 10),
    });
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
    await qc.invalidateQueries({ queryKey: queryKeys.goals });
  }, [qc, selectedMonth]);

  const displayedExpenses = useMemo(() => {
    // Start with month-scoped data (already fetched for selectedMonth)
    let data = expenses;

    // Apply existing filters first
    if (selectedCategoryId !== null) data = data.filter((e) => e.category.id === selectedCategoryId);
    if (selectedAccountId) data = data.filter((e) => e.accountId === selectedAccountId);

    // Then apply search
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();
    return data.filter((item) => {
      const noteMatch = item.note?.toLowerCase().includes(q);
      const amountMatch = item.amount.toString().includes(q);
      const categoryMatch = item.category.name?.toLowerCase().includes(q);
      const accountMatch = item.accountName?.toLowerCase().includes(q);
      return Boolean(noteMatch || amountMatch || categoryMatch || accountMatch);
    });
  }, [expenses, selectedCategoryId, selectedAccountId, searchQuery]);

  const baseFilteredExpenses = useMemo(() => {
    let data = expenses;
    if (selectedCategoryId !== null) data = data.filter((e) => e.category.id === selectedCategoryId);
    if (selectedAccountId) data = data.filter((e) => e.accountId === selectedAccountId);
    return data;
  }, [expenses, selectedCategoryId, selectedAccountId]);

  const totalAmount = useMemo(
    () => baseFilteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [baseFilteredExpenses]
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
              {" "}· {baseFilteredExpenses.length} {baseFilteredExpenses.length === 1 ? "entry" : "entries"}
            </span>
          </p>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <TransactionSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search expenses..." />
        </div>

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
        {/* When a search is active and there are no matches, show contextual empty state */}
        {searchQuery.trim().length > 0 && !loading && displayedExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Search className="w-8 h-8 mb-3 opacity-50" />
            <p className="text-sm">No transactions match "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-2 text-xs text-emerald-400 hover:text-emerald-300"
            >
              Clear search
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="text" className="h-14 rounded-xl" />
            ))}
          </div>
        ) : (
          <ExpenseList
            expenses={displayedExpenses}
            monthLabel={monthLabel}
            hasActiveFilters={hasActiveFilters}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onClearFilters={clearFilters}
            onAddClick={handleAddClick}
          />
        )}
      </div>

      {showForm ? (
        <ExpenseForm
          expense={editingExpense}
          initialValues={initialExpenseValues}
          categories={categories}
          accounts={accounts}
          onSuccess={handleFormSuccess}
          onClose={() => {
            setShowForm(false);
            setInitialExpenseValues(undefined);
          }}
        />
      ) : null}
    </div>
  );
}
