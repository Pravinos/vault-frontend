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
  ReferenceLine,
} from "recharts";
import { Info, LayoutDashboard } from "lucide-react";

import WeeklySummaryCard from "@/components/dashboard/WeeklySummaryCard";
import BudgetHighlightsCard from "@/components/dashboard/BudgetHighlightsCard";
import NetWorthCard from "@/components/dashboard/NetWorthCard";
import AccountsStrip from "@/components/dashboard/AccountsStrip";
import AnimatedCard from "@/components/ui/AnimatedCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Skeleton from "@/components/ui/Skeleton";
import { getCategoryChartColor } from "@/lib/categoryChartColors";
import { useFormatCurrency } from "@/lib/currencyContext";
import { DURATION_SLOW, prefersReducedMotion } from "@/lib/motion";
import { buildNetWorthHistory, formatShortMonth, type NetWorthHistoryDatum } from "@/lib/netWorthHistory";
import { useAnimatedProgress } from "@/lib/hooks/useAnimatedProgress";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { useDashboard } from "@/lib/hooks/useDashboard";
import { useInvestmentMetricsMap } from "@/lib/hooks/useInvestmentMetricsMap";
import { useLatestSummary } from "@/lib/hooks/useLatestSummary";
import { getMonthString } from "@/lib/utils";

type DonutSlice = {
  category: string;
  total: number;
};

type CashFlowBarDatum = {
  month: string;
  net: number;
};

function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5">
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

function StatCard({
  label,
  value,
  momPercent,
  momPositiveIsGood,
  monthLabel,
  isText,
  staggerIndex,
}: {
  label: string;
  value: number | string;
  momPercent?: number | null;
  momPositiveIsGood?: boolean;
  monthLabel?: string;
  isText?: boolean;
  staggerIndex?: number;
}) {
  const formatCurrency = useFormatCurrency();
  const formattedValue = typeof value === "number" ? formatCurrency(value) : value;
  const trendPositive = momPercent !== null && momPercent !== undefined ? momPercent >= 0 : null;
  const trendGood =
    trendPositive === null || momPositiveIsGood === undefined
      ? null
      : momPositiveIsGood
      ? trendPositive
      : !trendPositive;

  return (
    <AnimatedCard
      staggerIndex={staggerIndex}
      className="rounded-xl border border-white/[0.04] bg-[#111820] p-3.5"
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`truncate font-semibold tabular-nums ${isText ? "text-sm" : "text-base"} text-gray-200`}>
        {formattedValue}
      </p>
      {momPercent !== null && momPercent !== undefined ? (
        <p className={`mt-1 text-xs ${trendGood ? "text-emerald-400" : "text-red-400"}`}>
          {momPercent > 0 ? "+" : ""}
          {momPercent.toFixed(1)}% vs {monthLabel ?? "last month"}
        </p>
      ) : null}
    </AnimatedCard>
  );
}

function NetCashFlowCard({
  value,
  animatedValue,
  subtitle,
  staggerIndex,
}: {
  value: number;
  animatedValue?: number;
  subtitle: string;
  staggerIndex?: number;
}) {
  const formatCurrency = useFormatCurrency();
  const displayValue = typeof animatedValue === "number" ? animatedValue : value;
  const tintClass =
    displayValue > 0
      ? "bg-emerald-950/25 border border-emerald-900/25"
      : displayValue < 0
      ? "bg-rose-950/25 border border-rose-900/25"
      : "bg-[#111820] border border-white/[0.04]";

  return (
    <AnimatedCard staggerIndex={staggerIndex} className={`rounded-xl p-3.5 ${tintClass}`}>
      <div className="mb-1.5 flex items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Net Cash Flow</p>

        <div className="relative inline-flex group">
          <button
            type="button"
            aria-label="Net Cash Flow info"
            className="flex items-center"
            title={subtitle}
          >
            <Info className="h-3 w-3 text-gray-400 group-hover:text-gray-300" />
          </button>

          <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#0b1720] px-2 py-1 text-xs text-gray-300 opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-opacity">
            {subtitle}
          </div>
        </div>
      </div>

      <p
        className={`text-lg font-semibold tabular-nums ${
          displayValue > 0 ? "text-emerald-400/90" : displayValue < 0 ? "text-red-400/90" : "text-gray-200"
        }`}
      >
        {formatCurrency(displayValue)}
      </p>
    </AnimatedCard>
  );
}

function MonthlyTrendCard({ data, staggerIndex }: { data: CashFlowBarDatum[]; staggerIndex?: number }) {
  const formatCurrency = useFormatCurrency();

  function formatYAxisTick(value: number) {
    const abs = Math.abs(Number(value) || 0);
    if (value === 0) return "0";
    if (abs < 1000) return `${Math.round(Number(value))}`;
    return `${(Number(value) / 1000).toFixed(1)}k`;
  }

  return (
    <AnimatedCard staggerIndex={staggerIndex} className="rounded-2xl bg-[#1a2332] p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Monthly Trend</h2>
        <span className="text-xs text-gray-500">Last 6 months</span>
      </div>
      <div className="h-52 min-h-[208px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#334155" vertical={false} opacity={0.4} />
            <XAxis
              dataKey="month"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={60}
              domain={["dataMin", "dataMax"]}
              tickFormatter={formatYAxisTick}
              className="hidden sm:block"
            />
            <Tooltip
              cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const value = Number(payload[0].value ?? 0);
                return (
                  <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-2xl">
                    <p className="text-sm font-semibold text-slate-100 mb-1">{label}</p>
                    <p className="text-xs text-slate-300">
                      Net flow:{" "}
                      <span className={value >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {formatCurrency(value)}
                      </span>
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="net"
              radius={[6, 6, 0, 0]}
              minPointSize={3}
              isAnimationActive={!prefersReducedMotion()}
              animationDuration={DURATION_SLOW}
              animationEasing="ease-out"
            >
              {data.map((entry) => (
                <Cell key={entry.month} fill={entry.net >= 0 ? "#10b981" : "#ef4444"} />
              ))}
            </Bar>
            <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnimatedCard>
  );
}

function CategoryFocusCard({
  className,
  category,
  amount,
  total,
  monthLabel,
  donutData,
  staggerIndex,
}: {
  className?: string;
  category: string;
  amount: number;
  total: number;
  monthLabel: string;
  donutData: DonutSlice[];
  staggerIndex?: number;
}) {
  const formatCurrency = useFormatCurrency();
  const hasTopCategory = Boolean(category) && amount > 0;
  const share = total > 0 ? (amount / total) * 100 : 0;
  const animatedShare = useAnimatedProgress(Math.min(Math.max(share, 0), 100));
  const donutSource =
    donutData.length > 0
      ? donutData
      : [
          { category: category || "Top category", total: amount },
          { category: "Other", total: Math.max(total - amount, 0) },
        ].filter((entry) => entry.total > 0);
  const listedCategories = donutSource.slice(0, 4);
  const listedTotal = listedCategories.reduce((sum, entry) => sum + entry.total, 0);
  const remainingSpend = Math.max(total - listedTotal, 0);

  return (
    <AnimatedCard staggerIndex={staggerIndex} className={`rounded-2xl bg-[#1a2332] p-5 ${className ?? ""}`.trim()}>
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
                  className="progress-bar-fill h-full rounded-full bg-emerald-400"
                  style={{ width: `${animatedShare}%` }}
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
                      isAnimationActive={!prefersReducedMotion()}
                      animationDuration={DURATION_SLOW}
                      animationEasing="ease-out"
                    >
                      {donutSource.map((entry, index) => (
                        <Cell
                          key={`${entry.category}-${index}`}
                          fill={getCategoryChartColor(index)}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;

                        const point = payload[0];
                        const categoryName = String(
                          point.name ?? point.payload?.category ?? "",
                        );
                        const sliceTotal = Number(point.value ?? 0);
                        const sliceIndex = donutSource.findIndex(
                          (entry) => entry.category === categoryName,
                        );
                        const color = getCategoryChartColor(
                          sliceIndex >= 0 ? sliceIndex : 0,
                        );
                        const sliceShare =
                          total > 0 ? (sliceTotal / total) * 100 : 0;

                        return (
                          <div className="rounded-lg border border-slate-600 bg-[#141c2a] px-3 py-2 shadow-lg">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 flex-shrink-0 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-sm font-medium text-slate-100">
                                {categoryName}
                              </span>
                            </div>
                            <p className="mt-1 text-sm tabular-nums text-slate-300">
                              {formatCurrency(sliceTotal)} · {sliceShare.toFixed(1)}%
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-gray-700/60 bg-[#141c2a] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Top categories</p>
            <div className="mt-2 space-y-2">
              {listedCategories.map((entry, index) => {
                const entryShare = total > 0 ? (entry.total / total) * 100 : 0;
                return (
                  <div key={`${entry.category}-${index}`} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: getCategoryChartColor(index) }}
                      />
                      <span className="truncate text-gray-200">{entry.category}</span>
                    </div>
                    <span className="whitespace-nowrap text-gray-400">
                      {formatCurrency(entry.total)} · {entryShare.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
              {remainingSpend > 0 ? (
                <div className="flex items-center justify-between gap-2 border-t border-gray-700/70 pt-2 text-sm">
                  <span className="text-gray-400">Other categories</span>
                  <span className="text-gray-300">{formatCurrency(remainingSpend)}</span>
                </div>
              ) : null}
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
        View all expenses →
      </Link>
    </AnimatedCard>
  );
}

export default function DashboardPage() {
  const { data, isLoading: loading, error } = useDashboard()
  const { data: summary = null } = useLatestSummary()

  const dashboardData = data?.dashboard ?? null
  const expenseSummaries = data?.expenseSummaries ?? []
  const incomeSummaries = data?.incomeSummaries ?? []
  const monthRange = data?.monthRange ?? []
  const currentMonth = data?.currentMonth ?? getMonthString()
  const budgetItems = data?.budgetItems ?? []
  const investmentMetricsByAccountId = useInvestmentMetricsMap(dashboardData?.accounts ?? [])

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
        net: incomeTotal - expenseTotal,
      }
    })
  }, [monthRange, expenseSummaries, incomeSummaries])

  const netWorthHistory = useMemo<NetWorthHistoryDatum[]>(() => {
    return buildNetWorthHistory(
      monthRange,
      monthlyTrendData.map((entry) => entry.net),
      dashboardData?.calculatedNetWorth ?? 0
    )
  }, [monthRange, monthlyTrendData, dashboardData?.calculatedNetWorth])

  // Call count-up hooks unconditionally to preserve Hooks order across renders.
  const calculatedAnimated = useCountUp(dashboardData?.calculatedNetWorth ?? 0);
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
    return (
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Dashboard</h1>
        <EmptyState
          icon={LayoutDashboard}
          title="No dashboard data"
          description="We couldn't load your financial overview. Try refreshing the page."
          action={{ label: "Refresh", onClick: () => window.location.reload() }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl font-bold text-white sm:text-2xl">Dashboard</h1>

      <div className="flex flex-col gap-4 sm:gap-5">
        <NetWorthCard
          calculated={dashboardData.calculatedNetWorth}
          manual={dashboardData.manualNetWorth}
          drift={dashboardData.netWorthDrift}
          calculatedAnimated={calculatedAnimated}
          manualAnimated={dashboardData.manualNetWorth !== null ? manualAnimated : undefined}
          historyData={netWorthHistory}
        />

        <AccountsStrip
          accounts={dashboardData.accounts.map((account) => {
            const metrics = investmentMetricsByAccountId.get(account.id);
            return metrics ? { ...account, ...metrics } : account;
          })}
        />

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Income This Month" value={incomeAnimated} staggerIndex={0} />
          <StatCard label="Expenses This Month" value={expensesAnimated} staggerIndex={1} />
          <NetCashFlowCard
            value={dashboardData.netCashFlow}
            animatedValue={netCashAnimated}
            subtitle="Income - Expenses · transfers excluded"
            staggerIndex={2}
          />
        </div>

        <BudgetHighlightsCard
          month={currentMonth}
          budgets={budgetItems}
          alerts={dashboardData.budgetAlerts ?? []}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <CategoryFocusCard
            className="xl:col-span-3"
            category={dashboardData.topExpenseCategory}
            amount={dashboardData.topExpenseCategoryAmount}
            total={dashboardData.expensesThisMonth}
            monthLabel={dashboardData.currentMonthLabel}
            donutData={categoryDonutData}
            staggerIndex={0}
          />
          <div className="flex flex-col gap-6 xl:col-span-2">
            <MonthlyTrendCard data={monthlyTrendData} staggerIndex={1} />
            <WeeklySummaryCard summary={summary} />
          </div>
        </div>
      </div>
    </div>
  );
}
