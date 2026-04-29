"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import { formatCurrency } from "@/lib/utils";
import type { ExpenseStats } from "@/types";

type StatsBarProps = {
  stats: ExpenseStats;
};

export default function StatsBar({ stats }: StatsBarProps) {
  const isUp = stats.totalThisMonth > stats.totalLastMonth;
  const isDown = stats.totalThisMonth < stats.totalLastMonth;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl bg-gray-800 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">This month</p>
          {isUp ? (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <TrendingUp className="h-4 w-4" />
              Up
            </span>
          ) : null}
          {isDown ? (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <TrendingDown className="h-4 w-4" />
              Down
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-xl font-semibold text-white">
          {formatCurrency(stats.totalThisMonth)}
        </p>
      </div>

      <div className="rounded-xl bg-gray-800 p-4">
        <p className="text-sm text-gray-400">Last month</p>
        <p className="mt-2 text-xl font-semibold text-white">
          {formatCurrency(stats.totalLastMonth)}
        </p>
      </div>

      <div className="rounded-xl bg-gray-800 p-4">
        <p className="text-sm text-gray-400">Daily average</p>
        <p className="mt-2 text-xl font-semibold text-white">
          {formatCurrency(stats.averagePerDay)}
        </p>
      </div>

      <div className="rounded-xl bg-gray-800 p-4">
        <p className="text-sm text-gray-400">Top category</p>
        <p className="mt-2 text-xl font-semibold text-white">
          {stats.topCategory}
        </p>
      </div>
    </div>
  );
}
