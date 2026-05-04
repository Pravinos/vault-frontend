"use client";

import { useMemo, useState } from "react";

import { createExpense, updateExpense } from "@/lib/api";
import Modal from "@/components/ui/Modal";
import SelectField from "@/components/ui/SelectField";
import { formatCurrency } from "@/lib/utils";
import type { Account, Category, CreateExpenseRequest, Expense } from "@/types";

type ExpenseFormProps = {
  expense?: Expense;
  categories: Category[];
  accounts: Account[];
  onSuccess: () => void;
  onClose: () => void;
};

type FormErrors = {
  amount?: string;
  categoryId?: string;
  accountId?: string;
  expenseDate?: string;
  note?: string;
};

const todayString = () => new Date().toISOString().slice(0, 10);

export default function ExpenseForm({
  expense,
  categories,
  accounts,
  onSuccess,
  onClose,
}: ExpenseFormProps) {
  const [amount, setAmount] = useState<string>(expense?.amount.toString() ?? "");
  const [categoryId, setCategoryId] = useState<string>(expense?.category.id.toString() ?? "");
  const [accountId, setAccountId] = useState<string>(expense?.accountId ?? "");
  const [expenseDate, setExpenseDate] = useState<string>(expense?.expenseDate ?? todayString());
  const [note, setNote] = useState<string>(expense?.note ?? "");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditMode = useMemo(() => Boolean(expense), [expense]);

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0.01) {
      nextErrors.amount = "Amount must be at least 0.01";
    }

    if (!categoryId) {
      nextErrors.categoryId = "Category is required";
    }

    if (!accountId) {
      nextErrors.accountId = "Account is required";
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
      accountId,
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
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
            required
          />
          {errors.amount ? (
            <p className="mt-1 text-xs text-red-400">{errors.amount}</p>
          ) : null}
        </div>

        <div>
          <SelectField
            label="Category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
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
          </SelectField>
          {errors.categoryId ? (
            <p className="mt-1 text-xs text-red-400">{errors.categoryId}</p>
          ) : null}
        </div>

        <div>
          <SelectField
            label="Account"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            required
          >
            <option value="" disabled>
              Select account
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </SelectField>
          {errors.accountId ? (
            <p className="mt-1 text-xs text-red-400">{errors.accountId}</p>
          ) : null}
        </div>

        <div>
          <label className="text-sm text-gray-200">Date</label>
          <input
            type="date"
            value={expenseDate}
            onChange={(event) => setExpenseDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
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
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
            maxLength={255}
            placeholder="Optional"
          />
          {errors.note ? (
            <p className="mt-1 text-xs text-red-400">{errors.note}</p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-gray-700 px-4 py-2 text-base text-gray-200 transition-all duration-150 hover:border-gray-500 active:scale-95 sm:w-auto sm:text-sm"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-base font-semibold text-white transition-all duration-150 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70 active:scale-95 sm:w-auto sm:text-sm"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : isEditMode ? "Save" : "Add"}
          </button>
        </div>

        {(() => {
          const selectedAccount = accounts.find((a) => a.id === accountId);
          const parsedAmt = Number(amount);
          if (!selectedAccount || !Number.isFinite(parsedAmt) || parsedAmt <= 0) return null;
          const oldAmt = isEditMode ? (expense?.amount ?? 0) : 0;
          const projected = selectedAccount.calculatedBalance + oldAmt - parsedAmt;
          return (
            <p className="mt-1 rounded-lg border border-gray-700/60 bg-gray-900/60 px-3 py-2 text-xs text-gray-400">
              After this expense,{" "}
              <span className="font-medium text-gray-300">{selectedAccount.name}</span>{" "}
              calculated balance will be:{" "}
              <span className={`font-semibold tabular-nums ${projected < 0 ? "text-red-400" : "text-emerald-400"}`}>
                {formatCurrency(projected)}
              </span>
            </p>
          );
        })()}
      </form>
    </Modal>
  );
}
