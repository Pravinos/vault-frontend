"use client";

import { Calendar, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";

import { formatDate } from "@/lib/utils";
import { generateWeeklySummary } from "@/lib/api";
import type { WeeklySummary } from "@/types";

type WeeklySummaryCardProps = {
  summary: WeeklySummary | null;
  onGenerated?: (summary: WeeklySummary) => void;
};

const formatIsoDate = (value: string) => formatDate(value.slice(0, 10));

function getRelativeGeneratedLabel(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return `Generated ${formatIsoDate(value)}`;
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTarget = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diffDays = Math.floor(
    (startOfToday.getTime() - startOfTarget.getTime()) / 86400000
  );

  if (diffDays <= 0) return "Generated today";
  if (diffDays === 1) return "Generated 1 day ago";
  if (diffDays < 7) return `Generated ${diffDays} days ago`;
  return `Generated ${formatIsoDate(value)}`;
}

function getNextMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const next = new Date(today);
  next.setDate(today.getDate() + daysUntilMonday);
  return next.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export default function WeeklySummaryCard({
  summary,
  onGenerated,
}: WeeklySummaryCardProps) {
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const result = await generateWeeklySummary();
      onGenerated?.(result);
    } catch {
      setGenerateError("Unable to generate summary.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary.summaryText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  if (!summary) {
    return (
      <div className="rounded-xl bg-gray-800 p-6 border-l-4 border-emerald-500/60 h-full">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-white">Weekly Summary</h2>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          Next summary generates on{" "}
          <span className="text-gray-300">{getNextMonday()}</span>.
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Or generate one now to see this week's overview.
        </p>
        {generateError ? (
          <p className="mt-2 text-xs text-red-400">{generateError}</p>
        ) : null}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="mt-4 flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 transition-all duration-150 hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 active:scale-95"
        >
          <RefreshCw
            className={`h-3 w-3 ${generating ? "animate-spin" : ""}`}
          />
          {generating ? "Generating..." : "Generate now"}
        </button>
      </div>
    );
  }

  const providerLabel = summary.model
    ? `${summary.provider} · ${summary.model}`
    : summary.provider;

  return (
    <div className="rounded-xl bg-gray-800 p-6 border-l-4 border-emerald-500/60 h-full">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Weekly Summary</h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-200"
              title={providerLabel}
            >
              {summary.provider}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md p-1 text-gray-400 transition-colors hover:text-gray-200"
              aria-label="Copy summary"
              title={copied ? "Copied" : "Copy summary"}
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-400">
          {formatIsoDate(summary.weekStart)} –{" "}
          {formatIsoDate(summary.weekEnd)}
        </p>
      </div>

      <div className="mt-4 whitespace-pre-wrap text-sm text-gray-200 leading-relaxed">
        {summary.summaryText}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {getRelativeGeneratedLabel(summary.generatedAt)}
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition-all duration-150 hover:border-gray-500 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-60 active:scale-95"
        >
          <RefreshCw
            className={`h-3 w-3 ${generating ? "animate-spin" : ""}`}
          />
          {generating ? "Generating..." : "Regenerate"}
        </button>
      </div>
      {generateError ? (
        <p className="mt-2 text-xs text-red-400">{generateError}</p>
      ) : null}
    </div>
  );
}

