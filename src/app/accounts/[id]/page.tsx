"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

import ErrorMessage from "@/components/ui/ErrorMessage";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import { addCheckpoint, getAccount, getCheckpoints } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Account, InvestmentCheckpoint } from "@/types";

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

function formatCheckpointDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export default function InvestmentAccountDetailPage() {
  const params = useParams<{ id: string }>();
  const accountId = params.id;

  const [account, setAccount] = useState<Account | null>(null);
  const [checkpoints, setCheckpoints] = useState<InvestmentCheckpoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [valueInput, setValueInput] = useState<string>("");
  const [noteInput, setNoteInput] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [accountData, checkpointsData] = await Promise.all([
        getAccount(accountId),
        getCheckpoints(accountId),
      ]);

      setAccount(accountData);
      setCheckpoints(checkpointsData);
    } catch (fetchError) {
      setError("Unable to load investment account details.");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchData();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchData]);

  const sortedCheckpoints = useMemo(() => {
    return [...checkpoints].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );
  }, [checkpoints]);

  const chartData = useMemo(
    () =>
      sortedCheckpoints.map((checkpoint) => ({
        date: formatCheckpointDate(checkpoint.recordedAt),
        value: checkpoint.value,
      })),
    [sortedCheckpoints]
  );

  const handleAddCheckpoint = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedValue = Number(valueInput);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      setToast({ message: "Checkpoint value must be greater than 0", type: "error" });
      return;
    }

    setSubmitting(true);

    try {
      await addCheckpoint(accountId, {
        value: parsedValue,
        note: noteInput.trim() ? noteInput.trim() : undefined,
      });

      setValueInput("");
      setNoteInput("");
      setToast({ message: "Checkpoint added", type: "success" });
      await fetchData();
    } catch (submitError) {
      setToast({ message: "Unable to add checkpoint", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Investment Details</h1>
        <Link
          href="/accounts"
          className="inline-flex w-full items-center justify-center rounded-lg border border-gray-700 px-3 py-2 text-base text-gray-200 hover:border-gray-500 sm:w-auto sm:text-sm"
        >
          Back to Accounts
        </Link>
      </div>

      <div className="space-y-6">
        {error ? (
          <ErrorMessage message={error} onRetry={fetchData} />
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
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 text-sm text-gray-300">
            This account is not an investment account.
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
                    {formatCurrency(account.contributedAmount ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Current Value</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatCurrency(account.currentValue ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Return</p>
                  <p className={`mt-1 text-sm font-semibold ${getReturnColor(account.returnAmount)}`}>
                    {formatCurrency(account.returnAmount ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-800/70 p-3">
                  <p className="text-xs text-gray-400">Return %</p>
                  <p className={`mt-1 text-sm font-semibold ${getReturnColor(account.returnPercentage)}`}>
                    {formatReturnPercentage(account.returnPercentage)}
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
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Add Checkpoint"}
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
                      {account.contributedAmount !== null ? (
                        <ReferenceLine
                          y={account.contributedAmount}
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
                  {sortedCheckpoints.map((checkpoint) => (
                    <div
                      key={checkpoint.id}
                      className="flex flex-col gap-1 rounded-lg border border-gray-800 bg-gray-950/70 p-3 text-sm text-gray-200 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-white">{formatCurrency(checkpoint.value)}</p>
                        <p className="text-xs text-gray-400">{formatDate(checkpoint.recordedAt.slice(0, 10))}</p>
                      </div>
                      <p className="text-xs text-gray-400">{checkpoint.note || "No note"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
