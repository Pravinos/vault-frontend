"use client";

import { useMemo, useState } from "react";
import axios from "axios";

import Modal from "@/components/ui/Modal";
import SelectField from "@/components/ui/SelectField";
import { createTransfer } from "@/lib/api";
import { useCurrency } from "@/lib/currencyContext";
import { useModalDismiss } from "@/lib/hooks/useModalDismiss";
import type { Account, CreateTransferPayload } from "@/types";

type TransferFormProps = {
  accounts: Account[];
  preselectedAccountId?: string | null;
  onSuccess: (payload: { fromAccountId: string; toAccountId: string }) => Promise<void> | void;
  onClose: () => void;
};

type FormErrors = {
  fromAccountId?: string;
  toAccountId?: string;
  amount?: string;
  transferDate?: string;
};

function getApiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "Unable to record transfer. Please try again.";
  }

  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (typeof data === "object" && data !== null) {
    const message = "message" in data ? data.message : undefined;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (error.message.trim()) {
    return error.message;
  }

  return "Unable to record transfer. Please try again.";
}

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function TransferForm({
  accounts,
  preselectedAccountId,
  onSuccess,
  onClose,
}: TransferFormProps) {
  const { currency } = useCurrency();
  const { isOpen, requestClose } = useModalDismiss();
  const [fromAccountId, setFromAccountId] = useState<string>(preselectedAccountId ?? "");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [transferDate, setTransferDate] = useState<string>(getTodayDateString());
  const [note, setNote] = useState<string>("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const toAccountOptions = useMemo(
    () => accounts.filter((account) => account.id !== fromAccountId),
    [accounts, fromAccountId]
  );

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    const parsedAmount = Number(amount);

    if (!fromAccountId) {
      nextErrors.fromAccountId = "Choose a source account";
    }

    if (!toAccountId) {
      nextErrors.toAccountId = "Choose a destination account";
    }

    if (fromAccountId && toAccountId && fromAccountId === toAccountId) {
      nextErrors.toAccountId = "Destination must be different from source";
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      nextErrors.amount = "Amount must be greater than 0";
    }

    if (!transferDate) {
      nextErrors.transferDate = "Transfer date is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFromAccountChange = (value: string) => {
    setFromAccountId(value);

    if (toAccountId === value) {
      setToAccountId("");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!validate()) {
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    const payload: CreateTransferPayload = {
      fromAccountId,
      toAccountId,
      amount: Number(amount),
      transferDate,
      note: note.trim() ? note.trim() : undefined,
    };

    try {
      await createTransfer(payload);
      await onSuccess({ fromAccountId, toAccountId });
      requestClose();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={requestClose} onClosed={onClose} title="Record Transfer">
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {formError}
          </p>
        ) : null}

        <div>
          <SelectField
            label="From account"
            value={fromAccountId}
            onChange={(event) => handleFromAccountChange(event.target.value)}
          >
            <option value="">Select source account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </SelectField>
          {errors.fromAccountId ? (
            <p className="mt-1 text-xs text-red-400">{errors.fromAccountId}</p>
          ) : null}
        </div>

        <div>
          <SelectField
            label="To account"
            value={toAccountId}
            onChange={(event) => setToAccountId(event.target.value)}
          >
            <option value="">Select destination account</option>
            {toAccountOptions.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </SelectField>
          {errors.toAccountId ? (
            <p className="mt-1 text-xs text-red-400">{errors.toAccountId}</p>
          ) : null}
        </div>

        <div>
          <label className="text-sm text-gray-200">Amount ({currency})</label>
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
          <label className="text-sm text-gray-200">Date</label>
          <input
            type="date"
            value={transferDate}
            onChange={(event) => setTransferDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
            required
          />
          {errors.transferDate ? (
            <p className="mt-1 text-xs text-red-400">{errors.transferDate}</p>
          ) : null}
        </div>

        <div>
          <label className="text-sm text-gray-200">Note (optional)</label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={255}
            className="mt-1 min-h-24 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
            placeholder="Add context for this transfer"
          />
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
            disabled={isSubmitting}
          >
            {isSubmitting ? "Recording..." : "Record transfer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
