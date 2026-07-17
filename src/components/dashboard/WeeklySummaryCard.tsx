"use client";

import Link from "next/link";
import { Calendar, ChevronRight, RefreshCw } from "lucide-react";

import ProviderModelInfo from "@/components/ui/ProviderModelInfo";
import SummaryTextExpandable from "@/components/summaries/SummaryTextExpandable";
import Toast from "@/components/ui/Toast";
import { useGenerateSummary } from "@/lib/hooks/useGenerateSummary";
import { formatWeekRange } from "@/lib/summaryFormatting";
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

export default function WeeklySummaryCard({ summary, onGenerated }: WeeklySummaryCardProps) {
  const { generate, isGenerating, toast, clearToast } = useGenerateSummary((nextSummary) => {
    onGenerated?.(nextSummary);
  });

  if (!summary) {
    return (
      <>
        <div className="animate-card-enter flex flex-col rounded-card-lg border-l-4 border-emerald-500/60 bg-surface-raised p-card-md xl:h-full">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Weekly Summary</h2>
          </div>

          <p className="mt-4 text-sm font-medium text-gray-200">No summary yet</p>
          <p className="mt-1 text-sm text-gray-400">Next summary: {getNextMondayLabel()}</p>

          <div className="mt-5 xl:mt-auto xl:pt-5">
            <button
              type="button"
              onClick={generate}
              disabled={isGenerating}
              className="btn-interactive inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
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
      <div className="group animate-card-enter flex flex-col rounded-card-lg border-l-4 border-emerald-500/60 bg-surface-raised p-card-md xl:h-full">
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

        <SummaryTextExpandable
          text={summary.summaryText ?? ""}
          showInsight={false}
          className="mt-4"
        />

        <div className="mt-3 text-sm text-gray-400">{formatWeekRange(summary.weekStart, summary.weekEnd)}</div>

        <div className="mt-4 flex items-center justify-between pt-3 xl:mt-auto">
          <Link
            href="/ai/summaries"
            className="btn-interactive inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
          >
            View history
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <ProviderModelInfo provider={summary.provider} model={summary.model} />
        </div>
      </div>

      {toast ? <Toast message={toast.message} type={toast.type} onClose={clearToast} /> : null}
    </>
  );
}
