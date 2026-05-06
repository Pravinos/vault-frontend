"use client";

import Link from "next/link";
import { ArrowLeftRight, Clock, Eye, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";

import AccountForm from "@/components/accounts/AccountForm";
import ManualBalanceModal from "@/components/accounts/ManualBalanceModal";
import TransferForm from "@/components/accounts/TransferForm";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Modal from "@/components/ui/Modal";
import SelectField from "@/components/ui/SelectField";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import {
  deleteAccount,
  getAccountTransfers,
  getAccounts,
  revertTransfer,
} from "@/lib/api";
import {
  formatCurrency,
  getCurrentTimestamp,
} from "@/lib/utils";
import type { Account, Transfer } from "@/types";

const staleThresholdMs = 7 * 24 * 60 * 60 * 1000;

type AccountsTab = "accounts" | "transfer";

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

function formatTransferDate(dateValue: string): string {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatCreatedAt(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isRevertTransfer(transfer: Transfer): boolean {
  const transferWithMeta = transfer as Transfer & {
    isRevert?: boolean | null;
    isReversal?: boolean | null;
    originalTransferId?: string | null;
    reversalOfTransferId?: string | null;
    revertedTransferId?: string | null;
    transferType?: string | null;
    type?: string | null;
    kind?: string | null;
  };

  if (transferWithMeta.isRevert || transferWithMeta.isReversal) {
    return true;
  }

  if (
    transferWithMeta.originalTransferId ||
    transferWithMeta.reversalOfTransferId ||
    transferWithMeta.revertedTransferId
  ) {
    return true;
  }

  const marker =
    transferWithMeta.transferType ?? transferWithMeta.type ?? transferWithMeta.kind ?? "";
  if (/revert|reversal/i.test(marker)) {
    return true;
  }

  const note = transfer.note?.trim() ?? "";
  return /^revert(?:ed)?\b|^reversal\b/i.test(note);
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
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

  return fallback;
}

export default function AccountsPage() {
  const [activeTab, setActiveTab] = useState<AccountsTab>("accounts");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState<boolean>(false);
  const [showTransferForm, setShowTransferForm] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);
  const [manualBalanceAccount, setManualBalanceAccount] = useState<Account | undefined>(undefined);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [deleteTargetAccount, setDeleteTargetAccount] = useState<Account | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState<string>("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);

  const [selectedTransferAccountId, setSelectedTransferAccountId] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [transfersLoading, setTransfersLoading] = useState<boolean>(false);
  const [transfersError, setTransfersError] = useState<string | null>(null);
  const [revertTargetTransfer, setRevertTargetTransfer] = useState<Transfer | null>(null);
  const [isRevertingTransfer, setIsRevertingTransfer] = useState<boolean>(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getAccounts();
      setAccounts(data);
      setSelectedTransferAccountId((current) => {
        if (!current) {
          return current;
        }

        const stillExists = data.some((account) => account.id === current);
        return stillExists ? current : null;
      });
    } catch {
      setError("Unable to load accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransfersForAccount = useCallback(async (accountId: string | null) => {
    if (!accountId) {
      setTransfers([]);
      setTransfersError(null);
      return;
    }

    setTransfersLoading(true);
    setTransfersError(null);

    try {
      const data = await getAccountTransfers(accountId);
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setTransfers(sorted);
    } catch {
      setTransfersError("Unable to load transfer history.");
    } finally {
      setTransfersLoading(false);
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
      const message = getApiErrorMessage(deleteErrorValue, "Unable to delete account.");
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

  const handleRevertTransfer = async () => {
    if (!revertTargetTransfer) {
      return;
    }

    setIsRevertingTransfer(true);

    try {
      await revertTransfer(revertTargetTransfer.id);
      setRevertTargetTransfer(null);
      setToast({ message: "Transfer reverted", type: "success" });

      await Promise.all([
        fetchAccounts(),
        selectedTransferAccountId
          ? fetchTransfersForAccount(selectedTransferAccountId)
          : Promise.resolve(),
      ]);
    } catch (revertError) {
      const message = getApiErrorMessage(revertError, "Unable to revert transfer.");
      setToast({ message, type: "error" });
    } finally {
      setIsRevertingTransfer(false);
    }
  };

  const canOpenTransferForm = accounts.length >= 2;
  const openTransferTab = () => {
    setActiveTab("transfer");
    if (selectedTransferAccountId) {
      void fetchTransfersForAccount(selectedTransferAccountId);
    }
  };

  const openTransferFlow = () => {
    openTransferTab();

    if (canOpenTransferForm) {
      setShowTransferForm(true);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-white sm:text-2xl">
          {activeTab === "accounts"
            ? `Accounts${accounts.length > 0 ? ` (${accounts.length})` : ""}`
            : "Transfers"}
        </h1>
        {activeTab === "accounts" ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={openCreate}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-base font-semibold text-white transition-all duration-150 hover:bg-emerald-400 active:scale-95 sm:w-auto sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Account
            </button>
            <button
              type="button"
              onClick={openTransferFlow}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-600 bg-[#111a28] px-4 py-2.5 text-base font-semibold text-gray-100 transition-all duration-150 hover:border-emerald-400 hover:text-emerald-300 active:scale-95 sm:w-auto sm:text-sm"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Transfer
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowTransferForm(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-base font-semibold text-white transition-all duration-150 hover:bg-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:text-sm"
            disabled={!canOpenTransferForm}
          >
            <Plus className="h-4 w-4" />
            Record Transfer
          </button>
        )}
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#111a28] p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("accounts")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "accounts"
                ? "bg-emerald-500/10 text-emerald-400"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            Accounts
          </button>
          <button
            type="button"
            onClick={() => {
              openTransferTab();
            }}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "transfer"
                ? "bg-emerald-500/10 text-emerald-400"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <ArrowLeftRight className="h-4 w-4" />
            Transfer
          </button>
        </div>
      </div>

      {activeTab === "accounts" ? (
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                        {formatCurrency(account.calculatedBalance)}
                      </p>
                    </div>

                    <div className="mt-4 rounded-xl border border-gray-800 bg-[#0f1923] p-3">
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                        Manual balance
                      </p>
                      <p className="mt-1 font-medium tabular-nums text-gray-100">
                        {account.manualBalance === null
                          ? "Not set"
                          : formatCurrency(account.manualBalance)}
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
                          <p className="mt-1 tabular-nums text-gray-100">
                            {formatCurrency(account.currentValue ?? 0)}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium uppercase tracking-wider text-gray-500">Contributed</p>
                          <p className="mt-1 tabular-nums text-gray-100">
                            {formatCurrency(account.contributedAmount ?? 0)}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium uppercase tracking-wider text-gray-500">Return</p>
                          <p className={`mt-1 tabular-nums ${getReturnColor(account.returnAmount)}`}>
                            {formatReturnPercentage(account.returnPercentage)}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 space-y-2">
                      <button
                        type="button"
                        onClick={() => setManualBalanceAccount(account)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 active:bg-white/15"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                        Update Balance
                      </button>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(account)}
                          className="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <Link
                          href={account.accountType === "INVESTMENT" ? `/accounts/${account.id}` : "/expenses"}
                          className="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openDeleteDialog(account)}
                          className="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {accounts.length < 2 ? (
            <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center">
              <p className="text-base font-medium text-gray-200">At least two accounts are required</p>
              <p className="mt-1 text-sm text-gray-500">
                Create another account to start moving money between accounts.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-gray-800 bg-[#1a2332] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="w-full sm:max-w-xs">
                    <SelectField
                      label="Account context"
                      value={selectedTransferAccountId ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        const nextAccountId = value || null;
                        setSelectedTransferAccountId(nextAccountId);

                        if (activeTab === "transfer") {
                          void fetchTransfersForAccount(nextAccountId);
                        }
                      }}
                    >
                      <option value="">Select an account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                  <p className="text-xs text-gray-400">
                    History reflects transfers related to the selected account.
                  </p>
                </div>
              </div>

              {!selectedTransferAccountId ? (
                <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center">
                  <p className="text-base font-medium text-gray-200">Choose an account to view transfer history</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Select an account context above to load transfers.
                  </p>
                </div>
              ) : transfersError ? (
                <ErrorMessage
                  message={transfersError}
                  onRetry={() => void fetchTransfersForAccount(selectedTransferAccountId)}
                />
              ) : transfersLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} variant="text" className="h-14 rounded-xl" />
                  ))}
                </div>
              ) : transfers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center">
                  <p className="text-base font-medium text-gray-200">No transfers yet</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Record a transfer to see activity for this account.
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto rounded-xl border border-gray-800 md:block">
                    <table className="min-w-full divide-y divide-gray-800 text-sm">
                      <thead className="bg-[#111a28] text-left text-xs uppercase tracking-wider text-gray-400">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">From</th>
                          <th className="px-4 py-3">To</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Note</th>
                          <th className="px-4 py-3">Created</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 bg-[#1a2332] text-gray-200">
                        {transfers.map((transfer) => {
                          const canRevert = !isRevertTransfer(transfer);

                          return (
                          <tr key={transfer.id}>
                            <td className="px-4 py-3">{formatTransferDate(transfer.transferDate)}</td>
                            <td className="px-4 py-3">{transfer.fromAccountName}</td>
                            <td className="px-4 py-3">{transfer.toAccountName}</td>
                            <td className="px-4 py-3 font-medium tabular-nums text-white">
                              {formatCurrency(transfer.amount)}
                            </td>
                            <td className="max-w-64 truncate px-4 py-3 text-gray-300">
                              {transfer.note?.trim() ? transfer.note : "-"}
                            </td>
                            <td className="px-4 py-3 text-gray-300">{formatCreatedAt(transfer.createdAt)}</td>
                            <td className="px-4 py-3 text-right">
                              {canRevert ? (
                                <button
                                  type="button"
                                  onClick={() => setRevertTargetTransfer(transfer)}
                                  className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
                                >
                                  Revert
                                </button>
                              ) : null}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 md:hidden">
                    {transfers.map((transfer) => {
                      const canRevert = !isRevertTransfer(transfer);

                      return (
                      <div
                        key={transfer.id}
                        className="rounded-xl border border-gray-800 bg-[#1a2332] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {transfer.fromAccountName} to {transfer.toAccountName}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                              {formatTransferDate(transfer.transferDate)}
                            </p>
                          </div>
                          <p className="text-sm font-semibold tabular-nums text-white">
                            {formatCurrency(transfer.amount)}
                          </p>
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-gray-400">
                          <p>Note: {transfer.note?.trim() ? transfer.note : "-"}</p>
                          <p>Created: {formatCreatedAt(transfer.createdAt)}</p>
                        </div>

                        {canRevert ? (
                          <button
                            type="button"
                            onClick={() => setRevertTargetTransfer(transfer)}
                            className="mt-4 w-full rounded-lg border border-red-500/40 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10"
                          >
                            Revert transfer
                          </button>
                        ) : null}
                      </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {showForm ? (
        <AccountForm
          account={editingAccount}
          onSuccess={(message) => {
            setShowForm(false);
            setToast({ message, type: "success" });
            void fetchAccounts();
          }}
          onClose={() => setShowForm(false)}
        />
      ) : null}

      {showTransferForm ? (
        <TransferForm
          accounts={accounts}
          preselectedAccountId={selectedTransferAccountId}
          onSuccess={async () => {
            setToast({ message: "Transfer recorded", type: "success" });
            await Promise.all([
              fetchAccounts(),
              activeTab === "transfer" && selectedTransferAccountId
                ? fetchTransfersForAccount(selectedTransferAccountId)
                : Promise.resolve(),
            ]);
          }}
          onClose={() => setShowTransferForm(false)}
        />
      ) : null}

      {manualBalanceAccount ? (
        <ManualBalanceModal
          account={manualBalanceAccount}
          onSuccess={(updatedAccount) => {
            setManualBalanceAccount(undefined);
            setAccounts((prev) =>
              prev.map((acc) =>
                acc.id === updatedAccount.id ? updatedAccount : acc
              )
            );
          }}
          onClose={() => setManualBalanceAccount(undefined)}
        />
      ) : null}

      {deleteTargetAccount ? (
        <Modal isOpen={true} onClose={closeDeleteDialog} title="Permanently delete account">
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              This action permanently deletes
              <span className="font-semibold text-white"> {deleteTargetAccount.name}</span>.
              This cannot be undone.
            </p>
            <p className="text-xs text-gray-400">
              To confirm, type the account name exactly:
              <span className="font-semibold text-gray-200"> {deleteTargetAccount.name}</span>
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

      {revertTargetTransfer ? (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!isRevertingTransfer) {
              setRevertTargetTransfer(null);
            }
          }}
          title="Revert transfer"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Revert transfer of
              <span className="font-semibold text-white"> {formatCurrency(revertTargetTransfer.amount)}</span>
              from
              <span className="font-semibold text-white"> {revertTargetTransfer.fromAccountName}</span>
              to
              <span className="font-semibold text-white"> {revertTargetTransfer.toAccountName}</span>
              ?
            </p>
            <p className="text-xs text-gray-500">
              A new opposite transfer will be recorded to keep your history auditable.
            </p>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRevertTargetTransfer(null)}
                className="w-full rounded-lg border border-gray-700 px-4 py-2 text-base text-gray-200 hover:border-gray-500 sm:w-auto sm:text-sm"
                disabled={isRevertingTransfer}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRevertTransfer()}
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-base font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:text-sm"
                disabled={isRevertingTransfer}
              >
                {isRevertingTransfer ? "Reverting..." : "Confirm revert"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {toast ? (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      ) : null}
    </div>
  );
}
