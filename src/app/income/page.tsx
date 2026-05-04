"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";

import IncomeFilters from "@/components/income/IncomeFilters";
import IncomeForm from "@/components/income/IncomeForm";
import IncomeList from "@/components/income/IncomeList";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import {
  deleteIncome,
  getAccounts,
  getIncome,
  getIncomeCategories,
  getIncomeSummary,
} from "@/lib/api";
import { formatCurrency, formatMonth, getMonthString } from "@/lib/utils";
import type { Account, Income, IncomeCategory } from "@/types";

export default function IncomePage() {
  const [income, setIncome] = useState<Income[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonthString());
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingIncome, setEditingIncome] = useState<Income | undefined>(undefined);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const initialMonthRef = useRef<string>(selectedMonth);
  const initialAccountRef = useRef<string | null>(selectedAccountId);
  const hasFetchedAfterLoadRef = useRef<boolean>(false);

  const fetchIncome = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [incomeData, summaryData] = await Promise.all([
        getIncome({
          month: selectedMonth || undefined,
          accountId: selectedAccountId ?? undefined,
        }),
        getIncomeSummary(selectedMonth || undefined),
      ]);

      setIncome(incomeData);
      setSummary(summaryData);
    } catch (fetchError) {
      setError("Unable to load income.");
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, selectedMonth]);

  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      setError(null);

      try {
        const [accountsData, categoriesData, incomeData, summaryData] = await Promise.all([
          getAccounts(),
          getIncomeCategories(),
          getIncome({
            month: initialMonthRef.current || undefined,
            accountId: initialAccountRef.current ?? undefined,
          }),
          getIncomeSummary(initialMonthRef.current || undefined),
        ]);

        setAccounts(accountsData);
        setCategories(categoriesData);
        setIncome(incomeData);
        setSummary(summaryData);
        setHasLoaded(true);
      } catch (fetchError) {
        setError("Unable to load income.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, []);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    if (!hasFetchedAfterLoadRef.current) {
      hasFetchedAfterLoadRef.current = true;
      return;
    }

    fetchIncome();
  }, [fetchIncome, hasLoaded]);

  const handleAddClick = () => {
    setEditingIncome(undefined);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteIncome(id);
      setToast({ message: "Income deleted", type: "success" });
      await fetchIncome();
    } catch (deleteError) {
      setToast({ message: "Unable to delete income", type: "error" });
    }
  };

  const handleEdit = (entry: Income) => {
    setEditingIncome(entry);
    setShowForm(true);
  };

  const summaryItems = useMemo(
    () =>
      Object.entries(summary)
        .map(([category, total]) => {
          const matchingCategory = categories.find((item) => item.name === category);
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

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="text" className="h-14 rounded-xl" />
            ))}
          </div>
        ) : (
          <IncomeList
            income={income}
            month={selectedMonth}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddClick={handleAddClick}
          />
        )}
      </div>

      {showForm ? (
        <IncomeForm
          income={editingIncome}
          categories={categories}
          accounts={accounts}
          onSuccess={async (message) => {
            setToast({ message, type: "success" });
            await fetchIncome();
          }}
          onClose={() => setShowForm(false)}
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
