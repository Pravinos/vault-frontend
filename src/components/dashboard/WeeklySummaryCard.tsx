"use client";

import { formatDate } from "@/lib/utils";
import type { WeeklySummary } from "@/types";

type WeeklySummaryCardProps = {
  summary: WeeklySummary | null;
};

const formatIsoDate = (value: string) => formatDate(value.slice(0, 10));

export default function WeeklySummaryCard({
  summary,
}: WeeklySummaryCardProps) {
  if (!summary) {
    return (
      <div className="rounded-xl bg-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white">Weekly Summary</h2>
        <p className="mt-4 text-sm text-gray-400">
          No summary yet. Check back Monday.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gray-800 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Weekly Summary</h2>
          <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-200">
            {summary.provider}
          </span>
        </div>
        <p className="text-sm text-gray-400">
          {formatIsoDate(summary.weekStart)} - {formatIsoDate(summary.weekEnd)}
        </p>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm text-gray-200">
        {summary.summaryText}
      </p>

      <p className="mt-6 text-xs text-gray-400">
        Generated at {formatIsoDate(summary.generatedAt)}
      </p>
    </div>
  );
}
