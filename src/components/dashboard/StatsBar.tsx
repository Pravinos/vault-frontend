"use client";

import { CalendarDays, CalendarCheck, TrendingDown, TrendingUp, Tag, BarChart2 } from "lucide-react";

import { formatCurrency } from "@/lib/utils";
import type { ExpenseStats } from "@/types";

type StatsBarProps = {
  stats: ExpenseStats;
};

export default function StatsBar({ stats }: StatsBarProps) {
  const isUp = stats.totalThisMonth > stats.totalLastMonth;
  const isDown = stats.totalThisMonth < stats.totalLastMonth;
  const pctChange =
    stats.totalLastMonth > 0
      ? Math.abs(
          ((stats.totalThisMonth - stats.totalLastMonth) /
            stats.totalLastMonth) *
            100
        ).toFixed(1)
      : null;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div className="rounded-xl bg-gray-800 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              This month
            </p>
          </div>
          {isUp ? (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <TrendingUp className="h-3 w-3" />
              {pctChange ? `+${pctChange}%` : "Up"}
            </span>
          ) : null}
          {isDown ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <TrendingDown className="h-3 w-3" />
              {pctChange ? `-${pctChange}%` : "Down"}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-xl font-semibold tabular-nums text-white">
          {formatCurrency(stats.totalThisMonth)}
        </p>
      </div>

      <div className="rounded-xl bg-gray-800 p-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-gray-400" />
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Last month
          </p>
        </div>
        <p className="mt-2 text-xl font-semibold tabular-nums text-white">
          {formatCurrency(stats.totalLastMonth)}
        </p>
      </div>

      <div className="rounded-xl bg-gray-800 p-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-gray-400" />
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Daily average
          </p>
        </div>
        <p className="mt-2 text-xl font-semibold tabular-nums text-white">
          {formatCurrency(stats.averagePerDay)}
        </p>
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
