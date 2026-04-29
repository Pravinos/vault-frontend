"use client";

import { useEffect, useMemo, useState } from "react";

import { createExpense, updateExpense } from "@/lib/api";
import Modal from "@/components/ui/Modal";
import type { Category, CreateExpenseRequest, Expense } from "@/types";

type ExpenseFormProps = {
  expense?: Expense;
  categories: Category[];
  onSuccess: () => void;
  onClose: () => void;
};

type FormErrors = {
  amount?: string;
  categoryId?: string;
  expenseDate?: string;
  note?: string;
};

const todayString = () => new Date().toISOString().slice(0, 10);

export default function ExpenseForm({
  expense,
  categories,
  onSuccess,
  onClose,
}: ExpenseFormProps) {
  const [amount, setAmount] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [expenseDate, setExpenseDate] = useState<string>(todayString());
  const [note, setNote] = useState<string>("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditMode = useMemo(() => Boolean(expense), [expense]);

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setCategoryId(expense.category.id.toString());
      setExpenseDate(expense.expenseDate);
      setNote(expense.note ?? "");
      setErrors({});
      return;
    }

    setAmount("");
    setCategoryId("");
    setExpenseDate(todayString());
    setNote("");
    setErrors({});
  }, [expense]);

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0.01) {
      nextErrors.amount = "Amount must be at least 0.01";
    }

    if (!categoryId) {
      nextErrors.categoryId = "Category is required";
    }

    if (!expenseDate) {
      nextErrors.expenseDate = "Date is required";
    }

    if (note.length > 255) {
      nextErrors.note = "Note must be 255 characters or less";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    const payload: CreateExpenseRequest = {
      amount: Number(amount),
      categoryId: Number(categoryId),
      expenseDate: expenseDate || undefined,
      note: note.trim() ? note.trim() : undefined,
    };

    try {
      if (expense) {
        await updateExpense(expense.id, payload);
      } else {
        await createExpense(payload);
      }

      onSuccess();
      onClose();
    } catch (error) {
      setFormError("Unable to save expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditMode ? "Edit Expense" : "Add Expense"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {formError}
          </p>
        ) : null}
        <div>
          <label className="text-sm text-gray-200">Amount</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
            required
          />
          {errors.amount ? (
            <p className="mt-1 text-xs text-red-400">{errors.amount}</p>
          ) : null}
        </div>

        <div>
          <label className="text-sm text-gray-200">Category</label>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
            required
          >
            <option value="" disabled>
              Select category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId ? (
            <p className="mt-1 text-xs text-red-400">{errors.categoryId}</p>
          ) : null}
        </div>

        <div>
          <label className="text-sm text-gray-200">Date</label>
          <input
            type="date"
            value={expenseDate}
            onChange={(event) => setExpenseDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
            required
          />
          {errors.expenseDate ? (
            <p className="mt-1 text-xs text-red-400">{errors.expenseDate}</p>
          ) : null}
        </div>

        <div>
          <label className="text-sm text-gray-200">Note</label>
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
            maxLength={255}
            placeholder="Optional"
          />
          {errors.note ? (
            <p className="mt-1 text-xs text-red-400">{errors.note}</p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:border-gray-500"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : isEditMode ? "Save" : "Add"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
