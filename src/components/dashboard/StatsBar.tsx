"use client";

import { CalendarDays, CalendarCheck, TrendingDown, TrendingUp, Tag, BarChart2 } from "lucide-react";

import { formatCurrency } from "@/lib/utils";
import type { ExpenseStats } from "@/types";

type StatsBarProps = {
  stats: ExpenseStats;
};

function getMonthLabel(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function displayAmount(amount: number): React.ReactNode {
  if (amount === 0) return <span className="text-gray-500">—</span>;
  return <>{formatCurrency(amount)}</>;
}

export default function StatsBar({ stats }: StatsBarProps) {
  const isUp = stats.totalThisMonth > stats.totalLastMonth;
  const isDown = stats.totalThisMonth < stats.totalLastMonth;
  const showPct = stats.totalLastMonth > 0;
  const pctChange = showPct
    ? Math.abs(
        ((stats.totalThisMonth - stats.totalLastMonth) /
          stats.totalLastMonth) *
          100
      ).toFixed(1)
    : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl bg-gray-800 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              This month
            </p>
          </div>
          {showPct && isUp ? (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <TrendingUp className="h-3 w-3" />
              {`+${pctChange}%`}
            </span>
          ) : null}
          {showPct && isDown ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <TrendingDown className="h-3 w-3" />
              {`-${pctChange}%`}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-xl font-semibold tabular-nums text-white">
          {displayAmount(stats.totalThisMonth)}
        </p>
        <p className="mt-1 text-[10px] text-gray-500">{getMonthLabel(0)}</p>
      </div>

      <div className="rounded-xl bg-gray-800 p-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-gray-400" />
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Last month
          </p>
        </div>
        {stats.totalLastMonth === 0 ? (
          <>
            <p className="mt-2 text-xl font-semibold text-gray-500">No data</p>
          </>
        ) : (
          <p className="mt-2 text-xl font-semibold tabular-nums text-white">
            {formatCurrency(stats.totalLastMonth)}
          </p>
        )}
        <p className="mt-1 text-[10px] text-gray-500">{getMonthLabel(-1)}</p>
      </div>

      <div className="rounded-xl bg-gray-800 p-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-gray-400" />
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Daily average
          </p>
        </div>
        <p className="mt-2 text-xl font-semibold tabular-nums text-white">
          {displayAmount(stats.averagePerDay)}
        </p>
        <p className="mt-1 text-[10px] text-gray-500">{getMonthLabel(0)}</p>
      </div>

      <div className="rounded-xl bg-gray-800 p-4">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-gray-400" />
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Top category
          </p>
        </div>
        <p className="mt-2 text-xl font-semibold text-white">
          {stats.topCategory || "—"}
        </p>
      </div>
    </div>
  );
}
