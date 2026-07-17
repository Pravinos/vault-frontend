"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  RefreshCw,
  ScrollText,
  Trash2,
  Settings,
} from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import ErrorMessage from "@/components/ui/ErrorMessage";
import SummaryTextExpandable from "@/components/summaries/SummaryTextExpandable";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import { useGenerateSummary } from "@/lib/hooks/useGenerateSummary";
import { useFormatCurrency } from "@/lib/currencyContext";
import type { WeeklySummary } from "@/types";
import { useSummaries } from "@/lib/hooks/useSummaries";
import { useDeleteSummary } from "@/lib/hooks/useSummaryMutations";
import EmptyState from "@/components/ui/EmptyState";
import ProviderModelInfo from "@/components/ui/ProviderModelInfo";
import { formatGeneratedDate, formatWeekRange } from "@/lib/summaryFormatting";

type SummaryItemProps = {
  summary: WeeklySummary;
  index: number;
  isDeleting: boolean;
  deleteDisabled: boolean;
  isPendingConfirm: boolean;
  onDeleteClick: (id: string) => void;
};

function SummaryItem({
  summary,
  index,
  isDeleting,
  deleteDisabled,
  isPendingConfirm,
  onDeleteClick,
}: SummaryItemProps) {
  const formatCurrency = useFormatCurrency();

  return (
    <article
      className="group animate-card-enter rounded-card-lg border border-border bg-surface-raised p-card-sm transition-[border-color,box-shadow] duration-modal ease-standard sm:p-card-md"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-emerald-400">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-base font-semibold text-white">
                {formatWeekRange(summary.weekStart, summary.weekEnd)}
              </h2>
              <ProviderModelInfo provider={summary.provider} model={summary.model} alwaysVisible />
            </div>
            <p className="mt-0.5 text-xs text-gray-500">Generated {formatGeneratedDate(summary.generatedAt)}</p>
          </div>
        </div>
        <button
          type="button"
          disabled={deleteDisabled}
          onClick={() => onDeleteClick(summary.id)}
          className={`btn-interactive inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            isPendingConfirm
              ? "bg-red-500/20 text-red-300"
              : "text-gray-400 hover:bg-red-500/10 hover:text-red-300"
          } disabled:cursor-not-allowed disabled:opacity-60`}
          title={isPendingConfirm ? "Click again to confirm delete" : "Delete summary"}
          aria-label={
            isDeleting
              ? "Deleting summary"
              : isPendingConfirm
                ? "Confirm delete summary"
                : "Delete weekly summary"
          }
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {isDeleting ? "Deleting..." : isPendingConfirm ? "Confirm" : "Delete"}
          </span>
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface-sunken px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Total spent this week</span>
        <p className="mt-1 text-xl font-semibold tabular-nums text-white">{formatCurrency(summary.totalSpent)}</p>
      </div>

      {summary.summaryText?.trim() ? (
        <SummaryTextExpandable text={summary.summaryText} />
      ) : null}
    </article>
  );
}

export default function WeeklySummariesPage() {
  const [deleteToast, setDeleteToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const { handleDelete: confirmDelete, isPendingConfirm } = useConfirmDelete();

  const { data: summaries = [], isLoading, error, refetch } = useSummaries();
  const deleteSummaryMutation = useDeleteSummary();
  const { generate, isGenerating, toast, clearToast } = useGenerateSummary();

  const isDeletingAny = deleteSummaryMutation.isPending;

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
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Weekly Summaries</h1>
          <p className="mt-1 text-sm text-gray-500">
            AI-generated recaps of your spending, trends, and tips each week.
          </p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={isGenerating}
          className="btn-interactive inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-gray-200 hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`} />
          {isGenerating ? "Generating..." : "Generate now"}
        </button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton variant="card" className="h-44 rounded-card-lg" />
            <Skeleton variant="card" className="h-44 rounded-card-lg" />
            <Skeleton variant="card" className="h-44 rounded-card-lg" />
          </div>
        ) : error ? (
          <ErrorMessage message="Unable to load weekly summaries." onRetry={() => void refetch()} />
        ) : summaries.length > 0 ? (
          <div className="space-y-4">
            {summaries.map((summary, index) => (
              <SummaryItem
                key={summary.id}
                summary={summary}
                index={index}
                isDeleting={isDeletingAny && deleteSummaryMutation.variables === summary.id}
                deleteDisabled={isDeletingAny}
                isPendingConfirm={isPendingConfirm(summary.id)}
                onDeleteClick={handleDeleteSummary}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ScrollText}
            title="No summaries yet"
            description="Generate your first weekly recap to see spending highlights, trends, and actionable tips based on your real data."
            action={{
              label: isGenerating ? "Generating..." : "Generate your first summary",
              onClick: generate,
              disabled: isGenerating,
            }}
          />
        )}
      </div>

      {!isLoading && !error ? (
        <p className="text-center text-xs text-gray-600">
          Summaries use your configured AI provider.{" "}
          <Link href="/settings" className="inline-flex items-center gap-1 text-emerald-400/80 hover:text-emerald-300">
            <Settings className="h-3 w-3" />
            AI settings
          </Link>
        </p>
      ) : null}

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
