"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import Modal from "@/components/ui/Modal";
import { createIncome, updateIncome } from "@/lib/api";
import type { Account, CreateIncomePayload, Income, IncomeCategory } from "@/types";

type IncomeFormProps = {
  income?: Income;
  categories: IncomeCategory[];
  accounts: Account[];
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

const todayString = () => new Date().toISOString().slice(0, 10);

export default function IncomeForm({
  income,
  categories,
  accounts,
  onSuccess,
  onClose,
}: IncomeFormProps) {
  const [amount, setAmount] = useState<string>(income?.amount.toString() ?? "");
  const [incomeCategoryId, setIncomeCategoryId] = useState<string>(
    income?.incomeCategoryId.toString() ?? ""
  );
  const [accountId, setAccountId] = useState<string>(income?.accountId ?? "");
  const [incomeDate, setIncomeDate] = useState<string>(income?.incomeDate ?? todayString());
  const [note, setNote] = useState<string>(income?.note ?? "");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditMode = useMemo(() => Boolean(income), [income]);

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

      onClose();
    } catch (error) {
      setFormError("Unable to save income.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={isEditMode ? "Edit Income" : "Add Income"}>
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
          {errors.amount ? <p className="mt-1 text-xs text-red-400">{errors.amount}</p> : null}
        </div>

        <div>
          <label className="text-sm text-gray-200">Category</label>
          <div className="relative mt-1">
          <select
            value={incomeCategoryId}
            onChange={(event) => setIncomeCategoryId(event.target.value)}
            className="w-full appearance-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 pr-9 text-base text-white"
            required
          >
            <option value="" disabled>
              Select category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          {errors.incomeCategoryId ? (
            <p className="mt-1 text-xs text-red-400">{errors.incomeCategoryId}</p>
          ) : null}
        </div>

        <div>
          <label className="text-sm text-gray-200">Account</label>
          <div className="relative mt-1">
          <select
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            className="w-full appearance-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 pr-9 text-base text-white"
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
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          {errors.accountId ? <p className="mt-1 text-xs text-red-400">{errors.accountId}</p> : null}
        </div>

        <div>
          <label className="text-sm text-gray-200">Date</label>
          <input
            type="date"
            value={incomeDate}
            onChange={(event) => setIncomeDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
            required
          />
          {errors.incomeDate ? <p className="mt-1 text-xs text-red-400">{errors.incomeDate}</p> : null}
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
          {errors.note ? <p className="mt-1 text-xs text-red-400">{errors.note}</p> : null}
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-gray-700 px-4 py-2 text-base text-gray-200 hover:border-gray-500 sm:w-auto sm:text-sm"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:text-sm"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : isEditMode ? "Save" : "Add"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
