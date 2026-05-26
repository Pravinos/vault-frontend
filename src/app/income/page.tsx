"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import IncomeFilters from "@/components/income/IncomeFilters";
import IncomeForm from "@/components/income/IncomeForm";
import IncomeList from "@/components/income/IncomeList";
import TransactionSearch from "@/components/ui/TransactionSearch";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import { formatCurrency, formatMonth, getMonthString } from "@/lib/utils";
import { useIncome } from "@/lib/hooks/useIncome";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useIncomeCategories } from "@/lib/hooks/useIncomeCategories";
import { useDeleteIncome } from "@/lib/hooks/useIncomeMutations";
import { queryKeys } from "@/lib/queryKeys";
import type { Income, IncomeCategory, CreateIncomePayload } from "@/types";

export default function IncomePage() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonthString());
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingIncome, setEditingIncome] = useState<Income | undefined>(undefined);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [initialIncomeValues, setInitialIncomeValues] = useState<
    CreateIncomePayload | undefined
  >(undefined);

  const qc = useQueryClient();

  const { data, isLoading: loading, error } = useIncome(selectedMonth);
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useIncomeCategories();
  const deleteIncomeMutation = useDeleteIncome(selectedMonth);

  const income = data?.income ?? [];
  const summary = data?.summary ?? {};

  const handleAddClick = () => {
    setEditingIncome(undefined);
    setInitialIncomeValues(undefined);
    setShowForm(true);
  };

  const handleDuplicate = (entry: Income) => {
    setEditingIncome(undefined);
    setInitialIncomeValues({
      amount: entry.amount,
      incomeCategoryId: entry.incomeCategoryId,
      accountId: entry.accountId,
      note: entry.note ?? undefined,
      incomeDate: new Date().toISOString().slice(0, 10),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteIncomeMutation.mutateAsync(id);
      setToast({ message: "Income deleted", type: "success" });
    } catch {
      setToast({ message: "Unable to delete income", type: "error" });
    }
  };

  const handleEdit = (entry: Income) => {
    setEditingIncome(entry);
    setShowForm(true);
  };

  const handleFormSuccess = useCallback(async (message: string) => {
    setToast({ message, type: "success" });
    await qc.invalidateQueries({ queryKey: queryKeys.income(selectedMonth) });
    await qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    await qc.invalidateQueries({ queryKey: queryKeys.accounts });
    await qc.invalidateQueries({ queryKey: queryKeys.goals });
  }, [qc, selectedMonth]);

  const summaryItems = useMemo(
    () =>
      Object.entries(summary)
        .map(([category, total]) => {
          const matchingCategory = categories.find((item: IncomeCategory) => item.name === category);
          return {
            category,
            total,
            icon: matchingCategory?.icon ?? "💶",
          };
        })
        .sort((a, b) => b.total - a.total),
    [categories, summary]
  );

  const totalIncome = useMemo(
    () => income.reduce((sum, e) => sum + e.amount, 0),
    [income]
  );

  const displayedIncome = useMemo(() => {
    let data = income;
    if (selectedAccountId) data = data.filter((i) => i.accountId === selectedAccountId);
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();
    return data.filter((item) => {
      const noteMatch = item.note?.toLowerCase().includes(q);
      const amountMatch = item.amount.toString().includes(q);
      const categoryMatch = item.categoryName?.toLowerCase().includes(q);
      const accountMatch = item.accountName?.toLowerCase().includes(q);
      return Boolean(noteMatch || amountMatch || categoryMatch || accountMatch);
    });
  }, [income, selectedAccountId, searchQuery]);

  const monthLabel = selectedMonth ? formatMonth(selectedMonth) : "";

  const summaryTotal = useMemo(
    () => summaryItems.reduce((sum, item) => sum + item.total, 0),
    [summaryItems]
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Income</h1>
        <button
          type="button"
          onClick={handleAddClick}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-base font-semibold text-white transition-all duration-150 hover:bg-emerald-400 active:scale-95 sm:w-auto sm:text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Income
        </button>
      </div>

      {/* Summary bar */}
      {!loading && (
        <div className="border-b border-gray-800 px-0 py-2">
          <p className="mb-4 text-sm text-gray-400">
            <span className="font-semibold text-white">{formatCurrency(totalIncome)}</span>
            {" "}income in {monthLabel}
            <span className="text-gray-600"> · {income.length} {income.length === 1 ? "entry" : "entries"}</span>
          </p>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <TransactionSearch value={searchQuery} onChange={setSearchQuery} placeholder="Search income..." />
        </div>

        <IncomeFilters
          month={selectedMonth}
          accountId={selectedAccountId}
          accounts={accounts}
          onMonthChange={setSelectedMonth}
          onAccountChange={setSelectedAccountId}
        />

        <div className="mb-4 rounded-2xl bg-[#1a2332] p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {selectedMonth} - breakdown
          </h2>
          {summaryItems.length === 0 ? (
            <p className="mt-2 text-xs text-gray-500">No income summary for this month.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {summaryItems.map(({ category, icon, total }) => (
                <div
                  key={category}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <span className="text-base">{icon}</span>
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">{category}</p>
                    <p className="text-sm font-bold text-emerald-400">{formatCurrency(total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
            <span className="text-xs text-gray-500">Total income</span>
            <span className="text-sm font-bold text-white">{formatCurrency(summaryTotal)}</span>
          </div>
        </div>

        {error ? <p className="text-sm text-red-400">Unable to load income.</p> : null}
        {searchQuery.trim().length > 0 && !loading && displayedIncome.length === 0 ? (
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
          <IncomeList
            income={displayedIncome}
            month={selectedMonth}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onAddClick={handleAddClick}
          />
        )}
      </div>

      {showForm ? (
        <IncomeForm
          income={editingIncome}
          initialValues={initialIncomeValues}
          categories={categories}
          accounts={accounts}
          onSuccess={handleFormSuccess}
          onClose={() => {
            setShowForm(false);
            setInitialIncomeValues(undefined);
          }}
        />
      ) : null}

      {toast ? (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
