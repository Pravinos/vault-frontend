"use client";

import Link from "next/link";
import { Clock, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import AccountForm from "@/components/accounts/AccountForm";
import ManualBalanceModal from "@/components/accounts/ManualBalanceModal";
import TopBar from "@/components/layout/TopBar";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import { deactivateAccount, getAccounts } from "@/lib/api";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import { formatCurrency, getCurrentTimestamp } from "@/lib/utils";
import type { Account } from "@/types";

const staleThresholdMs = 7 * 24 * 60 * 60 * 1000;

const typeBadgeClasses: Record<Account["accountType"], string> = {
  CHECKING: "bg-emerald-900/60 text-emerald-300",
  SAVINGS: "bg-blue-900/60 text-blue-300",
  INVESTMENT: "bg-purple-900/60 text-purple-300",
};

const typeTopBorderClasses: Record<Account["accountType"], string> = {
  CHECKING: "border-t-emerald-500",
  SAVINGS: "border-t-blue-500",
  INVESTMENT: "border-t-purple-500",
};

function formatManualTimestamp(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function getReturnColor(value: number | null): string {
  if (value === null || value === 0) {
    return "text-gray-300";
  }
  return value > 0 ? "text-green-400" : "text-red-400";
}

function formatReturnPercentage(value: number | null): string {
  if (value === null || value === 0) {
    return "0.00%";
  }

  const fixed = value.toFixed(2);
  return value > 0 ? `+${fixed}%` : `${fixed}%`;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);
  const [manualBalanceAccount, setManualBalanceAccount] = useState<Account | undefined>(undefined);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const { handleDelete: confirmDelete, isPendingConfirm } = useConfirmDelete();

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (fetchError) {
      setError("Unable to load accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchAccounts();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchAccounts]);

  const staleAccounts = useMemo(() => {
    const staleBefore = getCurrentTimestamp() - staleThresholdMs;
    return accounts.filter((account) => {
      const referenceDate =
        account.manualBalance === null
          ? account.createdAt
          : account.manualBalanceUpdatedAt ?? account.createdAt;
      const referenceTimestamp = new Date(referenceDate).getTime();

      if (!Number.isFinite(referenceTimestamp)) {
        return false;
      }

      return referenceTimestamp < staleBefore;
    });
  }, [accounts]);

  const handleDeleteAccount = (account: Account) => {
    confirmDelete(account.id, async () => {
      try {
        await deactivateAccount(account.id);
        setToast({ message: "Account deleted", type: "success" });
        await fetchAccounts();
      } catch (deleteError) {
        setToast({ message: "Unable to delete account", type: "error" });
      }
    });
  };

  const openCreate = () => {
    setEditingAccount(undefined);
    setShowForm(true);
  };

  const openEdit = (account: Account) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const syncStatus = (account: Account): "synced" | "unsynced" | null => {
    if (account.accountType === "INVESTMENT") return null;
    if (account.manualBalance === null) return null;
    const diff = Math.abs(account.calculatedBalance - account.manualBalance);
    const threshold = Math.abs(account.calculatedBalance) * 0.01;
    return diff <= threshold ? "synced" : "unsynced";
  };

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title={`Accounts${accounts.length > 0 ? ` (${accounts.length})` : ""}`}
        action={
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-emerald-400 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Account
          </button>
        }
      />

      <div className="flex-1 space-y-6 px-4 py-6 sm:px-6">
        {staleAccounts.length > 0 ? (
          <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4">
            <p className="text-sm font-medium text-amber-200">Weekly update reminder</p>
            <p className="mt-1 text-xs text-amber-100/90">
              These accounts have not had a manual balance update in the last 7 days.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {staleAccounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => setManualBalanceAccount(account)}
                  className="rounded-full border border-amber-300/60 px-3 py-1 text-xs text-amber-100 hover:bg-amber-500/20"
                >
                  Update {account.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <ErrorMessage message={error} onRetry={fetchAccounts} />
        ) : loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} variant="card" className="h-52 rounded-xl" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 py-20">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <Plus className="h-8 w-8 text-gray-500" />
            </div>
            <p className="text-base font-medium text-gray-300">No accounts yet</p>
            <p className="mt-1 text-sm text-gray-500">Add your first account to get started</p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-6 flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-emerald-400 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Create your first account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {accounts.map((account) => {
              const sync = syncStatus(account);
              return (
                <div
                  key={account.id}
                  className={`rounded-xl border-t-4 border border-gray-800 bg-gray-900/60 p-5 text-sm text-gray-200 ${typeTopBorderClasses[account.accountType]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{account.name}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClasses[account.accountType]}`}
                        >
                          {account.accountType}
                        </span>
                        {sync === "synced" ? (
                          <span className="inline-flex rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs text-emerald-400">
                            Synced
                          </span>
                        ) : sync === "unsynced" ? (
                          <span className="inline-flex rounded-full bg-amber-900/40 px-2 py-0.5 text-xs text-amber-400">
                            Out of sync
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                      Calculated balance
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                      {formatCurrency(account.calculatedBalance)}
                    </p>
                  </div>

                  <div className="mt-4 rounded-lg border border-gray-800 bg-gray-950/60 p-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                      Manual balance
                    </p>
                    <p className="mt-1 font-medium tabular-nums text-gray-100">
                      {account.manualBalance === null ? "Not set" : formatCurrency(account.manualBalance)}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      Last updated: {formatManualTimestamp(account.manualBalanceUpdatedAt)}
                    </p>
                  </div>

                  {account.accountType === "INVESTMENT" ? (
                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-gray-800 bg-gray-950/60 p-3 text-xs">
                      <div>
                        <p className="font-medium uppercase tracking-wider text-gray-500">Value</p>
                        <p className="mt-1 tabular-nums text-gray-100">{formatCurrency(account.currentValue ?? 0)}</p>
                      </div>
                      <div>
                        <p className="font-medium uppercase tracking-wider text-gray-500">Contributed</p>
                        <p className="mt-1 tabular-nums text-gray-100">{formatCurrency(account.contributedAmount ?? 0)}</p>
                      </div>
                      <div>
                        <p className="font-medium uppercase tracking-wider text-gray-500">Return</p>
                        <p className={`mt-1 tabular-nums ${getReturnColor(account.returnAmount)}`}>
                          {formatReturnPercentage(account.returnPercentage)}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setManualBalanceAccount(account)}
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-xs font-medium text-gray-200 transition-all duration-150 hover:bg-gray-700 active:scale-95"
                    >
                      Update Balance
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(account)}
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-xs font-medium text-gray-200 transition-all duration-150 hover:bg-gray-700 active:scale-95"
                    >
                      Edit
                    </button>
                    <Link
                      href={account.accountType === "INVESTMENT" ? `/accounts/${account.id}` : "/expenses"}
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-center text-xs font-medium text-gray-200 transition-all duration-150 hover:bg-gray-700"
                    >
                      View details
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(account)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-150 active:scale-95 ${
                        isPendingConfirm(account.id)
                          ? "border-red-500 bg-red-900/40 text-red-300"
                          : "border-gray-700 bg-gray-800/60 text-gray-400 hover:bg-red-900/20 hover:text-red-300"
                      }`}
                    >
                      {isPendingConfirm(account.id) ? "Confirm?" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm ? (
        <AccountForm
          account={editingAccount}
          onSuccess={() => {
            setShowForm(false);
            void fetchAccounts();
          }}
          onClose={() => setShowForm(false)}
        />
      ) : null}

      {manualBalanceAccount ? (
        <ManualBalanceModal
          account={manualBalanceAccount}
          onSuccess={() => {
            setManualBalanceAccount(undefined);
            void fetchAccounts();
          }}
          onClose={() => setManualBalanceAccount(undefined)}
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
