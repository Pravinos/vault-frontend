"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQueryClient } from "@tanstack/react-query";

import ErrorMessage from "@/components/ui/ErrorMessage";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import ManualBalanceModal from "@/components/accounts/ManualBalanceModal";
import { formatDate } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/currencyContext";
import { deriveInvestmentMetrics } from "@/lib/investmentMetrics";
import { useAccount } from "@/lib/hooks/useAccount";
import { useAccountTransfers } from "@/lib/hooks/useAccountTransfers";
import { useCheckpoints } from "@/lib/hooks/useCheckpoints";
import { invalidateTransferBalanceQueries } from "@/lib/hooks/useAccountMutations";
import { useAddCheckpoint } from "@/lib/hooks/useCheckpointMutations";
import { queryKeys } from "@/lib/queryKeys";
import { isRevertTransfer } from "@/lib/transfers";
import type { Transfer } from "@/types";
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

function AccountTransfersSection({
  transfers,
  transfersLoading,
  transfersError,
}: {
  transfers: Transfer[];
  transfersLoading: boolean;
  transfersError: Error | null;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
      <h3 className="text-base font-semibold text-white">Transfers</h3>
      {transfersLoading ? (
        <div className="mt-4">
          <Skeleton variant="card" className="h-24 rounded-xl" />
        </div>
      ) : transfersError ? (
        <p className="mt-4 text-sm text-red-400">Unable to load transfer history.</p>
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
                note={t.note}
                createdAt={t.createdAt}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AccountDetailPage() {
  const formatCurrency = useFormatCurrency();
  const params = useParams<{ id: string }>();
  const accountId = params.id;

  const [valueInput, setValueInput] = useState<string>("");
  const [noteInput, setNoteInput] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
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
  const addCheckpointMutation = useAddCheckpoint(accountId);

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

  const handleAddCheckpoint = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedValue = Number(valueInput);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      setToast({ message: "Checkpoint value must be greater than 0", type: "error" });
      return;
    }

    try {
      await addCheckpointMutation.mutateAsync({
        value: parsedValue,
        note: noteInput.trim() ? noteInput.trim() : undefined,
      });

      setValueInput("");
      setNoteInput("");
      setToast({ message: "Checkpoint added", type: "success" });
    } catch {
      setToast({ message: "Unable to add checkpoint", type: "error" });
    }
  };

  const pageTitle =
    account?.accountType === "INVESTMENT" ? "Investment Details" : "Account Details";

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-white sm:text-2xl">{pageTitle}</h1>
        <Link
          href="/accounts"
          className="inline-flex w-full items-center justify-center rounded-lg border border-gray-700 px-3 py-2 text-base text-gray-200 hover:border-gray-500 sm:w-auto sm:text-sm"
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
          <div className="rounded-xl border border-dashed border-gray-800 py-12 text-center text-sm text-gray-400">
            Account not found.
          </div>
        ) : account.accountType !== "INVESTMENT" ? (
          <>
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
              <h2 className="text-lg font-semibold text-white">{account.name}</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Balance</p>
                  <p className="mt-1 text-sm font-semibold text-white">{formatCurrency(account.calculatedBalance)}</p>
                </div>
                <div className="rounded-lg bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Opening Balance</p>
                  <p className="mt-1 text-sm font-semibold text-white">{formatCurrency(account.openingBalance ?? 0)}</p>
                </div>
                <div className="rounded-lg bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Since Opening</p>
                  <p className="mt-1 text-sm font-semibold text-white">{formatCurrency((account.calculatedBalance ?? 0) - (account.openingBalance ?? 0))}</p>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowManualModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
                >
                  Update Manual Balance
                </button>
              </div>
            </div>

            <AccountTransfersSection
              transfers={transfers}
              transfersLoading={transfersLoading}
              transfersError={transfersError}
            />

            {showManualModal ? (
              <ManualBalanceModal
                account={account}
                onSuccess={async () => {
                  setShowManualModal(false);
                  await invalidateTransferBalanceQueries(qc);
                }}
                onClose={() => setShowManualModal(false)}
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
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
              <h2 className="text-lg font-semibold text-white">{account.name}</h2>
              <div
                className={`mt-4 grid grid-cols-1 gap-3 ${
                  account.assetType?.trim() ? "md:grid-cols-5" : "md:grid-cols-4"
                }`}
              >
                <div className="rounded-lg bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Contributed</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatCurrency(contributedBaseline ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Current Value</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatCurrency(investmentMetrics?.currentValue ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Return</p>
                  <p className={`mt-1 text-sm font-semibold ${getReturnColor(investmentMetrics?.returnAmount ?? null)}`}>
                    {formatCurrency(investmentMetrics?.returnAmount ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Return %</p>
                  <p className={`mt-1 text-sm font-semibold ${getReturnColor(investmentMetrics?.returnPercentage ?? null)}`}>
                    {formatReturnPercentage(investmentMetrics?.returnPercentage ?? null)}
                  </p>
                </div>
                {account.assetType?.trim() ? (
                  <div className="rounded-lg bg-gray-800/70 p-3">
                    <p className="text-xs text-gray-400">Asset Type</p>
                    <p className="mt-1 text-sm font-semibold text-white">{account.assetType}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
              <h3 className="text-base font-semibold text-white">Add Checkpoint</h3>
              <form onSubmit={handleAddCheckpoint} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={valueInput}
                  onChange={(event) => setValueInput(event.target.value)}
                  placeholder="Value"
                  className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                  required
                />
                <input
                  type="text"
                  value={noteInput}
                  onChange={(event) => setNoteInput(event.target.value)}
                  placeholder="Note (optional)"
                  maxLength={255}
                  className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={addCheckpointMutation.isPending}
                >
                  {addCheckpointMutation.isPending ? "Saving..." : "Add Checkpoint"}
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
              <h3 className="text-base font-semibold text-white">Performance Trend</h3>
              {chartData.length === 0 ? (
                <p className="mt-4 text-sm text-gray-400">No checkpoints yet.</p>
              ) : (
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
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
                          label={{ value: "Contributed", fill: "#f59e0b", position: "insideTopLeft" }}
                        />
                      ) : null}
                      <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
              <h3 className="text-base font-semibold text-white">Checkpoints</h3>
              {sortedCheckpoints.length === 0 ? (
                <p className="mt-4 text-sm text-gray-400">No checkpoints yet.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {visibleCheckpoints.map((checkpoint) => (
                    <div
                      key={checkpoint.id}
                      className="flex flex-col gap-1 rounded-lg border border-gray-800 bg-gray-950/70 p-3 text-sm text-gray-200 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-white">{formatCurrency(checkpoint.value)}</p>
                        <p className="text-xs text-gray-400">{formatDate(checkpoint.recordedAt)}</p>
                      </div>
                      <p className="text-xs text-gray-400">{checkpoint.note || "No note"}</p>
                    </div>
                  ))}
                  {hasMoreCheckpoints ? (
                    <button
                      type="button"
                      onClick={() => setShowAllCheckpoints((current) => !current)}
                      className="w-full rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:border-gray-500 hover:text-white"
                    >
                      {showAllCheckpoints
                        ? "Show less"
                        : `Show more (${sortedCheckpoints.length - CHECKPOINTS_PREVIEW_COUNT} more)`}
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            <AccountTransfersSection
              transfers={transfers}
              transfersLoading={transfersLoading}
              transfersError={transfersError}
            />
          </>
        )}
      </div>

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
