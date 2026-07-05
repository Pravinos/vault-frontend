"use client";

import { useState } from "react";
import axios from "axios";

import Modal from "@/components/ui/Modal";
import { updateManualBalance } from "@/lib/api";
import { useFormatCurrency } from "@/lib/currencyContext";
import type { Account } from "@/types";

type ManualBalanceModalProps = {
  account: Account;
  onSuccess: (updatedAccount: Account) => void | Promise<void>;
  onClose: () => void;
};

export default function ManualBalanceModal({
  account,
  onSuccess,
  onClose,
}: ManualBalanceModalProps) {
  const formatCurrency = useFormatCurrency();
  const [manualBalance, setManualBalance] = useState<string>(
    account.manualBalance?.toString() ?? ""
  );
  const [alsoSetOpeningBalance, setAlsoSetOpeningBalance] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const getApiErrorMessage = (apiError: unknown): string => {
    if (apiError instanceof Error && apiError.message.trim()) {
      return apiError.message;
    }

    if (!axios.isAxiosError(apiError) || !apiError.response?.data) {
      return "Unable to update manual balance.";
    }

    const data = apiError.response.data;
    if (typeof data === "string" && data.trim()) {
      return data;
    }

    if (typeof data === "object" && data !== null) {
      const message = "message" in data ? data.message : undefined;
      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }

    return "Unable to update manual balance.";
  };

  const hasNoTransactions =
    account.totalIncome === 0 &&
    account.totalExpenses === 0 &&
    account.calculatedBalance === account.openingBalance;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedBalance = Number(manualBalance);
    if (!Number.isFinite(parsedBalance)) {
      setError("Please enter a valid balance.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        manualBalance: parsedBalance,
        ...(hasNoTransactions && alsoSetOpeningBalance
          ? { alsoSetAsOpeningBalance: true }
          : {}),
      };

      const updatedAccount = await updateManualBalance(account.id, payload);
      await onSuccess(updatedAccount);
      onClose();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Update Manual Balance">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-gray-300">{account.name}</p>
          <p className="mt-1 text-xs text-gray-400">
            Current manual balance: {account.manualBalance === null ? "Not set" : formatCurrency(account.manualBalance)}
          </p>
        </div>

        {error ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        ) : null}

        <div>
          <label className="text-sm text-gray-200">New balance</label>
          <input
            type="number"
            step="0.01"
            value={manualBalance}
            onChange={(event) => setManualBalance(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
            required
          />
        </div>

        {hasNoTransactions ? (
          <div className="rounded border border-yellow-500/30 bg-yellow-500/10 p-3">
            <p className="text-sm text-yellow-300">
              This account has no linked transactions yet. Would you also like to set this value as the opening balance?
            </p>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-yellow-200">
              <input
                type="checkbox"
                checked={alsoSetOpeningBalance}
                onChange={(event) => setAlsoSetOpeningBalance(event.target.checked)}
              />
              Yes, set {formatCurrency(Number(manualBalance) || 0)} as my opening balance
            </label>
          </div>
        ) : null}

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
            {isSubmitting ? "Saving..." : "Update"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
