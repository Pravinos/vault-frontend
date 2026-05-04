"use client";

import Link from "next/link";
import { Clock, MoreHorizontal, Plus } from "lucide-react";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";

import AccountForm from "@/components/accounts/AccountForm";
import ManualBalanceModal from "@/components/accounts/ManualBalanceModal";
import Modal from "@/components/ui/Modal";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import { deleteAccount, getAccounts } from "@/lib/api";
import { formatCurrency, getCurrentTimestamp, getEffectiveAccountBalance } from "@/lib/utils";
import type { Account } from "@/types";

const staleThresholdMs = 7 * 24 * 60 * 60 * 1000;

function getAccountColor(type: string): string {
  switch (type) {
    case "CHECKING":
      return "#10b981";
    case "SAVINGS":
      return "#3b82f6";
    case "INVESTMENT":
      return "#8b5cf6";
    default:
      return "#10b981";
  }
}

function getAccountBadgeClass(type: string): string {
  switch (type) {
    case "CHECKING":
      return "bg-emerald-500/10 text-emerald-400";
    case "SAVINGS":
      return "bg-blue-500/10 text-blue-400";
    case "INVESTMENT":
      return "bg-violet-500/10 text-violet-400";
    default:
      return "bg-emerald-500/10 text-emerald-400";
  }
}

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
  const [mobileMenuAccountId, setMobileMenuAccountId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteTargetAccount, setDeleteTargetAccount] = useState<Account | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState<string>("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);

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

  const getDeleteErrorMessage = (deleteErrorValue: unknown): string => {
    if (!axios.isAxiosError(deleteErrorValue)) {
      return "Unable to delete account.";
    }

    const status = deleteErrorValue.response?.status;
    const data = deleteErrorValue.response?.data;

    if (status === 400) {
      if (typeof data === "string" && data.trim()) {
        return data;
      }

      if (typeof data === "object" && data !== null) {
        const message = "message" in data ? data.message : undefined;
        if (typeof message === "string" && message.trim()) {
          return message;
        }
      }
    }

    if (deleteErrorValue instanceof Error && deleteErrorValue.message.trim()) {
      return deleteErrorValue.message;
    }

    return "Unable to delete account.";
  };

  const openDeleteDialog = (account: Account) => {
    setDeleteTargetAccount(account);
    setDeleteConfirmInput("");
    setDeleteError(null);
  };

  const closeDeleteDialog = () => {
    if (isDeletingAccount) {
      return;
    }

    setDeleteTargetAccount(null);
    setDeleteConfirmInput("");
    setDeleteError(null);
  };

  const handleDeleteAccount = async () => {
    if (!deleteTargetAccount) {
      return;
    }

    setDeleteError(null);
    setIsDeletingAccount(true);

    try {
      await deleteAccount(deleteTargetAccount.id);
      setAccounts((current) => current.filter((account) => account.id !== deleteTargetAccount.id));
      setToast({ message: "Account permanently deleted", type: "success" });
      setDeleteTargetAccount(null);
      setDeleteConfirmInput("");
    } catch (deleteErrorValue) {
      const message = getDeleteErrorMessage(deleteErrorValue);
      setDeleteError(message);
      setToast({ message, type: "error" });
    } finally {
      setIsDeletingAccount(false);
    }
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-white sm:text-2xl">
          Accounts{accounts.length > 0 ? ` (${accounts.length})` : ""}
        </h1>
        <button
          type="button"
          onClick={openCreate}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-base font-semibold text-white transition-all duration-150 hover:bg-emerald-400 active:scale-95 sm:w-auto sm:text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Account
        </button>
      </div>

      <div className="space-y-6">
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
                  className="rounded-2xl border border-gray-800 border-l-4 bg-[#1a2332] p-5 text-sm text-gray-200 transition-colors"
                  style={{
                    borderLeftColor: getAccountColor(account.accountType),
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{account.name}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getAccountBadgeClass(account.accountType)}`}
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
                      {formatCurrency(getEffectiveAccountBalance(account))}
                    </p>
                  </div>

                  <div className="mt-4 rounded-xl border border-gray-800 bg-[#0f1923] p-3">
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
                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-gray-800 bg-[#0f1923] p-3 text-xs">
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

                  <div className="mt-5 sm:hidden">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setManualBalanceAccount(account)}
                        className="flex-1 rounded-lg bg-emerald-600/20 px-3 py-2 text-sm font-medium text-emerald-400 transition-all duration-150 hover:bg-emerald-600/30 active:scale-95"
                      >
                        Update Balance
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setMobileMenuAccountId((prev) =>
                              prev === account.id ? null : account.id
                            )
                          }
                          className="cursor-pointer rounded-lg bg-white/5 p-2 text-gray-300 transition hover:bg-white/10 hover:text-white"
                          aria-label="Open account actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {mobileMenuAccountId === account.id ? (
                          <div className="absolute right-0 z-10 mt-2 min-w-40 rounded-lg border border-gray-700 bg-gray-900 p-1 shadow-lg">
                            <button
                              type="button"
                              onClick={() => {
                                openEdit(account);
                                setMobileMenuAccountId(null);
                              }}
                              className="block w-full rounded-md px-3 py-2 text-left text-xs text-gray-200 hover:bg-gray-800"
                            >
                              Edit
                            </button>
                            <Link
                              href={account.accountType === "INVESTMENT" ? `/accounts/${account.id}` : "/expenses"}
                              className="block rounded-md px-3 py-2 text-left text-xs text-gray-200 hover:bg-gray-800"
                              onClick={() => setMobileMenuAccountId(null)}
                            >
                              View details
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                openDeleteDialog(account);
                                setMobileMenuAccountId(null);
                              }}
                              className="block w-full rounded-md px-3 py-2 text-left text-xs text-red-400 hover:bg-gray-800"
                            >
                              Delete permanently
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 hidden gap-2 sm:flex sm:flex-row">
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
                      className="flex flex-1 items-center justify-center rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-center text-xs font-medium text-gray-200 transition-all duration-150 hover:bg-gray-700"
                    >
                      View details
                    </Link>
                    <button
                      type="button"
                      onClick={() => openDeleteDialog(account)}
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-xs font-medium text-gray-400 transition-all duration-150 hover:bg-red-900/20 hover:text-red-300 active:scale-95"
                    >
                      Delete permanently
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

      {deleteTargetAccount ? (
        <Modal
          isOpen={true}
          onClose={closeDeleteDialog}
          title="Permanently delete account"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              This action permanently deletes <span className="font-semibold text-white">{deleteTargetAccount.name}</span>.
              This cannot be undone.
            </p>
            <p className="text-xs text-gray-400">
              To confirm, type the account name exactly: <span className="font-semibold text-gray-200">{deleteTargetAccount.name}</span>
            </p>
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(event) => setDeleteConfirmInput(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
              placeholder={deleteTargetAccount.name}
              autoFocus
              disabled={isDeletingAccount}
            />

            {deleteError ? (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {deleteError}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteDialog}
                className="w-full rounded-lg border border-gray-700 px-4 py-2 text-base text-gray-200 hover:border-gray-500 sm:w-auto sm:text-sm"
                disabled={isDeletingAccount}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-base font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:text-sm"
                disabled={
                  isDeletingAccount ||
                  deleteConfirmInput.trim() !== deleteTargetAccount.name
                }
              >
                {isDeletingAccount ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </Modal>
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
