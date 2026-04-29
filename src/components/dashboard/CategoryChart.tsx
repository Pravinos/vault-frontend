"use client";

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

  return (
    <div className="rounded-xl bg-gray-800 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">
          Spending by category
        </h2>
        <p className="text-sm text-gray-400">{formatMonth(summary.month)}</p>
      </div>

      <div className="mt-6 h-64 min-w-[200px] min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={summary.byCategory}
              dataKey="total"
              nameKey="category"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
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
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      chartColors[index % chartColors.length],
                  }}
                />
                <span>{item.category}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="text-gray-200">
                  {formatCurrency(item.total)}
                </span>
                <span>{percent.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
