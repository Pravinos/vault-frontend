"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import WeeklySummaryCard from "@/components/dashboard/WeeklySummaryCard";
import AccountCard from "@/components/accounts/AccountCard";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Skeleton from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/utils";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { useDashboard } from "@/lib/hooks/useDashboard";
import { useLatestSummary } from "@/lib/hooks/useLatestSummary";
import type { AccountDashboardData, DashboardData } from "@/types/dashboard";

const CHART_COLORS = ["#10b981", "#3b82f6", "#f43f5e", "#64748b", "#34d399", "#60a5fa"];

type DonutSlice = {
  category: string;
  total: number;
};

type CashFlowBarDatum = {
  month: string;
  income: number;
  expenses: number;
  net: number;
};

// sync status removed — account cards no longer show sync indicators

function formatShortMonth(yearMonth: string): string {
  const [yearString, monthString] = yearMonth.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return yearMonth;
  }
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "short" });
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
  calculatedAnimated,
  manualAnimated,
}: {
  calculated: number;
  manual: number | null;
  drift: number | null;
  calculatedAnimated?: number;
  manualAnimated?: number;
}) {
  const driftPositive = (drift ?? 0) >= 0;
  const headlineValue = typeof calculatedAnimated === "number" ? calculatedAnimated : calculated;
  const smallCalculated = headlineValue;
  const smallManual = typeof manualAnimated === "number" ? manualAnimated : manual ?? 0;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#1a2f2a] to-[#1a2332] p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Net Worth
      </p>

      <p className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
        {formatCurrency(headlineValue)}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/5 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Calculated
          </p>
          <p className="text-base font-bold text-emerald-400">{formatCurrency(smallCalculated)}</p>
        </div>

        <div className="rounded-xl bg-white/5 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Manual
          </p>
          <p className={`text-base font-bold ${manual !== null ? "text-blue-400" : "text-gray-600"}`}>
            {manual !== null ? formatCurrency(smallManual) : "Not set"}
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
      <div className="hide-scrollbar flex w-full snap-x snap-mandatory gap-3 overflow-x-auto pb-0">
        {accounts.slice(0, 8).map((account) => (
          <Link
            key={account.id}
            href={`/accounts`}
            className="w-[220px] shrink-0 snap-start sm:w-64"
          >
            <AccountCard
              account={account}
              compact
              className="h-full transition-colors hover:border-gray-700"
            />
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

function NetCashFlowCard({ value, animatedValue, subtitle }: { value: number; animatedValue?: number; subtitle: string }) {
  const displayValue = typeof animatedValue === "number" ? animatedValue : value;
  const tintClass =
    displayValue > 0
      ? "bg-emerald-900/20 border border-emerald-800/40"
      : displayValue < 0
      ? "bg-rose-900/20 border border-rose-800/40"
      : "bg-[#1a2332] border border-transparent";

  return (
    <div className={`rounded-2xl p-4 ${tintClass}`}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Net Cash Flow</p>
      <p
        className={`text-xl font-bold ${
          displayValue > 0 ? "text-emerald-400" : displayValue < 0 ? "text-red-400" : "text-white"
        }`}
      >
        {formatCurrency(displayValue)}
      </p>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

function MonthlyTrendCard({ data }: { data: CashFlowBarDatum[] }) {
  const maxAbs = Math.max(1, ...data.map((item) => Math.abs(item.net)));

  return (
    <div className="rounded-2xl bg-[#1a2332] p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Monthly Trend</h2>
        <span className="text-xs text-gray-500">Last 6 months</span>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
            <XAxis
              dataKey="month"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={{ stroke: "#334155" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={38}
              domain={[-maxAbs, maxAbs]}
              tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
              className="hidden sm:block"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#141c2a",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#e2e8f0",
              }}
              formatter={(value: unknown) => [formatCurrency(Number(value ?? 0)), "Net flow"]}
            />
            <Bar dataKey="net" radius={[6, 6, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.month} fill={entry.net >= 0 ? "#10b981" : "#f43f5e"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CategoryFocusCard({
  className,
  category,
  amount,
  total,
  monthLabel,
  donutData,
}: {
  className?: string;
  category: string;
  amount: number;
  total: number;
  monthLabel: string;
  donutData: DonutSlice[];
}) {
  const hasTopCategory = Boolean(category) && amount > 0;
  const share = total > 0 ? (amount / total) * 100 : 0;
  const otherSpend = Math.max(total - amount, 0);
  const donutSource =
    donutData.length > 0
      ? donutData
      : [
          { category: category || "Top category", total: amount },
          { category: "Other", total: otherSpend },
        ].filter((entry) => entry.total > 0);

  return (
    <div className={`rounded-2xl bg-[#1a2332] p-5 ${className ?? ""}`.trim()}>
      <h2 className="text-lg font-semibold text-white">Category focus</h2>
      <p className="mt-1 text-sm text-gray-400">{monthLabel}</p>

      {hasTopCategory ? (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-700/60 bg-[#141c2a] p-4">
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

            <div className="hidden rounded-xl border border-gray-700/60 bg-[#141c2a] p-3 sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Category split</p>
              <div className="mt-2 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutSource}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={34}
                      outerRadius={52}
                      paddingAngle={2}
                    >
                      {donutSource.map((entry, index) => (
                        <Cell key={entry.category} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#141c2a",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        color: "#e2e8f0",
                      }}
                      formatter={(value) => formatCurrency(Number(value ?? 0))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-gray-700/60 bg-[#141c2a] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Top categories</p>
            <div className="mt-2 space-y-2">
              {donutSource.slice(0, 4).map((entry) => {
                const entryShare = total > 0 ? (entry.total / total) * 100 : 0;
                return (
                  <div key={entry.category} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-gray-200">{entry.category}</span>
                    <span className="whitespace-nowrap text-gray-400">
                      {formatCurrency(entry.total)} · {entryShare.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between gap-2 border-t border-gray-700/70 pt-2 text-sm">
                <span className="text-gray-400">Other categories</span>
                <span className="text-gray-300">{formatCurrency(otherSpend)}</span>
              </div>
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
  const { data, isLoading: loading, error } = useDashboard()
  const { data: summary = null } = useLatestSummary()

  const dashboardData = data?.dashboard ?? null
  const expenseSummaries = data?.expenseSummaries ?? []
  const incomeSummaries = data?.incomeSummaries ?? []
  const monthRange = data?.monthRange ?? []

  const categoryDonutData = useMemo<DonutSlice[]>(() => {
    const currentMonthSummary = expenseSummaries[expenseSummaries.length - 1]
    return (currentMonthSummary?.byCategory ?? [])
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [expenseSummaries])

  const monthlyTrendData = useMemo<CashFlowBarDatum[]>(() => {
    return monthRange.map((month, index) => {
      const incomeTotal = Object.values(incomeSummaries[index] ?? {}).reduce(
        (sum, amount) => sum + amount,
        0
      )
      const expenseTotal = expenseSummaries[index]?.total ?? 0
      return {
        month: formatShortMonth(month),
        income: incomeTotal,
        expenses: expenseTotal,
        net: incomeTotal - expenseTotal,
      }
    })
  }, [monthRange, expenseSummaries, incomeSummaries])

  // Call count-up hooks unconditionally to preserve Hooks order across renders.
  const calculatedAnimated = useCountUp(dashboardData?.calculatedNetWorth ?? 0, 600);
  const manualAnimated = useCountUp(dashboardData?.manualNetWorth ?? 0);
  const incomeAnimated = useCountUp(dashboardData?.incomeThisMonth ?? 0);
  const expensesAnimated = useCountUp(dashboardData?.expensesThisMonth ?? 0);
  const netCashAnimated = useCountUp(dashboardData?.netCashFlow ?? 0);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Dashboard</h1>
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard";
    return (
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Dashboard</h1>
        <ErrorState message={message} />
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  // (moved earlier) - use the precomputed animated values

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl font-bold text-white sm:text-2xl">Dashboard</h1>

      <div>
        <NetWorthCard
          calculated={dashboardData.calculatedNetWorth}
          manual={dashboardData.manualNetWorth}
          drift={dashboardData.netWorthDrift}
          calculatedAnimated={calculatedAnimated}
          manualAnimated={dashboardData.manualNetWorth !== null ? manualAnimated : undefined}
        />

        <div className="mt-6">
          <AccountsStrip accounts={dashboardData.accounts.map((a) => ({
            ...a,
            contributedAmount: a.currentValue !== null && a.returnAmount !== null
              ? a.currentValue - a.returnAmount
              : null,
          }))} />
        </div>

        <div className="mt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Income This Month"
              value={incomeAnimated}
              momPercent={dashboardData.incomeMoMPercent}
              momPositiveIsGood
              monthLabel={dashboardData.currentMonthLabel}
            />
            <StatCard
              label="Expenses This Month"
              value={expensesAnimated}
              momPercent={dashboardData.expensesMoMPercent}
              momPositiveIsGood={false}
              monthLabel={dashboardData.currentMonthLabel}
            />
            <NetCashFlowCard value={dashboardData.netCashFlow} animatedValue={netCashAnimated} subtitle="Income - Expenses · transfers excluded" />
          </div>
        </div>

        <div className="mt-6">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <CategoryFocusCard
              className="xl:col-span-3"
              category={dashboardData.topExpenseCategory}
              amount={dashboardData.topExpenseCategoryAmount}
              total={dashboardData.expensesThisMonth}
              monthLabel={dashboardData.currentMonthLabel}
              donutData={categoryDonutData}
            />
            <div className="space-y-4 xl:col-span-2">
              <MonthlyTrendCard data={monthlyTrendData} />
              <WeeklySummaryCard summary={summary} onGenerated={() => {}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
