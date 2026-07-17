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
import { ChevronRight, Info, LayoutDashboard } from "lucide-react";

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

function DashboardHeader({ monthLabel }: { monthLabel?: string }) {
  return (
    <header>
      <h1 className="text-xl font-bold text-white sm:text-2xl">Dashboard</h1>
      {monthLabel ? (
        <p className="mt-1 text-sm text-gray-500">{monthLabel}</p>
      ) : (
        <Skeleton variant="text" className="mt-1 h-4 w-32" />
      )}
    </header>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 xl:gap-5">
      {/* Bands 1+2: net worth → accounts → KPIs on mobile */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-5">
        <Skeleton variant="card" className="order-1 h-48 rounded-card-lg xl:col-span-8" />
        <div className="order-2 flex gap-3 overflow-x-auto pb-1 xl:order-3 xl:col-span-12">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={`account-${index}`}
              variant="card"
              className="h-24 min-w-[160px] flex-shrink-0 rounded-card"
            />
          ))}
        </div>
        <div className="order-3 grid grid-cols-1 gap-3 md:grid-cols-3 xl:order-2 xl:col-span-4 xl:grid-cols-1">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={`kpi-${index}`} variant="stat" className="md:h-full min-h-[72px] xl:min-h-0" />
          ))}
        </div>
      </div>

      {/* Band 3: category + budgets — equal height only at xl */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-stretch xl:gap-5">
        <Skeleton variant="chart" className="xl:col-span-7 xl:min-h-[420px]" />
        <Skeleton variant="card" className="rounded-card-lg xl:col-span-5 xl:min-h-[420px]" />
      </div>

      {/* Band 4: trend + summary — equal height only at xl */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-stretch xl:gap-5">
        <Skeleton variant="chart" className="xl:col-span-7 xl:min-h-[320px]" />
        <Skeleton variant="card" className="rounded-card-lg xl:col-span-5 xl:min-h-[320px]" />
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
      className="md:h-full xl:h-full rounded-card border border-border bg-surface p-card-sm"
    >
      <p className="mb-1.5 text-xs font-medium text-gray-500">{label}</p>
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
      : "bg-surface border border-border";

  return (
    <AnimatedCard staggerIndex={staggerIndex} className={`md:h-full xl:h-full rounded-card p-card-sm ${tintClass}`}>
      <div className="mb-1.5 flex items-center gap-2">
        <p className="text-xs font-medium text-gray-500">Net Cash Flow</p>

        <div className="relative hidden sm:inline-flex group">
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

      <p className="mb-1 text-[10px] leading-snug text-gray-500 sm:hidden">{subtitle}</p>

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
    <AnimatedCard staggerIndex={staggerIndex} className="flex flex-col rounded-card-lg bg-surface-raised p-card-md xl:h-full">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Monthly Trend</h2>
        <span className="text-xs text-gray-500">Last 6 months</span>
      </div>
      <div className="h-52 min-h-[208px] xl:min-h-[208px] xl:flex-1">
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
    <AnimatedCard
      staggerIndex={staggerIndex}
      className={`flex flex-col rounded-card-lg bg-surface-raised p-card-md xl:h-full ${className ?? ""}`.trim()}
    >
      <h2 className="text-lg font-semibold text-white">Category focus</h2>
      <p className="mt-1 text-sm text-gray-400">{monthLabel}</p>

      {hasTopCategory ? (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-card border border-border bg-surface-sunken p-4">
              <p className="text-xs font-medium text-gray-500">Top category</p>
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

            <div className="hidden rounded-card border border-border bg-surface-sunken p-3 sm:block">
              <p className="text-xs font-medium text-gray-500">Category split</p>
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
                          <div className="rounded-lg border border-border-strong bg-surface-sunken px-3 py-2 shadow-lg">
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

          <div className="mt-3 rounded-card border border-border bg-surface-sunken p-3">
            <p className="text-xs font-medium text-gray-500">Top categories</p>
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
                <div className="flex items-center justify-between gap-2 border-t border-border pt-2 text-sm">
                  <span className="text-gray-400">Other categories</span>
                  <span className="text-gray-300">{formatCurrency(remainingSpend)}</span>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-card border border-dashed border-border-strong bg-surface-sunken p-4 text-sm text-gray-400">
          No category spending data for this month yet.
        </div>
      )}

      <Link
        href="/expenses"
        className="btn-interactive mt-4 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 xl:mt-auto xl:pt-4"
      >
        View all expenses
        <ChevronRight className="h-3.5 w-3.5" />
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

  // Count-up is reserved for the hero net worth value so the dashboard doesn't
  // animate every number at once. Call hooks unconditionally to preserve order.
  const calculatedAnimated = useCountUp(dashboardData?.calculatedNetWorth ?? 0);
  const manualAnimated = useCountUp(dashboardData?.manualNetWorth ?? 0);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <DashboardHeader />
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard";
    return (
      <div className="space-y-4 sm:space-y-6">
        <DashboardHeader />
        <ErrorState message={message} />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <DashboardHeader />
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
      <DashboardHeader monthLabel={dashboardData.currentMonthLabel} />

      <div className="flex flex-col gap-4 xl:gap-5">
        {/* Bands 1+2: mobile order = net worth → accounts → KPIs; desktop = net worth + KPIs, then accounts */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-5">
          <div className="order-1 xl:col-span-8">
            <NetWorthCard
              calculated={dashboardData.calculatedNetWorth}
              manual={dashboardData.manualNetWorth}
              drift={dashboardData.netWorthDrift}
              calculatedAnimated={calculatedAnimated}
              manualAnimated={dashboardData.manualNetWorth !== null ? manualAnimated : undefined}
              historyData={netWorthHistory}
            />
          </div>

          <div className="order-2 xl:order-3 xl:col-span-12">
            <AccountsStrip
              accounts={dashboardData.accounts.map((account) => {
                const metrics = investmentMetricsByAccountId.get(account.id);
                return metrics ? { ...account, ...metrics } : account;
              })}
            />
          </div>

          <div className="order-3 grid grid-cols-1 gap-3 md:grid-cols-3 xl:order-2 xl:col-span-4 xl:grid-cols-1">
            <StatCard label="Income This Month" value={dashboardData.incomeThisMonth} staggerIndex={0} />
            <StatCard label="Expenses This Month" value={dashboardData.expensesThisMonth} staggerIndex={1} />
            <NetCashFlowCard
              value={dashboardData.netCashFlow}
              subtitle="Income - Expenses · transfers excluded"
              staggerIndex={2}
            />
          </div>
        </div>

        {/* Band 3: category focus + budget highlights */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-stretch xl:gap-5">
          <CategoryFocusCard
            className="xl:col-span-7"
            category={dashboardData.topExpenseCategory}
            amount={dashboardData.topExpenseCategoryAmount}
            total={dashboardData.expensesThisMonth}
            monthLabel={dashboardData.currentMonthLabel}
            donutData={categoryDonutData}
            staggerIndex={0}
          />
          <div className="xl:h-full xl:col-span-5">
            <BudgetHighlightsCard
              month={currentMonth}
              budgets={budgetItems}
              alerts={dashboardData.budgetAlerts ?? []}
            />
          </div>
        </div>

        {/* Band 4: monthly trend + weekly summary */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-stretch xl:gap-5">
          <div className="xl:h-full xl:col-span-7">
            <MonthlyTrendCard data={monthlyTrendData} staggerIndex={1} />
          </div>
          <div className="xl:h-full xl:col-span-5">
            <WeeklySummaryCard summary={summary} />
          </div>
        </div>
      </div>
    </div>
  );
}
