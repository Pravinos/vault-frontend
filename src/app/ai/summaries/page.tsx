"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ScrollText,
  Trash2,
} from "lucide-react";

import ProviderBadge from "@/components/ui/ProviderBadge";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import { deleteWeeklySummary, getWeeklySummaries } from "@/lib/api";
import { useGenerateSummary } from "@/lib/hooks/useGenerateSummary";
import { formatCurrency } from "@/lib/utils";
import type { WeeklySummary } from "@/types";

function formatWeekRange(start: string, end: string): string {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
    return `${start} - ${end}`;
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

function formatGeneratedDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sortSummaries(items: WeeklySummary[]): WeeklySummary[] {
  return [...items].sort(
    (a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
  );
}

type SummaryItemProps = {
  summary: WeeklySummary;
  isDeleting: boolean;
  isPendingConfirm: boolean;
  onDeleteClick: (id: string) => void;
};

function SummaryItem({ summary, isDeleting, isPendingConfirm, onDeleteClick }: SummaryItemProps) {
  const [expanded, setExpanded] = useState(false);

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

      <div className="mt-2">
        <ProviderBadge provider={summary.provider} model={summary.model} />
      </div>

      <div className="mt-4">
        <p
          className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200"
          style={
            expanded
              ? undefined
              : {
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }
          }
        >
          {summary.summaryText}
        </p>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Read less" : "Read more"}
        </button>
      </div>

      <p className="mt-4 text-sm text-gray-300">
        Total spent that week: <span className="font-medium text-white">{formatCurrency(summary.totalSpent)}</span>
      </p>
    </article>
  );
}

export default function WeeklySummariesPage() {
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteToast, setDeleteToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const { handleDelete: confirmDelete, isPendingConfirm } = useConfirmDelete();

  const { generate, isGenerating, toast, clearToast } = useGenerateSummary((summary) => {
    setSummaries((prev) => sortSummaries([summary, ...prev.filter((item) => item.id !== summary.id)]));
  });

  useEffect(() => {
    let mounted = true;

    const loadSummaries = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getWeeklySummaries();
        if (!mounted) {
          return;
        }
        setSummaries(sortSummaries(data));
      } catch {
        if (!mounted) {
          return;
        }
        setError("Unable to load weekly summaries.");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSummaries();

    return () => {
      mounted = false;
    };
  }, []);

  const hasSummaries = useMemo(() => summaries.length > 0, [summaries]);

  const handleDeleteSummary = (id: string) => {
    confirmDelete(id, async () => {
      setDeletingId(id);

      try {
        await deleteWeeklySummary(id);
        setSummaries((prev) => prev.filter((summary) => summary.id !== id));
        setDeleteToast({ message: "Weekly summary deleted", type: "success" });
      } catch {
        setDeleteToast({ message: "Unable to delete weekly summary", type: "error" });
      } finally {
        setDeletingId(null);
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
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
        ) : hasSummaries ? (
          <div className="space-y-4">
            {summaries.map((summary) => (
              <SummaryItem
                key={summary.id}
                summary={summary}
                isDeleting={deletingId === summary.id}
                isPendingConfirm={isPendingConfirm(summary.id)}
                onDeleteClick={handleDeleteSummary}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-gray-800 bg-gray-900/60 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-gray-300">
              <ScrollText className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">No summaries yet</h2>
            <p className="mt-2 text-sm text-gray-400">Generate your first summary</p>
            <button
              type="button"
              onClick={generate}
              disabled={isGenerating}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-xs font-medium text-gray-200 transition-all duration-150 hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {isGenerating ? "Generating..." : "Generate your first summary"}
            </button>
          </div>
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
