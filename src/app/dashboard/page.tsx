"use client";

import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import WeeklySummaryCard from "@/components/dashboard/WeeklySummaryCard";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Skeleton from "@/components/ui/Skeleton";
import { fetchDashboard } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { AccountDashboardData, DashboardData } from "@/types/dashboard";

function getAccountColor(type: AccountDashboardData["accountType"]): string {
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

function getAccountBadgeClass(type: AccountDashboardData["accountType"]): string {
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

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton variant="card" className="h-28 rounded-xl" />
      <div className="flex gap-3 overflow-x-auto pb-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={`account-${index}`}
            variant="card"
            className="h-24 min-w-[160px] flex-shrink-0 rounded-xl"
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`stat-${index}`} variant="stat" />
        ))}
      </div>
      <Skeleton variant="card" className="h-24 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={`stat-grid-${index}`} variant="stat" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton variant="chart" />
        </div>
        <div>
          <Skeleton variant="card" className="h-[420px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return <ErrorMessage message={message} onRetry={() => window.location.reload()} />;
}

function NetWorthCard({
  calculated,
  manual,
  drift,
}: {
  calculated: number;
  manual: number | null;
  drift: number | null;
}) {
  const driftPositive = (drift ?? 0) >= 0;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#1a2f2a] to-[#1a2332] p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Net Worth
      </p>

      <p className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
        {formatCurrency(calculated)}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/5 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Calculated
          </p>
          <p className="text-base font-bold text-emerald-400">{formatCurrency(calculated)}</p>
        </div>

        <div className="rounded-xl bg-white/5 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Manual
          </p>
          <p className={`text-base font-bold ${manual !== null ? "text-blue-400" : "text-gray-600"}`}>
            {manual !== null ? formatCurrency(manual) : "Not set"}
          </p>
        </div>
      </div>

      {drift !== null ? (
        <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
          <span className={`text-xs font-semibold ${driftPositive ? "text-emerald-400" : "text-red-400"}`}>
            {driftPositive ? "▲" : "▼"} {formatCurrency(Math.abs(drift))}
          </span>
          <span className="ml-auto text-xs text-gray-500">manual vs calculated</span>
        </div>
      ) : null}
    </div>
  );
}

function AccountsStrip({ accounts }: { accounts: AccountDashboardData[] }) {
  return (
    <div className="relative">
      <div className="hide-scrollbar flex w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {accounts.slice(0, 8).map((account) => (
          <Link
            key={account.id}
            href={`/accounts/${account.id}`}
            className="w-[200px] shrink-0 snap-start rounded-2xl border-l-4 bg-[#1a2332] p-4 transition-colors sm:w-56"
            style={{ borderLeftColor: getAccountColor(account.accountType) }}
          >
            <p className="mb-1 truncate text-xs font-medium text-gray-400">{account.name}</p>
            <p className="text-xl font-bold text-white">{formatCurrency(account.calculatedBalance)}</p>
            <span
              className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${getAccountBadgeClass(account.accountType)}`}
            >
              {account.accountType}
            </span>
            <div
              className={`mt-2 flex items-center gap-1 text-[11px] ${
                account.secondaryPositive ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {account.secondaryPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {account.secondaryLabel}
            </div>
          </Link>
        ))}
        <div className="w-1 shrink-0 sm:hidden" />
      </div>
      <div className="pointer-events-none absolute bottom-2 right-0 top-0 w-8 bg-gradient-to-l from-[#0d1520] to-transparent sm:hidden" />
    </div>
  );
}

function StatCard({
  label,
  value,
  momPercent,
  momPositiveIsGood,
  monthLabel,
  isText,
}: {
  label: string;
  value: number | string;
  momPercent?: number | null;
  momPositiveIsGood?: boolean;
  monthLabel?: string;
  isText?: boolean;
}) {
  const formattedValue = typeof value === "number" ? formatCurrency(value) : value;
  const trendPositive = momPercent !== null && momPercent !== undefined ? momPercent >= 0 : null;
  const trendGood =
    trendPositive === null || momPositiveIsGood === undefined
      ? null
      : momPositiveIsGood
      ? trendPositive
      : !trendPositive;

  return (
    <div className="rounded-2xl bg-[#1a2332] p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`truncate font-bold ${isText ? "text-base" : "text-lg"} text-white`}>{formattedValue}</p>
      {momPercent !== null && momPercent !== undefined ? (
        <p className={`mt-1 text-xs ${trendGood ? "text-emerald-400" : "text-red-400"}`}>
          {momPercent > 0 ? "+" : ""}
          {momPercent.toFixed(1)}% vs {monthLabel ?? "last month"}
        </p>
      ) : null}
    </div>
  );
}

function NetCashFlowCard({ value, subtitle }: { value: number; subtitle: string }) {
  return (
    <div className="rounded-2xl bg-[#1a2332] p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Net Cash Flow</p>
      <p
        className={`text-xl font-bold ${
          value > 0 ? "text-emerald-400" : value < 0 ? "text-red-400" : "text-white"
        }`}
      >
        {formatCurrency(value)}
      </p>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

function CategoryFocusCard({
  className,
  category,
  amount,
  total,
  monthLabel,
}: {
  className?: string;
  category: string;
  amount: number;
  total: number;
  monthLabel: string;
}) {
  const hasTopCategory = Boolean(category) && amount > 0;
  const share = total > 0 ? (amount / total) * 100 : 0;
  const otherSpend = Math.max(total - amount, 0);

  return (
    <div className={`rounded-2xl bg-[#1a2332] p-5 ${className ?? ""}`.trim()}>
      <h2 className="text-lg font-semibold text-white">Category focus</h2>
      <p className="mt-1 text-sm text-gray-400">{monthLabel}</p>

      {hasTopCategory ? (
        <>
          <div className="mt-6 rounded-xl border border-gray-700/60 bg-[#141c2a] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Top category</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-xl font-bold text-white">{category}</p>
              <p className="text-sm font-semibold text-emerald-300">{share.toFixed(1)}%</p>
            </div>
            <p className="mt-1 text-sm text-gray-300">{formatCurrency(amount)}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${Math.min(Math.max(share, 0), 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-700/60 bg-[#141c2a] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Other categories</p>
              <p className="mt-1 text-sm font-semibold text-gray-200">{formatCurrency(otherSpend)}</p>
            </div>
            <div className="rounded-xl border border-gray-700/60 bg-[#141c2a] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Total expenses</p>
              <p className="mt-1 text-sm font-semibold text-gray-200">{formatCurrency(total)}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-gray-700/70 bg-[#141c2a] p-4 text-sm text-gray-400">
          No category spending data for this month yet.
        </div>
      )}

      <Link
        href="/expenses"
        className="mt-4 inline-block text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
      >
        View all expenses -&gt;
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load dashboard";
        console.error("Dashboard fetch failed:", err);
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Dashboard</h1>
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Dashboard</h1>
        <ErrorState message={error} />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl font-bold text-white sm:text-2xl">Dashboard</h1>

      <div className="space-y-6">
        <NetWorthCard
          calculated={data.calculatedNetWorth}
          manual={data.manualNetWorth}
          drift={data.netWorthDrift}
        />

        <AccountsStrip accounts={data.accounts} />

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Income This Month"
            value={data.incomeThisMonth}
            momPercent={data.incomeMoMPercent}
            momPositiveIsGood
            monthLabel={data.currentMonthLabel}
          />
          <StatCard
            label="Expenses This Month"
            value={data.expensesThisMonth}
            momPercent={data.expensesMoMPercent}
            momPositiveIsGood={false}
            monthLabel={data.currentMonthLabel}
          />
        </div>

        <NetCashFlowCard value={data.netCashFlow} subtitle="Income - Expenses · transfers excluded" />

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Daily Average" value={data.dailyAverageExpense} />
          <StatCard label={`Expenses ${data.currentMonthLabel}`} value={data.expensesThisMonth} />
          <StatCard label={`Expenses ${data.lastMonthLabel}`} value={data.expensesLastMonth} />
          <StatCard label={`Income ${data.lastMonthLabel}`} value={data.incomeLastMonth} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <CategoryFocusCard
            className="lg:col-span-2"
            category={data.topExpenseCategory}
            amount={data.topExpenseCategoryAmount}
            total={data.expensesThisMonth}
            monthLabel={data.currentMonthLabel}
          />
          <WeeklySummaryCard summary={null} />
        </div>
      </div>
    </div>
  );
}
