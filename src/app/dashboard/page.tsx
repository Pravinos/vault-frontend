"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

import CategoryChart from "@/components/dashboard/CategoryChart";
import WeeklySummaryCard from "../../components/dashboard/WeeklySummaryCard";
import Skeleton from "@/components/ui/Skeleton";
import ErrorMessage from "@/components/ui/ErrorMessage";
import {
  getAccounts,
  getExpenseStats,
  getExpenseSummary,
  getGoals,
  getIncomeSummary,
  getLatestWeeklySummary,
} from "@/lib/api";
import { formatCurrency, getCurrentTimestamp, getMonthString } from "@/lib/utils";
import type { Account, ExpenseMonthlySummary, ExpenseStats, Goal, WeeklySummary } from "@/types";

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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isColdStartError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  return status === 502 || status === 504 || error.code === "ECONNABORTED";
};

function StatCard({
  label,
  value,
  color,
  isText,
}: {
  label: string;
  value: string | number | null;
  color?: "emerald" | "red";
  isText?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[#1a2332] p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p
        className={`truncate font-bold ${
          isText ? "text-base text-white" : "text-lg text-white"
        } ${color === "emerald" ? "text-emerald-400" : ""} ${
          color === "red" ? "text-red-400" : ""
        }`}
      >
        {value ?? "-"}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [summary, setSummary] = useState<ExpenseMonthlySummary | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(
    null
  );
  const [incomeSummary, setIncomeSummary] = useState<Record<string, number> | null>(
    null
  );
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async (allowRetry = true) => {
      setLoading(true);
      setError(null);
      setRetryMessage(null);

      try {
        const month = getMonthString();
        const [statsData, summaryData, weeklyData, accountsData, incomeData, goalsData] =
          await Promise.all([
            getExpenseStats(),
            getExpenseSummary(month),
            getLatestWeeklySummary(),
            getAccounts(),
            getIncomeSummary(month),
            getGoals(),
          ]);

        setStats(statsData);
        setSummary(summaryData);
        setWeeklySummary(weeklyData);
        setAccounts(accountsData);
        setIncomeSummary(incomeData);
        setGoals(goalsData);
      } catch (err) {
        if (allowRetry && isColdStartError(err)) {
          setRetryMessage("Waking up the server... retrying");
          await wait(5000);
          return fetchDashboard(false);
        }

        setError("Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    void fetchDashboard();
  }, []);

  const netWorth = accounts.reduce(
    (sum, account) => sum + account.calculatedBalance,
    0
  );

  const totalManualBalance = accounts.reduce(
    (sum, account) =>
      account.manualBalance !== null ? sum + account.manualBalance : sum,
    0
  );

  const accountsWithManual = accounts.filter((a) => a.manualBalance !== null);
  const manualNetWorth = accountsWithManual.length > 0 ? totalManualBalance : null;

  const totalIncomeThisMonth = incomeSummary
    ? Object.values(incomeSummary).reduce((sum, value) => sum + value, 0)
    : 0;
  const netCashFlow = stats ? totalIncomeThisMonth - stats.totalThisMonth : 0;
  const activeGoals = goals.filter((goal) => goal.isActive);

  const staleAccounts = accounts.filter((account) => {
    const referenceDate =
      account.manualBalance === null
        ? account.createdAt
        : account.manualBalanceUpdatedAt ?? account.createdAt;
    const referenceTimestamp = new Date(referenceDate).getTime();

    if (!Number.isFinite(referenceTimestamp)) {
      return false;
    }

    return referenceTimestamp < getCurrentTimestamp() - staleThresholdMs;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl font-bold text-white sm:text-2xl">Dashboard</h1>
      <div className="space-y-4 sm:space-y-6">
        {error ? (
          <ErrorMessage message={error} onRetry={() => window.location.reload()} />
        ) : loading ? (
          <div className="space-y-6">
            {retryMessage ? (
              <p className="text-xs font-medium text-amber-300">
                {retryMessage}
              </p>
            ) : null}
            <Skeleton variant="card" className="h-28 rounded-xl" />
            <div className="flex gap-3 overflow-x-auto pb-1">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={`account-${index}`} variant="card" className="h-24 min-w-[160px] rounded-xl flex-shrink-0" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} variant="stat" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <Skeleton variant="chart" />
              </div>
              <div className="lg:col-span-2">
                <Skeleton variant="card" className="h-[420px] rounded-xl" />
              </div>
            </div>
          </div>
        ) : stats && summary ? (
          <div className="space-y-6">
            <div className="mb-4 rounded-2xl bg-gradient-to-br from-[#1a2f2a] to-[#1a2332] p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Net Worth
              </p>

              <p className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                {formatCurrency(netWorth)}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/5 p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Calculated
                  </p>
                  <p className="text-base font-bold text-emerald-400">
                    {formatCurrency(netWorth)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-500">From transactions</p>
                </div>

                <div className="rounded-xl bg-white/5 p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Manual
                  </p>
                  <p className={`text-base font-bold ${manualNetWorth !== null ? "text-blue-400" : "text-gray-600"}`}>
                    {manualNetWorth !== null ? formatCurrency(manualNetWorth) : "Not set"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-500">User snapshot</p>
                </div>
              </div>

              {manualNetWorth !== null ? (
                <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
                  {(() => {
                    const diff = netWorth - manualNetWorth;
                    const pct =
                      manualNetWorth !== 0
                        ? ((diff / Math.abs(manualNetWorth)) * 100).toFixed(1)
                        : null;
                    const positive = diff >= 0;

                    return (
                      <>
                        <span className={`text-xs font-semibold ${positive ? "text-emerald-400" : "text-red-400"}`}>
                          {positive ? "▲" : "▼"} {formatCurrency(Math.abs(diff))}
                        </span>
                        {pct !== null ? (
                          <span className={`text-xs ${positive ? "text-emerald-400/70" : "text-red-400/70"}`}>
                            ({positive ? "+" : ""}{pct}% vs manual)
                          </span>
                        ) : null}
                        <span className="ml-auto text-xs text-gray-500">calculated vs manual</span>
                      </>
                    );
                  })()}
                </div>
              ) : null}
            </div>

            {staleAccounts.length > 0 ? (
              <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4">
                <p className="text-sm font-medium text-amber-200">Manual balance update reminder</p>
                <p className="mt-1 text-xs text-amber-100/90">
                  {staleAccounts.map((account) => account.name).join(", ")} need updates this week.
                </p>
              </div>
            ) : null}

            <div className="relative mb-4">
              <div className="flex w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-2 hide-scrollbar">
                {accounts.slice(0, 8).map((account) => {
                  const delta = account.calculatedBalance - account.openingBalance;
                  const isDeltaUp = delta >= 0;

                  return (
                    <Link
                      key={account.id}
                      href={`/accounts/${account.id}`}
                      className="w-[200px] sm:w-56 shrink-0 snap-start rounded-2xl bg-[#1a2332] p-4 border-l-4 transition-colors border-emerald-500"
                      style={{
                        borderLeftColor: getAccountColor(account.accountType),
                      }}
                    >
                      <p className="truncate text-xs font-medium text-gray-400 mb-1">{account.name}</p>
                      <p className="text-xl font-bold text-white">{formatCurrency(account.calculatedBalance)}</p>
                      <span
                        className={`inline-block mt-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getAccountBadgeClass(account.accountType)}`}
                      >
                        {account.accountType}
                      </span>
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-gray-400">
                        {isDeltaUp ? (
                          <TrendingUp className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-400" />
                        )}
                        {isDeltaUp ? "+" : "-"}
                        {formatCurrency(Math.abs(delta))} since opening
                      </div>
                    </Link>
                  );
                })}

                <div className="w-1 shrink-0 sm:hidden" />
              </div>

              <div className="pointer-events-none absolute bottom-2 right-0 top-0 w-8 bg-gradient-to-l from-[#0d1520] to-transparent sm:hidden" />
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <StatCard
                label="Income This Month"
                value={formatCurrency(totalIncomeThisMonth)}
                color="emerald"
              />
              <StatCard
                label="Expenses This Month"
                value={formatCurrency(stats.totalThisMonth)}
                color="red"
              />
            </div>

            <div className="mb-3 rounded-2xl bg-[#1a2332] p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Net Cash Flow
              </p>
              <p
                className={`text-xl font-bold ${
                  netCashFlow > 0
                    ? "text-emerald-400"
                    : netCashFlow < 0
                    ? "text-red-400"
                    : "text-white"
                }`}
              >
                {formatCurrency(netCashFlow)}
              </p>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <StatCard label="This Month" value={formatCurrency(stats.totalThisMonth)} />
              <StatCard label="Last Month" value={formatCurrency(stats.totalLastMonth)} />
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <StatCard label="Daily Average" value={formatCurrency(stats.averagePerDay)} />
              <StatCard label="Top Category" value={stats.topCategory || "-"} isText />
            </div>

            {activeGoals.length > 0 ? (
              <div className="rounded-2xl bg-[#1a2332] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    <h3 className="text-sm font-semibold text-white">Goals</h3>
                  </div>
                  <Link
                    href="/goals"
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
                  >
                    View all {"->"}
                  </Link>
                </div>
                <div className="mt-3 space-y-3">
                  {activeGoals.slice(0, 2).map((goal) => {
                    const progress = Math.min(goal.progressPercentage, 100);
                    return (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
                          <span className="font-medium text-white">{goal.name}</span>
                          <span className="text-gray-400">{goal.daysRemaining} days left</span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-800">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <CategoryChart summary={summary} />
              </div>
              <div>
                <WeeklySummaryCard
                  summary={weeklySummary}
                  onGenerated={setWeeklySummary}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

