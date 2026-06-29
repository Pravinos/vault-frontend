"use client";

import Link from "next/link";
import { PieChart as PieChartIcon } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { formatCurrency, formatMonth } from "@/lib/utils";
import type { ExpenseMonthlySummary } from "@/types";

type CategoryChartProps = {
  summary: ExpenseMonthlySummary;
};

const chartColors = [
  "#fb923c",
  "#60a5fa",
  "#c084fc",
  "#f472b6",
  "#4ade80",
  "#facc15",
  "#38bdf8",
  "#9ca3af",
];

export default function CategoryChart({ summary }: CategoryChartProps) {
  const total = summary.total;

  if (summary.byCategory.length === 0) {
    return (
      <div className="animate-card-enter h-full rounded-2xl bg-[#1a2332] p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-white">
            Spending by category
          </h2>
          <p className="text-sm text-gray-400">{formatMonth(summary.month)}</p>
        </div>
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-700 py-12 text-center">
          <PieChartIcon className="mb-3 h-10 w-10 text-gray-600" />
          <p className="text-sm font-medium text-gray-400">
            No expenses this month
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Add your first expense to see spending breakdown
          </p>
          <Link
            href="/expenses"
            className="mt-4 text-xs font-medium text-emerald-400 hover:text-emerald-300"
          >
            Add your first expense {"->"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-card-enter h-full rounded-2xl bg-[#1a2332] p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">
          Spending by category
        </h2>
        <p className="text-sm text-gray-400">{formatMonth(summary.month)}</p>
      </div>

      <div className="mt-6" style={{ height: "280px", minWidth: "200px", minHeight: "200px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={summary.byCategory}
              dataKey="total"
              nameKey="category"
              innerRadius={summary.byCategory.length === 1 ? 0 : 60}
              outerRadius={90}
              paddingAngle={summary.byCategory.length === 1 ? 0 : 2}
            >
              {summary.byCategory.map((entry, index) => (
                <Cell
                  key={`${entry.category}-${index}`}
                  fill={chartColors[index % chartColors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={{
                backgroundColor: "#111827",
                borderRadius: 8,
                border: "1px solid #1f2937",
              }}
              itemStyle={{ color: "#f9fafb" }}
            />
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
              <tspan className="fill-white text-lg font-semibold">
                {formatCurrency(total)}
              </tspan>
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 space-y-2">
        {summary.byCategory.map((item, index) => {
          const percent = total > 0 ? (item.total / total) * 100 : 0;

          return (
            <div
              key={`${item.category}-${index}`}
              className="flex items-center justify-between text-sm text-gray-200"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      chartColors[index % chartColors.length],
                  }}
                />
                <span>{item.category}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="tabular-nums text-gray-200">
                  {formatCurrency(item.total)}
                </span>
                <span className="w-8 text-right text-gray-500">{percent.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
