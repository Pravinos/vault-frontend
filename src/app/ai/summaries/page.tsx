"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ScrollText,
  Trash2,
  Lightbulb,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import { deleteWeeklySummary, getWeeklySummaries, fetchDashboard, getAccounts } from "@/lib/api";
import { useGenerateSummary } from "@/lib/hooks/useGenerateSummary";
import { formatCurrency } from "@/lib/utils";
import type { WeeklySummary, Account } from "@/types";
import type { DashboardData } from "@/types/dashboard";

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
  dashboard?: DashboardData | null;
  accounts?: Account[] | null;
};

function SummaryItem({ summary, isDeleting, isPendingConfirm, onDeleteClick, dashboard, accounts }: SummaryItemProps) {
  const [expanded, setExpanded] = useState(false);

  // Prefer authoritative values from dashboard when available.
  const metrics = [
    { key: "totalSpent", label: "Total Spent", value: summary.totalSpent },
    { key: "totalIncome", label: "Total Income", value: dashboard?.incomeThisMonth },
    { key: "netCashFlow", label: "Net Cash Flow", value: dashboard?.netCashFlow },
    { key: "topCategory", label: "Top Category", value: dashboard?.topExpenseCategory },
  ];

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

      {/* Key metrics row */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => {
          const isNumber = typeof m.value === "number";
          const display = isNumber ? formatCurrency(m.value as number) : m.value ? String(m.value) : "—";
          const labelClass = "text-[12px] text-gray-400 uppercase tracking-[0.05em]";
          const valueBase = "mt-1 text-[20px] font-semibold";
          const valueClass =
            m.key === "netCashFlow" && isNumber
              ? (Number(m.value) >= 0 ? `${valueBase} text-emerald-400` : `${valueBase} text-red-400`)
              : `${valueBase} text-white`;

          return (
            <div key={m.key} className="flex flex-col">
              <span className={labelClass}>{m.label}</span>
              <span className={valueClass}>{display}</span>
            </div>
          );
        })}
      </div>

      {/* Account / investment returns: show account name · assetType with context label */}
      {accounts && accounts.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {accounts
            .filter((a) => typeof a.returnPercentage === "number")
            .slice(0, 2)
            .map((a) => (
              <div key={a.id} className="rounded-md border border-white/6 bg-[#0f1720] p-2 text-sm text-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {a.name}{a.assetType ? ` · ${a.assetType}` : ""}
                    </div>
                    <div className="text-xs text-gray-400">Investment return this week</div>
                  </div>
                  <div className={`flex items-center gap-2 ${a.returnPercentage! >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {a.returnPercentage! >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    <div className="font-semibold">{a.returnPercentage!.toFixed(2)}%</div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      ) : null}

      <div className="mt-4">
        <p
          className="whitespace-normal text-sm leading-relaxed text-gray-200"
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
          {summary.summaryText?.trim()}
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
      {/* Highlighted insight (takeaway) moved after the narrative */}
      {(() => {
        const text = summary.summaryText ?? "";
        const sentences = text.replace(/\n+/g, " ").split(".");
        const keywords = ["practical tip", "allocate", "recommend", "suggestion"];
        const found = sentences.map((s) => s.trim()).find((s) => keywords.some((k) => s.toLowerCase().includes(k)));
        return found ? (
          <div className="mt-3 rounded-md border border-white/6 bg-white/3 p-3 text-sm text-gray-100">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-emerald-300">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div className="text-sm leading-tight">{found}</div>
            </div>
          </div>
        ) : null;
      })()}

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
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
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
        // Load summaries and dashboard in parallel; treat dashboard as optional
        const [summariesRes, dashboardRes, accountsRes] = await Promise.allSettled([
          getWeeklySummaries(),
          fetchDashboard(),
          getAccounts(),
        ]);

        if (!mounted) return;

        if (summariesRes.status === "fulfilled") {
          setSummaries(sortSummaries(summariesRes.value));
        } else {
          throw new Error("Unable to load weekly summaries.");
        }

        if (dashboardRes.status === "fulfilled") {
          setDashboard(dashboardRes.value);
        }

        if (accountsRes.status === "fulfilled") {
          setAccounts(accountsRes.value);
        }
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
                dashboard={dashboard}
                accounts={accounts}
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
