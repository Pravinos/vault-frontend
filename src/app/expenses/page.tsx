"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import ExpenseFilters from "@/components/expenses/ExpenseFilters";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import ExpenseList from "@/components/expenses/ExpenseList";
import TopBar from "@/components/layout/TopBar";
import {
  deleteExpense,
  getCategories,
  getExpenses,
} from "@/lib/api";
import { getMonthString } from "@/lib/utils";
import type { Category, Expense } from "@/types";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(getMonthString());
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(
    undefined
  );
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
        const [categoriesData, expensesData] = await Promise.all([
          getCategories(),
          getExpenses({
            month: initialMonthRef.current || undefined,
            categoryId: initialCategoryRef.current ?? undefined,
          }),
        ]);

        setCategories(categoriesData);
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

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title="Expenses"
        action={
          <button
            type="button"
            onClick={handleAddClick}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
          >
            Add Expense
          </button>
        }
      />
      <div className="flex-1 space-y-6 px-6 py-6">
        <ExpenseFilters
          month={selectedMonth}
          categoryId={selectedCategoryId}
          categories={categories}
          onMonthChange={setSelectedMonth}
          onCategoryChange={setSelectedCategoryId}
        />

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {loading ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 text-sm text-gray-300">
            Loading expenses...
          </div>
        ) : (
          <ExpenseList
            expenses={expenses}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {showForm ? (
        <ExpenseForm
          expense={editingExpense}
          categories={categories}
          onSuccess={handleFormSuccess}
          onClose={() => setShowForm(false)}
        />
      ) : null}
    </div>
  );
}
