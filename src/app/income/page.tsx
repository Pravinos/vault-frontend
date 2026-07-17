"use client";

import { useCallback, useMemo, useState } from "react";
import { Download, Plus, Search, Wallet } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import IncomeFilters from "@/components/income/IncomeFilters";
import IncomeForm from "@/components/income/IncomeForm";
import IncomeList from "@/components/income/IncomeList";
import ActiveFilterPills from "@/components/ui/ActiveFilterPills";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import TransactionSearch from "@/components/ui/TransactionSearch";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import { exportToCsv, getVaultExportFilename } from "@/lib/csv";
import { formatMonth, getLocalDateString, getMonthString } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/currencyContext";
import { useIncome } from "@/lib/hooks/useIncome";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useIncomeCategories } from "@/lib/hooks/useIncomeCategories";
import { useDeleteIncome } from "@/lib/hooks/useIncomeMutations";
import { queryKeys } from "@/lib/queryKeys";
import type { Income, CreateIncomePayload } from "@/types";

export default function IncomePage() {
  const formatCurrency = useFormatCurrency();
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

  const { data, isLoading: loading, error, refetch } = useIncome(selectedMonth);
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
      incomeDate: getLocalDateString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await deleteIncomeMutation.mutateAsync(id);
    setToast({ message: "Income deleted", type: "success" });
  };

  const handleEdit = (entry: Income) => {
    setEditingIncome(entry);
    setShowForm(true);
  };

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingIncome(undefined);
    setInitialIncomeValues(undefined);
  }, []);

  const handleFormSuccess = useCallback(
    async (message: string) => {
      setToast({ message, type: "success" });
      await qc.invalidateQueries({ queryKey: queryKeys.income(selectedMonth) });
      await qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      await qc.invalidateQueries({ queryKey: queryKeys.accounts });
      await qc.invalidateQueries({ queryKey: queryKeys.goals });
    },
    [qc, selectedMonth]
  );

  const baseFilteredIncome = useMemo(() => {
    if (!selectedAccountId) return income;
    return income.filter((entry) => entry.accountId === selectedAccountId);
  }, [income, selectedAccountId]);

  const displayedIncome = useMemo(() => {
    if (!searchQuery.trim()) return baseFilteredIncome;
    const q = searchQuery.toLowerCase().trim();
    return baseFilteredIncome.filter((item) => {
      const noteMatch = item.note?.toLowerCase().includes(q);
      const amountMatch = item.amount.toString().includes(q);
      const categoryMatch = item.categoryName?.toLowerCase().includes(q);
      const accountMatch = item.accountName?.toLowerCase().includes(q);
      return Boolean(noteMatch || amountMatch || categoryMatch || accountMatch);
    });
  }, [baseFilteredIncome, searchQuery]);

  const totalIncome = useMemo(
    () => baseFilteredIncome.reduce((sum, entry) => sum + entry.amount, 0),
    [baseFilteredIncome]
  );

  const monthLabel = selectedMonth ? formatMonth(selectedMonth) : "";

  const hasActiveFilters = selectedAccountId !== null;
  const hasExportFilter = searchQuery.trim() !== "" || hasActiveFilters;

  const summaryItems = useMemo(() => {
    if (hasActiveFilters) {
      const totalsByCategory = new Map<
        string,
        { category: string; total: number; icon: string }
      >();

      for (const entry of baseFilteredIncome) {
        const existing = totalsByCategory.get(entry.categoryName);
        if (existing) {
          existing.total += entry.amount;
        } else {
          totalsByCategory.set(entry.categoryName, {
            category: entry.categoryName,
            total: entry.amount,
            icon: entry.categoryIcon,
          });
        }
      }

      return Array.from(totalsByCategory.values()).sort((a, b) => b.total - a.total);
    }

    return Object.entries(summary)
      .map(([category, total]) => {
        const matchingCategory = categories.find((c) => c.name === category);
        return {
          category,
          total,
          icon: matchingCategory?.icon ?? "💶",
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [hasActiveFilters, baseFilteredIncome, categories, summary]);

  const clearFilters = () => {
    setSelectedAccountId(null);
  };

  const selectedAccountLabel = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId)?.name ?? null,
    [accounts, selectedAccountId]
  );

  const filterPills = useMemo(() => {
    if (!selectedAccountLabel) {
      return [];
    }

    return [
      {
        key: "account",
        label: `Account: ${selectedAccountLabel}`,
        onRemove: () => setSelectedAccountId(null),
      },
    ];
  }, [selectedAccountLabel]);

  const handleExportCsv = () => {
    exportToCsv(
      displayedIncome.map((entry) => ({
        date: entry.incomeDate.slice(0, 10),
        description: entry.note ?? "",
        category: entry.categoryName,
        account: entry.accountName,
        amount: entry.amount,
      })),
      getVaultExportFilename("income", selectedMonth)
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Income</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading || displayedIncome.length === 0}
            className="btn-interactive flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-600 bg-[#111a28] px-4 py-2.5 text-base font-semibold text-gray-100 hover:border-emerald-400 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:text-sm"
          >
            <Download className="h-4 w-4" />
            {hasExportFilter ? `Export CSV (${displayedIncome.length})` : "Export CSV"}
          </button>
          <button
            type="button"
            onClick={handleAddClick}
            className="btn-interactive flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-base font-semibold text-white hover:bg-emerald-400 sm:w-auto sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Income
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
            <span className="font-semibold text-white">{formatCurrency(totalIncome)}</span> income
            in {monthLabel}
            <span className="text-gray-600">
              {" "}
              · {baseFilteredIncome.length}{" "}
              {baseFilteredIncome.length === 1 ? "entry" : "entries"}
            </span>
          </p>
        ) : null}
      </div>

      <div className="space-y-5">
        <div>
          <TransactionSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search income..."
          />
        </div>

        <IncomeFilters
          month={selectedMonth}
          accountId={selectedAccountId}
          accounts={accounts}
          onMonthChange={setSelectedMonth}
          onAccountChange={setSelectedAccountId}
        />

        <ActiveFilterPills pills={filterPills} onClearAll={clearFilters} />

        {!error && summaryItems.length > 0 && (
          <div className="mb-4 rounded-card-lg bg-surface-raised p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {monthLabel} - Breakdown{hasActiveFilters ? " (filtered)" : ""}
            </h2>

            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {summaryItems.map(({ category, icon, total }) => (
                <div
                  key={category}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <span className="text-base">{icon}</span>
                  <div>
                    <p className="text-[10px] font-medium text-gray-400">{category}</p>
                    <p className="text-sm font-bold text-emerald-400">{formatCurrency(total)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
              <span className="text-xs text-gray-500">Total income</span>
              <span className="text-sm font-bold text-white">{formatCurrency(totalIncome)}</span>
            </div>
          </div>
        )}

        {error ? (
          <ErrorMessage message="Unable to load income." onRetry={() => void refetch()} />
        ) : searchQuery.trim().length > 0 && !loading && displayedIncome.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Search className="mb-3 h-8 w-8 opacity-50" />
            <p className="text-sm">No income entries match &quot;{searchQuery}&quot;</p>
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
        ) : baseFilteredIncome.length === 0 && !hasActiveFilters ? (
          <EmptyState
            icon={Wallet}
            title={`No income in ${monthLabel}`}
            description="Try a different month or add your first income entry."
            action={{ label: "Add income", onClick: handleAddClick }}
          />
        ) : (
          <IncomeList
            income={displayedIncome}
            hasActiveFilters={hasActiveFilters}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onClearFilters={clearFilters}
          />
        )}
      </div>

      {showForm ? (
        <IncomeForm
          income={editingIncome}
          initialValues={initialIncomeValues}
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
