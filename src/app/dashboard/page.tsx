"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

import CategoryChart from "@/components/dashboard/CategoryChart";
import StatsBar from "@/components/dashboard/StatsBar";
import WeeklySummaryCard from "@/components/dashboard/WeeklySummaryCard";
import Skeleton from "@/components/ui/Skeleton";
import ErrorMessage from "@/components/ui/ErrorMessage";
import TopBar from "@/components/layout/TopBar";
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

const accountTypeBorderColor: Record<string, string> = {
  CHECKING: "border-l-emerald-500",
  SAVINGS: "border-l-blue-500",
  INVESTMENT: "border-l-purple-500",
};

const accountTypeBadgeColor: Record<string, string> = {
  CHECKING: "bg-emerald-900/60 text-emerald-300",
  SAVINGS: "bg-blue-900/60 text-blue-300",
  INVESTMENT: "bg-purple-900/60 text-purple-300",
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isColdStartError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  return status === 502 || status === 504 || error.code === "ECONNABORTED";
};

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
  const manualLabel = accountsWithManual.length > 0
    ? formatCurrency(totalManualBalance)
    : "—";
  const trendDelta =
    accountsWithManual.length > 0 && totalManualBalance !== 0
      ? ((netWorth - totalManualBalance) / Math.abs(totalManualBalance)) * 100
      : null;

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
    <div className="flex min-h-full flex-col">
      <TopBar title="Dashboard" />
      <div className="flex-1 space-y-6 px-4 py-6 sm:px-6">
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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
            {/* Net Worth */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Net Worth
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Calculated vs manual balances
              </p>
              <div className="mt-3 flex items-end gap-4">
                <p className="text-5xl font-semibold tabular-nums text-white drop-shadow-[0_0_12px_rgba(52,211,153,0.25)]">
                  {formatCurrency(netWorth)}
                </p>
                {trendDelta !== null ? (
                  <span
                    className={`mb-1 flex items-center gap-1 text-sm font-medium ${
                      trendDelta >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {trendDelta >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {trendDelta >= 0 ? "+" : ""}
                    {trendDelta.toFixed(1)}% vs manual
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-6 text-xs text-gray-400">
                <span className="tabular-nums text-gray-200">
                  {formatCurrency(netWorth)} <span className="text-gray-500">(calculated)</span>
                </span>
                <span className="tabular-nums text-gray-200">
                  {manualLabel} <span className="text-gray-500">(manual)</span>
                </span>
              </div>
              <div className="mt-3 h-0.5 w-40 rounded-full bg-emerald-500/60" />
            </div>

            {staleAccounts.length > 0 ? (
              <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4">
                <p className="text-sm font-medium text-amber-200">Manual balance update reminder</p>
                <p className="mt-1 text-xs text-amber-100/90">
                  {staleAccounts.map((account) => account.name).join(", ")} need updates this week.
                </p>
              </div>
            ) : null}

            {/* Account strip */}
            <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-4">
              {accounts.slice(0, 8).map((account) => {
                const delta = account.calculatedBalance - account.openingBalance;
                const isDeltaUp = delta >= 0;
                const deltaLabel = `${isDeltaUp ? "+" : "-"}${formatCurrency(
                  Math.abs(delta)
                )}`;

                return (
                  <Link
                    key={account.id}
                    href={`/accounts/${account.id}`}
                    className={`flex-shrink-0 min-w-[160px] cursor-pointer rounded-xl border-l-4 border border-gray-800 bg-gray-900/60 p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/40 md:min-w-0 ${
                      accountTypeBorderColor[account.accountType] ?? "border-l-gray-600"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white truncate">{account.name}</p>
                      <div className="flex items-center gap-2">
                        {account.accountType === "INVESTMENT" &&
                        account.returnPercentage !== null ? (
                          <span className="rounded-full bg-emerald-900/60 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                            +{account.returnPercentage.toFixed(2)}%
                          </span>
                        ) : null}
                        <span
                          className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            accountTypeBadgeColor[account.accountType] ??
                              "bg-gray-700 text-gray-300"
                          }`}
                        >
                          {account.accountType}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-semibold tabular-nums text-emerald-300">
                      {formatCurrency(account.calculatedBalance)}
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                      {isDeltaUp ? (
                        <TrendingUp className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-400" />
                      )}
                      <span className="tabular-nums">
                        {deltaLabel} since opening
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="border-t border-gray-800" />

            <StatsBar stats={stats} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-gray-800 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Income this month
                </p>
                <p className="mt-2 text-xl font-semibold tabular-nums text-white">
                  {formatCurrency(totalIncomeThisMonth)}
                </p>
              </div>
              <div className="rounded-xl bg-gray-800 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Expenses this month
                </p>
                <p className="mt-2 text-xl font-semibold tabular-nums text-white">
                  {formatCurrency(stats.totalThisMonth)}
                </p>
              </div>
              <div className="rounded-xl bg-gray-800 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Net cash flow
                </p>
                <p
                  className={`mt-2 text-xl font-semibold tabular-nums ${
                    netCashFlow >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {formatCurrency(netCashFlow)}
                </p>
              </div>
            </div>

            {activeGoals.length > 0 ? (
              <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
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
                          <span className="text-gray-400">
                            {goal.daysRemaining} days left
                          </span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-800">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                          <span className="tabular-nums">
                            {formatCurrency(goal.savedAmount)} / {formatCurrency(goal.targetAmount)}
                          </span>
                          <span className="font-medium text-gray-300">
                            {goal.progressPercentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3 min-h-[420px]">
                <CategoryChart summary={summary} />
              </div>
              <div className="lg:col-span-2 min-h-[420px]">
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

