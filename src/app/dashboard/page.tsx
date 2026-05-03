"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";

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
  getLatestSummary,
} from "@/lib/api";
import { formatCurrency, getCurrentTimestamp, getMonthString } from "@/lib/utils";
import type { Account, ExpenseMonthlySummary, ExpenseStats, WeeklySummary } from "@/types";

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

export default function DashboardPage() {
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [summary, setSummary] = useState<ExpenseMonthlySummary | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(
    null
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const month = getMonthString();
        const [statsData, summaryData, weeklyData, accountsData] = await Promise.all([
          getExpenseStats(),
          getExpenseSummary(month),
          getLatestSummary(),
          getAccounts(),
        ]);

        setStats(statsData);
        setSummary(summaryData);
        setWeeklySummary(weeklyData);
        setAccounts(accountsData);
      } catch (err) {
        setError("Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
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
  const trendDelta =
    accountsWithManual.length > 0 && totalManualBalance !== 0
      ? ((netWorth - totalManualBalance) / Math.abs(totalManualBalance)) * 100
      : null;

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
                <Skeleton variant="card" />
              </div>
            </div>
          </div>
        ) : stats && summary ? (
          <div className="space-y-6">
            {/* Net Worth */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Net Worth (Calculated)
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Sum of all account calculated balances
              </p>
              <div className="mt-3 flex items-end gap-4">
                <p className="text-4xl font-semibold tabular-nums text-white drop-shadow-[0_0_12px_rgba(52,211,153,0.25)]">
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
              <div className="mt-3 h-0.5 w-24 rounded-full bg-emerald-500/60" />
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
              {accounts.slice(0, 8).map((account) => (
                <Link
                  key={account.id}
                  href="/accounts"
                  className={`flex-shrink-0 min-w-[160px] rounded-xl border-l-4 border border-gray-800 bg-gray-900/60 p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/40 md:min-w-0 ${
                    accountTypeBorderColor[account.accountType] ?? "border-l-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white truncate">{account.name}</p>
                    <span
                      className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        accountTypeBadgeColor[account.accountType] ?? "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {account.accountType}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold tabular-nums text-emerald-300">
                    {formatCurrency(account.calculatedBalance)}
                  </p>
                </Link>
              ))}
            </div>

            <StatsBar stats={stats} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <CategoryChart summary={summary} />
              </div>
              <div className="lg:col-span-2">
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

