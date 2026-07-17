"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import Modal from "@/components/ui/Modal";
import SelectField from "@/components/ui/SelectField";
import { createIncome, updateIncome } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { useModalDismiss } from "@/lib/hooks/useModalDismiss";
import { formatMonth, getLocalDateString } from "@/lib/utils";
import type { Account, CreateIncomePayload, Income, IncomeCategory } from "@/types";

function normalizeDate(value: string | undefined): string {
  return (value ?? "").slice(0, 10);
}

type IncomeFormProps = {
  income?: Income;
  categories: IncomeCategory[];
  accounts: Account[];
  viewMonth: string;
  initialValues?: Partial<CreateIncomePayload>;
  onSuccess: (message: string) => void;
  onClose: () => void;
};

type FormErrors = {
  amount?: string;
  incomeCategoryId?: string;
  accountId?: string;
  incomeDate?: string;
  note?: string;
};

export default function IncomeForm({
  income,
  categories,
  accounts,
  viewMonth,
  initialValues,
  onSuccess,
  onClose,
}: IncomeFormProps) {
  const { isOpen, requestClose } = useModalDismiss();
  const [amount, setAmount] = useState<string>(
    income?.amount.toString() ?? initialValues?.amount?.toString() ?? ""
  );
  const [incomeCategoryId, setIncomeCategoryId] = useState<string>(
    income?.incomeCategoryId.toString() ?? initialValues?.incomeCategoryId?.toString() ?? ""
  );
  const [accountId, setAccountId] = useState<string>(income?.accountId ?? initialValues?.accountId ?? "");
  const [incomeDate, setIncomeDate] = useState<string>(
    normalizeDate(income?.incomeDate ?? initialValues?.incomeDate) || getLocalDateString()
  );
  const [note, setNote] = useState<string>(income?.note ?? initialValues?.note ?? "");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditMode = useMemo(() => Boolean(income), [income]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  );

  const entryMonth = incomeDate.slice(0, 7);
  const isCrossMonth = Boolean(entryMonth && viewMonth && entryMonth !== viewMonth);
  const crossMonthLabel = entryMonth ? formatMonth(entryMonth) : "";

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0.01) {
      nextErrors.amount = "Amount must be greater than 0";
    }

    if (!incomeCategoryId) {
      nextErrors.incomeCategoryId = "Category is required";
    }

    if (!accountId) {
      nextErrors.accountId = "Account is required";
    }

    if (!incomeDate) {
      nextErrors.incomeDate = "Date is required";
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

    if (accounts.length === 0) {
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    const payload: CreateIncomePayload = {
      amount: Number(amount),
      incomeCategoryId: Number(incomeCategoryId),
      accountId,
      incomeDate,
      note: note.trim() ? note.trim() : undefined,
    };

    try {
      if (income) {
        await updateIncome(income.id, payload);
        onSuccess("Income updated");
      } else {
        await createIncome(payload);
        onSuccess("Income created");
      }

      requestClose();
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Unable to save income."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={requestClose}
      onClosed={onClose}
      title={isEditMode ? "Edit Income" : "Add Income"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {formError}
          </p>
        ) : null}

        {accounts.length === 0 ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            No accounts yet.{" "}
            <Link href="/accounts" className="font-medium text-emerald-400 hover:text-emerald-300">
              Create an account
            </Link>{" "}
            before adding income.
          </p>
        ) : null}

        <div>
          <label htmlFor="income-amount" className="text-sm text-gray-200">
            Amount
          </label>
          <input
            id="income-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
            required
          />
          {errors.amount ? <p className="mt-1 text-xs text-red-400">{errors.amount}</p> : null}
        </div>

        <div>
          <SelectField
            id="income-category"
            label="Category"
            value={incomeCategoryId}
            onChange={(event) => setIncomeCategoryId(event.target.value)}
            required
          >
            <option value="" disabled>
              Select category
            </option>
            {sortedCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </SelectField>
          {errors.incomeCategoryId ? (
            <p className="mt-1 text-xs text-red-400">{errors.incomeCategoryId}</p>
          ) : null}
        </div>

        <div>
          <SelectField
            id="income-account"
            label="Account"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            required
            disabled={accounts.length === 0}
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
          {errors.accountId ? <p className="mt-1 text-xs text-red-400">{errors.accountId}</p> : null}
        </div>

        <div>
          <label htmlFor="income-date" className="text-sm text-gray-200">
            Date
          </label>
          <input
            id="income-date"
            type="date"
            value={incomeDate}
            onChange={(event) => setIncomeDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
            required
          />
          {errors.incomeDate ? <p className="mt-1 text-xs text-red-400">{errors.incomeDate}</p> : null}
          {isCrossMonth ? (
            <p className="mt-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
              This income will appear in <span className="font-medium">{crossMonthLabel}</span> after
              saving.
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="income-note" className="text-sm text-gray-200">
            Note
          </label>
          <input
            id="income-note"
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
            maxLength={255}
            placeholder="Optional"
          />
          {errors.note ? <p className="mt-1 text-xs text-red-400">{errors.note}</p> : null}
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={requestClose}
            className="btn-interactive w-full rounded-lg border border-gray-700 px-4 py-2 text-base text-gray-200 hover:border-gray-500 sm:w-auto sm:text-sm"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-interactive w-full rounded-lg bg-emerald-500 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:text-sm"
            disabled={isSubmitting || accounts.length === 0}
          >
            {isSubmitting ? "Saving..." : isEditMode ? "Save" : "Add"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
