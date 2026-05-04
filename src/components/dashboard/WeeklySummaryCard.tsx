"use client";

import Link from "next/link";
import { Calendar, RefreshCw } from "lucide-react";

import ProviderBadge from "@/components/ui/ProviderBadge";
import Toast from "@/components/ui/Toast";
import { useGenerateSummary } from "@/lib/hooks/useGenerateSummary";
import type { WeeklySummary } from "@/types";

type WeeklySummaryCardProps = {
  summary: WeeklySummary | null;
  onGenerated?: (summary: WeeklySummary) => void;
};

function getNextMondayLabel(): string {
  const today = new Date();
  const day = today.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntilMonday);

  return next.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatWeekRange(start: string, end: string): string {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
    return `Week of ${start} - ${end}`;
  }

  const startLabel = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `Week of ${startLabel} - ${endLabel}`;
}

export default function WeeklySummaryCard({ summary, onGenerated }: WeeklySummaryCardProps) {
  const { generate, isGenerating, toast, clearToast } = useGenerateSummary((nextSummary) => {
    onGenerated?.(nextSummary);
  });

  if (!summary) {
    return (
      <>
        <div className="flex h-full flex-col rounded-xl border-l-4 border-emerald-500/60 bg-gray-800 p-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Weekly Summary</h2>
          </div>

          <p className="mt-4 text-sm font-medium text-gray-200">No summary yet</p>
          <p className="mt-1 text-sm text-gray-400">Next summary: {getNextMondayLabel()}</p>

          <div className="mt-5">
            <button
              type="button"
              onClick={generate}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 transition-all duration-150 hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 active:scale-95"
            >
              <RefreshCw className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
              {isGenerating ? "Generating..." : "Generate now"}
            </button>
          </div>
        </div>

        {toast ? <Toast message={toast.message} type={toast.type} onClose={clearToast} /> : null}
      </>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col rounded-xl border-l-4 border-emerald-500/60 bg-gray-800 p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Weekly Summary</h2>
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={isGenerating}
            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-700/70 hover:text-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Regenerate weekly summary"
            title={isGenerating ? "Generating..." : "Regenerate"}
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
          {summary.summaryText}
        </div>

        <div className="mt-4 text-sm text-gray-400">{formatWeekRange(summary.weekStart, summary.weekEnd)}</div>

        <div className="mt-auto flex items-end justify-between pt-5">
          <Link
            href="/ai/summaries"
            className="text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
          >
            View history -&gt;
          </Link>
          <ProviderBadge provider={summary.provider} model={summary.model} />
        </div>
      </div>

      {toast ? <Toast message={toast.message} type={toast.type} onClose={clearToast} /> : null}
    </>
  );
}
