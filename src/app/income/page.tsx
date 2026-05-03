"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";

import IncomeFilters from "@/components/income/IncomeFilters";
import IncomeForm from "@/components/income/IncomeForm";
import IncomeList from "@/components/income/IncomeList";
import TopBar from "@/components/layout/TopBar";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import {
  deleteIncome,
  getAccounts,
  getIncome,
  getIncomeCategories,
  getIncomeSummary,
} from "@/lib/api";
import { formatCurrency, getMonthString } from "@/lib/utils";
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

  const summaryItems = Object.entries(summary).sort((a, b) => b[1] - a[1]);

  const totalIncome = useMemo(
    () => income.reduce((sum, e) => sum + e.amount, 0),
    [income]
  );

  const monthLabel = selectedMonth
    ? new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title="Income"
        action={
          <button
            type="button"
            onClick={handleAddClick}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-emerald-400 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Income
          </button>
        }
      />

      {/* Summary bar */}
      {!loading && (
        <div className="border-b border-gray-800 px-4 py-2 sm:px-6">
          <p className="text-sm text-gray-400">
            {monthLabel && <span className="font-medium text-gray-300">{monthLabel}</span>}
            {monthLabel && " — "}
            <span className="tabular-nums">
              Total: <span className="font-semibold text-white">{formatCurrency(totalIncome)}</span>
            </span>
            {" | "}
            <span>{income.length} {income.length === 1 ? "entry" : "entries"}</span>
          </p>
        </div>
      )}

      <div className="flex-1 space-y-5 px-4 py-5 sm:px-6">
        <IncomeFilters
          month={selectedMonth}
          accountId={selectedAccountId}
          accounts={accounts}
          onMonthChange={setSelectedMonth}
          onAccountChange={setSelectedAccountId}
        />

        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-gray-400">Monthly Summary</h2>
          {summaryItems.length === 0 ? (
            <p className="mt-2 text-xs text-gray-500">No income summary for this month.</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {summaryItems.map(([categoryName, total]) => (
                <div key={categoryName} className="rounded-lg bg-gray-800/70 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{categoryName}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-emerald-300">{formatCurrency(total)}</p>
                </div>
              ))}
            </div>
          )}
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
