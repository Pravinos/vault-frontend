"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock, LineChart as LineChartIcon, Pencil, Plus, RefreshCw, Target } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import AccountForm from "@/components/accounts/AccountForm";
import AddCheckpointModal from "@/components/accounts/AddCheckpointModal";
import ManualBalanceModal from "@/components/accounts/ManualBalanceModal";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Modal from "@/components/ui/Modal";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import { getAccountBadgeClasses } from "@/lib/accountColors";
import { formatDate } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/currencyContext";
import { deriveInvestmentMetrics } from "@/lib/investmentMetrics";
import { useAccount } from "@/lib/hooks/useAccount";
import { useAccountTransfers } from "@/lib/hooks/useAccountTransfers";
import { useCheckpoints } from "@/lib/hooks/useCheckpoints";
import { useGoals } from "@/lib/hooks/useGoals";
import {
  invalidateTransferBalanceQueries,
  useRevertTransfer,
} from "@/lib/hooks/useAccountMutations";
import { queryKeys } from "@/lib/queryKeys";
import { isRevertTransfer, computeTransferSummary, type TransferSummary } from "@/lib/transfers";
import type { Goal, Transfer } from "@/types";
import TransferRow from "@/components/transfers/TransferRow";

const CHECKPOINTS_PREVIEW_COUNT = 5;

function formatReturnPercentage(value: number | null): string {
  if (value === null || value === 0) {
    return "0.00%";
  }

  const fixed = value.toFixed(2);
  return value > 0 ? `+${fixed}%` : `${fixed}%`;
}

function getReturnColor(value: number | null): string {
  if (value === null || value === 0) {
    return "text-gray-300";
  }
  return value > 0 ? "text-green-400" : "text-red-400";
}

function formatYAxisTick(value: number) {
  const abs = Math.abs(Number(value) || 0);
  if (abs < 1000) return `${Math.round(Number(value))}`;
  if (abs < 1_000_000) return `${(Number(value) / 1000).toFixed(0)}k`;
  return `${(Number(value) / 1_000_000).toFixed(1)}M`;
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

function StatTile({
  label,
  value,
  valueClassName,
  hint,
}: {
  label: ReactNode;
  value: ReactNode;
  valueClassName?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg bg-surface-sunken p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-1 text-sm tabular-nums ${valueClassName ?? "text-white"}`}>
        {typeof value === "string" ? (
          <span className="font-semibold">{value}</span>
        ) : (
          value
        )}
      </p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

function LinkedGoalsSection({ goals }: { goals: Goal[] }) {
  const formatCurrency = useFormatCurrency();

  if (goals.length === 0) {
    return null;
  }

  return (
    <div className="rounded-card border border-border bg-surface-raised p-6">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-emerald-400" />
        <h3 className="text-base font-semibold text-white">Linked goals</h3>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Savings goals that include this account in their progress.
      </p>
      <div className="mt-4 space-y-2">
        {goals.map((goal) => (
          <Link
            key={goal.id}
            href="/goals"
            className="flex items-center justify-between rounded-lg border border-border bg-surface-sunken p-3 transition-colors hover:border-gray-600"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{goal.name}</p>
              <p className="text-xs text-gray-400">
                {goal.progressPercentage.toFixed(0)}% of {formatCurrency(goal.targetAmount)}
              </p>
            </div>
            <span className="ml-3 shrink-0 text-xs text-emerald-400">View</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TransferSummaryStrip({
  summary,
  formatCurrency,
}: {
  summary: TransferSummary;
  formatCurrency: (amount: number) => string;
}) {
  if (summary.count === 0) {
    return null;
  }

  return (
    <p className="text-xs text-gray-400">
      {summary.count} transfer{summary.count === 1 ? "" : "s"} · In {formatCurrency(summary.totalIn)}{" "}
      · Out {formatCurrency(summary.totalOut)} · Net{" "}
      <span className={summary.net >= 0 ? "text-emerald-400" : "text-red-400"}>
        {formatCurrency(summary.net)}
      </span>
    </p>
  );
}

function AccountTransfersSection({
  accountId,
  transfers,
  transfersLoading,
  transfersError,
  onRetry,
}: {
  accountId: string;
  transfers: Transfer[];
  transfersLoading: boolean;
  transfersError: Error | null;
  onRetry: () => void;
}) {
  const [revertTargetTransfer, setRevertTargetTransfer] = useState<Transfer | null>(null);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const revertTransferMutation = useRevertTransfer(accountId);

  const handleRevertTransfer = async () => {
    if (!revertTargetTransfer) {
      return;
    }

    try {
      await revertTransferMutation.mutateAsync(revertTargetTransfer.id);
      setRevertDialogOpen(false);
      setToast({ message: "Transfer reverted", type: "success" });
    } catch {
      setToast({ message: "Unable to revert transfer.", type: "error" });
    }
  };

  return (
    <>
      <div className="rounded-card border border-border bg-surface-raised p-6">
        <h3 className="text-base font-semibold text-white">Transfers</h3>
        {transfersLoading ? (
          <div className="mt-4">
            <Skeleton variant="card" className="h-24 rounded-xl" />
          </div>
        ) : transfersError ? (
          <div className="mt-4">
            <ErrorMessage message="Unable to load transfer history." onRetry={onRetry} />
          </div>
        ) : transfers.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">No transfers yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {transfers.map((t) => {
              const reversal = isRevertTransfer(t);

              return (
                <TransferRow
                  key={t.id}
                  fromAccount={{ name: t.fromAccountName }}
                  toAccount={{ name: t.toAccountName }}
                  amount={t.amount}
                  date={t.transferDate ?? t.createdAt}
                  isReversal={reversal}
                  onRevert={
                    !reversal
                      ? () => {
                          setRevertTargetTransfer(t);
                          setRevertDialogOpen(true);
                        }
                      : undefined
                  }
                  note={t.note}
                  createdAt={t.createdAt}
                />
              );
            })}
          </div>
        )}
      </div>

      {revertTargetTransfer ? (
        <Modal
          isOpen={revertDialogOpen}
          onClose={() => {
            if (!revertTransferMutation.isPending) {
              setRevertDialogOpen(false);
            }
          }}
          onClosed={() => setRevertTargetTransfer(null)}
          title="Revert transfer"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Revert this transfer? A new opposite transfer will be recorded to keep your history
              auditable.
            </p>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRevertDialogOpen(false)}
                className="btn-interactive w-full rounded-lg border border-gray-700 px-4 py-2 text-base text-gray-200 hover:border-gray-500 sm:w-auto sm:text-sm"
                disabled={revertTransferMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRevertTransfer()}
                className="btn-interactive w-full rounded-lg bg-red-600 px-4 py-2 text-base font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:text-sm"
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
    </>
  );
}

export default function AccountDetailPage() {
  const formatCurrency = useFormatCurrency();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const accountId = params.id;

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [showEditForm, setShowEditForm] = useState<boolean>(false);
  const [showCheckpointModal, setShowCheckpointModal] = useState<boolean>(false);
  const [showAllCheckpoints, setShowAllCheckpoints] = useState<boolean>(false);

  const qc = useQueryClient();

  const { data: account = null, isLoading: loading, error } = useAccount(accountId);
  const isInvestment = account?.accountType === "INVESTMENT";

  const { data: checkpoints = [], isLoading: checkpointsLoading } = useCheckpoints(
    accountId,
    isInvestment
  );
  const {
    data: transfers = [],
    isLoading: transfersLoading,
    error: transfersError,
  } = useAccountTransfers(accountId, account != null);
  const { data: goals = [] } = useGoals();

  const chartCheckpoints = useMemo(() => {
    return [...checkpoints].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );
  }, [checkpoints]);

  const sortedCheckpoints = useMemo(() => {
    return [...checkpoints].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
  }, [checkpoints]);

  const visibleCheckpoints = useMemo(
    () =>
      showAllCheckpoints
        ? sortedCheckpoints
        : sortedCheckpoints.slice(0, CHECKPOINTS_PREVIEW_COUNT),
    [sortedCheckpoints, showAllCheckpoints]
  );

  const hasMoreCheckpoints = sortedCheckpoints.length > CHECKPOINTS_PREVIEW_COUNT;

  const investmentMetrics = useMemo(() => {
    if (!account || account.accountType !== "INVESTMENT") {
      return null;
    }
    return deriveInvestmentMetrics(account, checkpoints);
  }, [account, checkpoints]);

  const contributedBaseline =
    account?.contributedAmount ?? investmentMetrics?.contributedAmount ?? null;

  const chartData = useMemo(
    () =>
      chartCheckpoints.map((checkpoint) => ({
        date: formatDate(checkpoint.recordedAt),
        value: checkpoint.value,
      })),
    [chartCheckpoints]
  );

  const investmentMetadata = useMemo(() => {
    if (!account || account.accountType !== "INVESTMENT") {
      return [];
    }

    const items: { label: string; value: string }[] = [];
    if (account.platform?.trim()) {
      items.push({ label: "Platform", value: account.platform });
    }
    if (account.instrument?.trim()) {
      items.push({ label: "Instrument", value: account.instrument });
    }
    if (account.assetType?.trim()) {
      items.push({ label: "Asset type", value: account.assetType });
    }
    return items;
  }, [account]);

  const linkedGoals = useMemo(() => {
    return goals.filter(
      (goal) =>
        goal.isActive && goal.linkedAccounts.some((linked) => linked.id === accountId)
    );
  }, [goals, accountId]);

  const transferSummary = useMemo(() => {
    if (!account) {
      return null;
    }
    return computeTransferSummary(transfers, account.name);
  }, [account, transfers]);

  const balanceDrift = useMemo(() => {
    if (!account || account.manualBalance === null) {
      return null;
    }
    return account.manualBalance - account.calculatedBalance;
  }, [account]);

  const checkpointInsight = useMemo(() => {
    if (chartCheckpoints.length === 0) {
      return null;
    }

    const first = chartCheckpoints[0];
    const latest = chartCheckpoints[chartCheckpoints.length - 1];
    const change = latest.value - first.value;
    const changePct = first.value !== 0 ? (change / first.value) * 100 : null;

    return {
      count: chartCheckpoints.length,
      latestDate: latest.recordedAt,
      change,
      changePct,
    };
  }, [chartCheckpoints]);

  const pageSubtitle = useMemo(() => {
    const kind = isInvestment ? "Investment details" : "Account details";
    if (!account?.createdAt) {
      return kind;
    }
    return `${kind} · Opened ${formatManualTimestamp(account.createdAt)}`;
  }, [account?.createdAt, isInvestment]);

  const handleAccountFormSuccess = async (message: string) => {
    setToast({ message, type: "success" });
    setShowEditForm(false);
    await qc.invalidateQueries({ queryKey: queryKeys.account(accountId) });
    await qc.invalidateQueries({ queryKey: queryKeys.accounts });
    await qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  };

  const handleManualBalanceSuccess = async () => {
    setShowManualModal(false);
    setToast({ message: "Balance updated", type: "success" });
    await invalidateTransferBalanceQueries(qc);
  };

  const handleCheckpointSuccess = () => {
    setToast({ message: "Checkpoint added", type: "success" });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {loading ? (
            <>
              <Skeleton variant="text" className="h-7 w-48" />
              <Skeleton variant="text" className="mt-1 h-4 w-32" />
            </>
          ) : account ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-white sm:text-2xl">{account.name}</h1>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getAccountBadgeClasses(account.accountType)}`}
                >
                  {account.accountType}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{pageSubtitle}</p>
            </>
          ) : (
            <h1 className="text-xl font-bold text-white sm:text-2xl">Account Details</h1>
          )}
        </div>
        <Link
          href="/accounts"
          className="btn-interactive inline-flex w-full items-center justify-center rounded-lg border border-border bg-surface-raised px-3 py-2 text-base text-gray-200 hover:border-gray-500 sm:w-auto sm:text-sm"
        >
          Back to Accounts
        </Link>
      </div>

      <div className="space-y-6">
        {error ? (
          <ErrorMessage
            message="Unable to load account details."
            onRetry={() => qc.invalidateQueries({ queryKey: queryKeys.account(accountId) })}
          />
        ) : loading ? (
          <div className="space-y-4">
            <Skeleton variant="card" className="h-40 rounded-xl" />
            <Skeleton variant="chart" className="h-72 rounded-xl" />
          </div>
        ) : !account ? (
          <EmptyState
            icon={LineChartIcon}
            title="Account not found"
            description="This account may have been deleted or the link is invalid."
            action={{ label: "Back to accounts", onClick: () => router.push("/accounts") }}
          />
        ) : account.accountType !== "INVESTMENT" ? (
          <>
            <div className="rounded-card border border-border bg-surface-raised p-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <StatTile label="Balance" value={formatCurrency(account.calculatedBalance)} />
                <StatTile
                  label="Opening Balance"
                  value={formatCurrency(account.openingBalance ?? 0)}
                />
                <StatTile
                  label="Since Opening"
                  value={formatCurrency(
                    (account.calculatedBalance ?? 0) - (account.openingBalance ?? 0)
                  )}
                />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <StatTile
                  label="Total Income"
                  value={formatCurrency(account.totalIncome)}
                  valueClassName="text-emerald-400"
                />
                <StatTile
                  label="Total Expenses"
                  value={formatCurrency(account.totalExpenses)}
                  valueClassName="text-red-400"
                />
                <StatTile
                  label="Net Activity"
                  value={formatCurrency(account.totalIncome - account.totalExpenses)}
                  valueClassName={
                    account.totalIncome - account.totalExpenses >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                  hint="Income minus expenses on this account"
                />
              </div>

              <div className="mt-4 rounded-lg bg-surface-sunken p-3">
                <p className="text-xs text-gray-400">Manual balance</p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-white">
                  {account.manualBalance === null
                    ? "Not set"
                    : formatCurrency(account.manualBalance)}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  Last updated: {formatManualTimestamp(account.manualBalanceUpdatedAt)}
                </p>
              </div>

              {balanceDrift !== null ? (
                <div className="mt-3 rounded-lg border border-border bg-surface-sunken p-3">
                  <p className="text-xs text-gray-400">Balance drift</p>
                  <p
                    className={`mt-1 text-sm font-semibold tabular-nums ${
                      balanceDrift === 0
                        ? "text-gray-300"
                        : balanceDrift > 0
                          ? "text-amber-300"
                          : "text-amber-300"
                    }`}
                  >
                    {balanceDrift === 0
                      ? "In sync with calculated balance"
                      : `${balanceDrift > 0 ? "+" : ""}${formatCurrency(balanceDrift)} vs calculated`}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Manual snapshot compared to opening balance + activity + transfers.
                  </p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(true)}
                  className="btn-interactive inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
                >
                  <RefreshCw className="h-4 w-4" />
                  Update Manual Balance
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditForm(true)}
                  className="btn-interactive inline-flex items-center gap-2 rounded-lg border border-border bg-surface-sunken px-4 py-2 text-sm font-medium text-gray-200 hover:border-gray-500"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Account
                </button>
              </div>
            </div>

            <LinkedGoalsSection goals={linkedGoals} />

            {transferSummary ? (
              <TransferSummaryStrip summary={transferSummary} formatCurrency={formatCurrency} />
            ) : null}

            <AccountTransfersSection
              accountId={accountId}
              transfers={transfers}
              transfersLoading={transfersLoading}
              transfersError={transfersError}
              onRetry={() =>
                qc.invalidateQueries({ queryKey: queryKeys.accountTransfers(accountId) })
              }
            />

            {showManualModal ? (
              <ManualBalanceModal
                account={account}
                onSuccess={handleManualBalanceSuccess}
                onClose={() => setShowManualModal(false)}
              />
            ) : null}

            {showEditForm ? (
              <AccountForm
                account={account}
                onSuccess={handleAccountFormSuccess}
                onClose={() => setShowEditForm(false)}
              />
            ) : null}
          </>
        ) : checkpointsLoading ? (
          <div className="space-y-4">
            <Skeleton variant="card" className="h-40 rounded-xl" />
            <Skeleton variant="card" className="h-32 rounded-xl" />
            <Skeleton variant="chart" className="h-72 rounded-xl" />
          </div>
        ) : (
          <>
            <div className="rounded-card border border-border bg-surface-raised p-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <StatTile
                  label="Contributed"
                  value={formatCurrency(contributedBaseline ?? 0)}
                />
                <StatTile
                  label="Current Value"
                  value={formatCurrency(investmentMetrics?.currentValue ?? 0)}
                />
                <StatTile
                  label="Return"
                  value={formatCurrency(investmentMetrics?.returnAmount ?? 0)}
                  valueClassName={getReturnColor(investmentMetrics?.returnAmount ?? null)}
                />
                <StatTile
                  label="Return %"
                  value={formatReturnPercentage(investmentMetrics?.returnPercentage ?? null)}
                  valueClassName={getReturnColor(investmentMetrics?.returnPercentage ?? null)}
                />
              </div>

              {(account.totalIncome > 0 || account.totalExpenses > 0) ? (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <StatTile
                    label="Income to Account"
                    value={formatCurrency(account.totalIncome)}
                    valueClassName="text-emerald-400"
                    hint="Contributes to contributed amount"
                  />
                  <StatTile
                    label="Expenses from Account"
                    value={formatCurrency(account.totalExpenses)}
                    valueClassName="text-red-400"
                    hint="Reduces contributed amount"
                  />
                  <StatTile
                    label="Net Contributions"
                    value={formatCurrency(account.totalIncome - account.totalExpenses)}
                    valueClassName={
                      account.totalIncome - account.totalExpenses >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }
                  />
                </div>
              ) : null}

              {checkpointInsight ? (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <StatTile
                    label={
                      checkpointInsight.latestDate ? (
                        <>
                          Checkpoints{" "}
                          <span className="text-gray-500">
                            (Latest: {formatManualTimestamp(checkpointInsight.latestDate)})
                          </span>
                        </>
                      ) : (
                        "Checkpoints"
                      )
                    }
                    value={<span className="font-bold">{checkpointInsight.count}</span>}
                  />
                  {checkpointInsight.count >= 2 ? (
                    <>
                      <StatTile
                        label="Since First Checkpoint"
                        value={`${checkpointInsight.change >= 0 ? "+" : ""}${formatCurrency(checkpointInsight.change)}`}
                        valueClassName={
                          checkpointInsight.change >= 0 ? "text-emerald-400" : "text-red-400"
                        }
                      />
                      <StatTile
                        label="Checkpoint Change %"
                        value={
                          checkpointInsight.changePct !== null
                            ? formatReturnPercentage(checkpointInsight.changePct)
                            : "—"
                        }
                        valueClassName={getReturnColor(checkpointInsight.changePct)}
                      />
                    </>
                  ) : null}
                </div>
              ) : null}

              {investmentMetadata.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {investmentMetadata.map((item) => (
                    <span
                      key={item.label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-sunken px-3 py-1 text-xs text-gray-300"
                    >
                      <span className="text-gray-500">{item.label}:</span>
                      {item.value}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowEditForm(true)}
                  className="btn-interactive inline-flex items-center gap-2 rounded-lg border border-border bg-surface-sunken px-4 py-2 text-sm font-medium text-gray-200 hover:border-gray-500"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Account
                </button>
              </div>
            </div>

            <div className="rounded-card border border-border bg-surface-raised p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">Checkpoints</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Record periodic value snapshots to track performance over time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCheckpointModal(true)}
                  className="btn-interactive inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
                >
                  <Plus className="h-4 w-4" />
                  Add Checkpoint
                </button>
              </div>
            </div>

            <div className="rounded-card border border-border bg-surface-raised p-6">
              <h3 className="text-base font-semibold text-white">Performance Trend</h3>
              {chartData.length === 0 ? (
                <EmptyState
                  icon={LineChartIcon}
                  title="No checkpoints yet"
                  description="Add your first checkpoint to see how this investment performs over time."
                  action={{
                    label: "Add checkpoint",
                    onClick: () => setShowCheckpointModal(true),
                  }}
                />
              ) : (
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="investmentValueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} tickFormatter={formatYAxisTick} />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                        contentStyle={{
                          backgroundColor: "#111827",
                          borderRadius: 8,
                          border: "1px solid #1f2937",
                        }}
                        itemStyle={{ color: "#f9fafb" }}
                      />
                      {typeof contributedBaseline === "number" ? (
                        <ReferenceLine
                          y={contributedBaseline}
                          stroke="#f59e0b"
                          strokeDasharray="4 4"
                        />
                      ) : null}
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#investmentValueGradient)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-card border border-border bg-surface-raised p-6">
              <h3 className="text-base font-semibold text-white">Checkpoint History</h3>
              {sortedCheckpoints.length === 0 ? (
                <p className="mt-4 text-sm text-gray-400">No checkpoints recorded yet.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {visibleCheckpoints.map((checkpoint) => (
                    <div
                      key={checkpoint.id}
                      className="flex flex-col gap-1 rounded-lg border border-border bg-surface-sunken p-3 text-sm text-gray-200 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium tabular-nums text-white">
                          {formatCurrency(checkpoint.value)}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(checkpoint.recordedAt)}</p>
                      </div>
                      {checkpoint.note?.trim() ? (
                        <p className="text-xs text-gray-400">{checkpoint.note}</p>
                      ) : null}
                    </div>
                  ))}
                  {hasMoreCheckpoints ? (
                    <button
                      type="button"
                      onClick={() => setShowAllCheckpoints((current) => !current)}
                      className="btn-interactive w-full rounded-lg border border-border px-3 py-2 text-sm text-gray-300 hover:border-gray-500 hover:text-white"
                    >
                      {showAllCheckpoints
                        ? "Show less"
                        : `Show more (${sortedCheckpoints.length - CHECKPOINTS_PREVIEW_COUNT} more)`}
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            <LinkedGoalsSection goals={linkedGoals} />

            {transferSummary ? (
              <TransferSummaryStrip summary={transferSummary} formatCurrency={formatCurrency} />
            ) : null}

            <AccountTransfersSection
              accountId={accountId}
              transfers={transfers}
              transfersLoading={transfersLoading}
              transfersError={transfersError}
              onRetry={() =>
                qc.invalidateQueries({ queryKey: queryKeys.accountTransfers(accountId) })
              }
            />

            {showCheckpointModal ? (
              <AddCheckpointModal
                accountId={accountId}
                onSuccess={handleCheckpointSuccess}
                onClose={() => setShowCheckpointModal(false)}
              />
            ) : null}

            {showEditForm ? (
              <AccountForm
                account={account}
                onSuccess={handleAccountFormSuccess}
                onClose={() => setShowEditForm(false)}
              />
            ) : null}
          </>
        )}
      </div>

      {toast ? (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      ) : null}
    </div>
  );
}
