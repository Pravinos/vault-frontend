"use client";

import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ScrollText,
  Trash2,
  Lightbulb,
} from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import { useGenerateSummary } from "@/lib/hooks/useGenerateSummary";
import { formatCurrency } from "@/lib/utils";
import type { WeeklySummary } from "@/types";
import { useSummaries } from "@/lib/hooks/useSummaries";
import { useDeleteSummary } from "@/lib/hooks/useSummaryMutations";
import EmptyState from "@/components/ui/EmptyState";
import {
  extractSummaryInsight,
  formatGeneratedDate,
  formatWeekRange,
  isSummaryTruncatable,
} from "@/lib/summaryFormatting";

type SummaryItemProps = {
  summary: WeeklySummary;
  isDeleting: boolean;
  isPendingConfirm: boolean;
  onDeleteClick: (id: string) => void;
};

function SummaryItem({ summary, isDeleting, isPendingConfirm, onDeleteClick }: SummaryItemProps) {
  const [expanded, setExpanded] = useState(false);
  const summaryText = summary.summaryText?.trim() ?? "";
  const canTruncate = isSummaryTruncatable(summaryText);
  const insight = extractSummaryInsight(summaryText);

  return (
    <article className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-white">{formatWeekRange(summary.weekStart, summary.weekEnd)}</h2>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-400">Generated {formatGeneratedDate(summary.generatedAt)}</p>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onDeleteClick(summary.id)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              isPendingConfirm
                ? "bg-red-500/20 text-red-300"
                : "text-gray-400 hover:bg-red-500/10 hover:text-red-300"
            } disabled:cursor-not-allowed disabled:opacity-60`}
            title={isPendingConfirm ? "Click again to confirm delete" : "Delete summary"}
            aria-label="Delete weekly summary"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDeleting ? "Deleting..." : isPendingConfirm ? "Confirm" : "Delete"}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <span className="text-[12px] uppercase tracking-[0.05em] text-gray-400">Total Spent (this week)</span>
        <p className="mt-1 text-[20px] font-semibold text-white">{formatCurrency(summary.totalSpent)}</p>
      </div>

      {summaryText ? (
        <div className="mt-4">
          <p
            className="whitespace-normal text-sm leading-relaxed text-gray-200"
            style={
              expanded || !canTruncate
                ? undefined
                : {
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }
            }
          >
            {summaryText}
          </p>

          {canTruncate ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Read less" : "Read more"}
            </button>
          ) : null}
        </div>
      ) : null}

      {insight ? (
        <div className="mt-3 rounded-md border border-white/6 bg-white/3 p-3 text-sm text-gray-100">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-emerald-300">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div className="text-sm leading-tight">{insight}</div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-end">
        <div className="ml-4 flex-shrink-0">
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/3 px-2 py-0.5 text-[11px] font-medium text-gray-300">
            {summary.provider} / {summary.model}
          </span>
        </div>
      </div>
    </article>
  );
}

export default function WeeklySummariesPage() {
  const [deleteToast, setDeleteToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const { handleDelete: confirmDelete, isPendingConfirm } = useConfirmDelete();

  const { data: summaries = [], isLoading, error } = useSummaries();
  const deleteSummaryMutation = useDeleteSummary();
  const { generate, isGenerating, toast, clearToast } = useGenerateSummary();

  const handleDeleteSummary = (id: string) => {
    confirmDelete(id, async () => {
      try {
        await deleteSummaryMutation.mutateAsync(id);
        setDeleteToast({ message: "Weekly summary deleted", type: "success" });
      } catch {
        setDeleteToast({ message: "Unable to delete weekly summary", type: "error" });
      }
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Weekly Summaries</h1>
        <button
          type="button"
          onClick={generate}
          disabled={isGenerating}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-base font-medium text-gray-200 transition-all duration-150 hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`} />
          {isGenerating ? "Generating..." : "Generate now"}
        </button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton variant="card" className="h-44 rounded-xl" />
            <Skeleton variant="card" className="h-44 rounded-xl" />
            <Skeleton variant="card" className="h-44 rounded-xl" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">Unable to load weekly summaries.</div>
        ) : summaries.length > 0 ? (
          <div className="space-y-4">
            {summaries.map((summary) => (
              <SummaryItem
                key={summary.id}
                summary={summary}
                isDeleting={deleteSummaryMutation.isPending && deleteSummaryMutation.variables === summary.id}
                isPendingConfirm={isPendingConfirm(summary.id)}
                onDeleteClick={handleDeleteSummary}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ScrollText className="w-6 h-6" />}
            title="No summaries yet"
            description="Generate your first summary"
            actionLabel={
              <>
                <CalendarDays className="h-3.5 w-3.5" />
                {isGenerating ? " Generating..." : " Generate your first summary"}
              </>
            }
            onAction={generate}
            actionDisabled={isGenerating}
          />
        )}
      </div>

      {deleteToast ? (
        <Toast
          message={deleteToast.message}
          type={deleteToast.type}
          onClose={() => setDeleteToast(null)}
        />
      ) : null}
      {toast ? <Toast message={toast.message} type={toast.type} onClose={clearToast} /> : null}
    </div>
  );
}
