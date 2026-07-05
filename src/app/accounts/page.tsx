"use client";

import Link from "next/link";
import { ArrowLeftRight, Clock, Eye, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import axios from "axios";
import { useMemo, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import AccountForm from "@/components/accounts/AccountForm";
import AccountCard from "@/components/accounts/AccountCard";
import ManualBalanceModal from "@/components/accounts/ManualBalanceModal";
import TransferForm from "@/components/accounts/TransferForm";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { CreditCard, Plus as PlusIcon } from "lucide-react";
import SelectField from "@/components/ui/SelectField";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import {
  getCurrentTimestamp,
} from "@/lib/utils";
import { useFormatCurrency } from "@/lib/currencyContext";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useInvestmentMetricsMap } from "@/lib/hooks/useInvestmentMetricsMap";
import { useAccountTransfers } from "@/lib/hooks/useAccountTransfers";
import { useLatestTransferRecipientAccountId } from "@/lib/hooks/useLatestTransferRecipientAccountId";
import {
  invalidateTransferBalanceQueries,
  useDeleteAccount,
  useRevertTransfer,
} from "@/lib/hooks/useAccountMutations";
import { queryKeys } from "@/lib/queryKeys";
import { isRevertTransfer } from "@/lib/transfers";
import type { Account, Transfer } from "@/types";
import TransferRow from "@/components/transfers/TransferRow";

const staleThresholdMs = 7 * 24 * 60 * 60 * 1000;

type AccountsTab = "accounts" | "transfer";

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
  const formatCurrency = useFormatCurrency();
  const [activeTab, setActiveTab] = useState<AccountsTab>("accounts");

  const [showForm, setShowForm] = useState<boolean>(false);
  const [showTransferForm, setShowTransferForm] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);
  const [manualBalanceAccount, setManualBalanceAccount] = useState<Account | undefined>(undefined);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [deleteTargetAccount, setDeleteTargetAccount] = useState<Account | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState<string>("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [selectedTransferAccountId, setSelectedTransferAccountId] = useState<string | null>(null);
  const [revertTargetTransfer, setRevertTargetTransfer] = useState<Transfer | null>(null);
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);

  const qc = useQueryClient();

  const { data: accounts = [], isLoading: loading, error } = useAccounts();
  const investmentMetricsByAccountId = useInvestmentMetricsMap(accounts);
  const shouldResolveLatestRecipient =
    activeTab === "transfer" && selectedTransferAccountId === null && accounts.length >= 2;
  const { recipientAccountId: latestRecipientAccountId, isLoading: latestRecipientLoading } =
    useLatestTransferRecipientAccountId(accounts, shouldResolveLatestRecipient);
  const { data: transfers = [], isLoading: transfersLoading, error: transfersError } = useAccountTransfers(selectedTransferAccountId);
  const deleteAccountMutation = useDeleteAccount();
  const revertTransferMutation = useRevertTransfer(selectedTransferAccountId);

  useEffect(() => {
    if (!shouldResolveLatestRecipient || latestRecipientLoading || !latestRecipientAccountId) {
      return;
    }

    setSelectedTransferAccountId(latestRecipientAccountId);
  }, [shouldResolveLatestRecipient, latestRecipientLoading, latestRecipientAccountId]);

  useEffect(() => {
    if (
      selectedTransferAccountId &&
      !accounts.some((account) => account.id === selectedTransferAccountId)
    ) {
      setSelectedTransferAccountId(null);
    }
  }, [accounts, selectedTransferAccountId]);

  const resolvingLatestRecipient = shouldResolveLatestRecipient && latestRecipientLoading;

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
    if (deleteAccountMutation.isPending) {
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

    const deletedAccountId = deleteTargetAccount.id;

    try {
      await deleteAccountMutation.mutateAsync(deletedAccountId);
      if (selectedTransferAccountId === deletedAccountId) {
        setSelectedTransferAccountId(null);
      }
      setToast({ message: "Account permanently deleted", type: "success" });
      setDeleteTargetAccount(null);
      setDeleteConfirmInput("");
    } catch (deleteErrorValue) {
      const message = getApiErrorMessage(deleteErrorValue, "Unable to delete account.");
      setDeleteError(message);
      setToast({ message, type: "error" });
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

  // sync status removed — no longer displaying sync indicators on account cards

  const handleRevertTransfer = async () => {
    if (!revertTargetTransfer) {
      return;
    }

    try {
      await revertTransferMutation.mutateAsync(revertTargetTransfer.id);
      setRevertTargetTransfer(null);
      setToast({ message: "Transfer reverted", type: "success" });
    } catch (revertError) {
      const message = getApiErrorMessage(revertError, "Unable to revert transfer.");
      setToast({ message, type: "error" });
    }
  };

  const handleAccountFormSuccess = async (message: string) => {
    setToast({ message, type: "success" });
    setShowForm(false);
    await qc.invalidateQueries({ queryKey: queryKeys.accounts });
    await qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  };

  const handleManualBalanceSuccess = async (_updatedAccount: Account) => {
    setManualBalanceAccount(undefined);
    await invalidateTransferBalanceQueries(qc);
  };

  const handleTransferSuccess = async ({
    toAccountId,
  }: {
    fromAccountId: string;
    toAccountId: string;
  }) => {
    setShowTransferForm(false);
    setActiveTab("transfer");
    setSelectedTransferAccountId(toAccountId);
    await invalidateTransferBalanceQueries(qc);
  };

  const canOpenTransferForm = accounts.length >= 2;
  const openTransferTab = () => {
    setActiveTab("transfer");
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
            <ErrorMessage message={String(error)} onRetry={() => qc.invalidateQueries({ queryKey: queryKeys.accounts })} />
          ) : loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} variant="card" className="h-52 rounded-xl" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No accounts yet"
              description="Add your first account to get started."
              action={{ label: "Create your first account", onClick: openCreate }}
            />
          ) : (
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {accounts.map((account) => {
                const metrics = investmentMetricsByAccountId.get(account.id);
                const displayAccount = metrics ? { ...account, ...metrics } : account;

                return (
                  <AccountCard
                    key={account.id}
                    account={displayAccount}
                    detailsOpen={expandedAccountId === account.id}
                    onDetailsOpenChange={(open) =>
                      setExpandedAccountId(open ? account.id : null)
                    }
                    details={
                      <>
                        <div className="rounded-xl border border-gray-800 bg-[#0f1923] p-3">
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

                        <div className="mt-3 space-y-2">
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
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <Link
                              href={`/accounts/${account.id}`}
                              className="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                              title="Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => openDeleteDialog(account)}
                              className="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    }
                  />
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

              {resolvingLatestRecipient ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} variant="text" className="h-14 rounded-xl" />
                  ))}
                </div>
              ) : !selectedTransferAccountId ? (
                <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center">
                  <p className="text-base font-medium text-gray-200">Choose an account to view transfer history</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Select an account context above to load transfers.
                  </p>
                </div>
              ) : transfersError ? (
                <ErrorMessage
                  message="Unable to load transfer history."
                  onRetry={() => qc.invalidateQueries({ queryKey: queryKeys.accountTransfers(selectedTransferAccountId ?? '') })}
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
                  <div className="space-y-3">
                    {transfers.map((transfer) => {
                      const reversal = isRevertTransfer(transfer);

                      return (
                        <TransferRow
                          key={transfer.id}
                          fromAccount={{ name: transfer.fromAccountName }}
                          toAccount={{ name: transfer.toAccountName }}
                          amount={transfer.amount}
                          date={transfer.transferDate}
                          isReversal={reversal}
                          onRevert={!reversal ? () => setRevertTargetTransfer(transfer) : undefined}
                          note={transfer.note}
                          createdAt={transfer.createdAt}
                        />
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
          onSuccess={handleAccountFormSuccess}
          onClose={() => setShowForm(false)}
        />
      ) : null}

      {showTransferForm ? (
        <TransferForm
          accounts={accounts}
          preselectedAccountId={selectedTransferAccountId}
          onSuccess={handleTransferSuccess}
          onClose={() => setShowTransferForm(false)}
        />
      ) : null}

      {manualBalanceAccount ? (
        <ManualBalanceModal
          account={manualBalanceAccount}
          onSuccess={handleManualBalanceSuccess}
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
              disabled={deleteAccountMutation.isPending}
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
                disabled={deleteAccountMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-base font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:text-sm"
                disabled={
                  deleteAccountMutation.isPending ||
                  deleteConfirmInput.trim() !== deleteTargetAccount.name
                }
              >
                {deleteAccountMutation.isPending ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {revertTargetTransfer ? (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!revertTransferMutation.isPending) {
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
                disabled={revertTransferMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRevertTransfer()}
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-base font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:text-sm"
                disabled={revertTransferMutation.isPending}
              >
                {revertTransferMutation.isPending ? "Reverting..." : "Confirm revert"}
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
