"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";

import ExpenseFilters from "@/components/expenses/ExpenseFilters";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import ExpenseList from "@/components/expenses/ExpenseList";
import TopBar from "@/components/layout/TopBar";
import Skeleton from "@/components/ui/Skeleton";
import {
  getAccounts,
  deleteExpense,
  getCategories,
  getExpenses,
} from "@/lib/api";
import { formatCurrency, getMonthString } from "@/lib/utils";
import type { Account, Category, Expense } from "@/types";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonthString());
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const initialMonthRef = useRef<string>(selectedMonth);
  const initialCategoryRef = useRef<number | null>(selectedCategoryId);
  const hasFetchedAfterLoadRef = useRef<boolean>(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getExpenses({
        month: selectedMonth || undefined,
        categoryId: selectedCategoryId ?? undefined,
      });
      setExpenses(data);
    } catch (err) {
      setError("Unable to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId, selectedMonth]);

  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      setError(null);

      try {
        const [categoriesData, accountsData, expensesData] = await Promise.all([
          getCategories(),
          getAccounts(),
          getExpenses({
            month: initialMonthRef.current || undefined,
            categoryId: initialCategoryRef.current ?? undefined,
          }),
        ]);

        setCategories(categoriesData);
        setAccounts(accountsData);
        setExpenses(expensesData);
        setHasLoaded(true);
      } catch (err) {
        setError("Unable to load expenses.");
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

    fetchExpenses();
  }, [fetchExpenses, hasLoaded]);

  const handleAddClick = () => {
    setEditingExpense(undefined);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense(id);
      await fetchExpenses();
    } catch (err) {
      setError("Unable to delete expense.");
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleFormSuccess = async () => {
    await fetchExpenses();
  };

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

  const monthLabel = selectedMonth
    ? new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title="Expenses"
        action={
          <button
            type="button"
            onClick={handleAddClick}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-emerald-400 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Expense
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
              Total: <span className="font-semibold text-white">{formatCurrency(totalAmount)}</span>
            </span>
            {" | "}
            <span>{filteredExpenses.length} {filteredExpenses.length === 1 ? "entry" : "entries"}</span>
          </p>
        </div>
      )}

      <div className="flex-1 space-y-5 px-4 py-5 sm:px-6">
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

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="text" className="h-14 rounded-xl" />
            ))}
          </div>
        ) : (
          <ExpenseList
            expenses={filteredExpenses}
            month={selectedMonth}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddClick={handleAddClick}
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
