"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import {
  extractSummaryInsight,
  isSummaryTruncatable,
  SUMMARY_COLLAPSED_LINE_CLAMP,
} from "@/lib/summaryFormatting";

type SummaryTextExpandableProps = {
  text: string;
  showInsight?: boolean;
  className?: string;
};

export default function SummaryTextExpandable({
  text,
  showInsight = true,
  className,
}: SummaryTextExpandableProps) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const summaryText = text.trim();

  const canTruncate = isSummaryTruncatable(summaryText);
  const isOpen = expanded || !canTruncate;
  const insight = showInsight && canTruncate ? extractSummaryInsight(summaryText) : null;

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    setContentHeight(node.scrollHeight);
  }, [summaryText, expanded, canTruncate]);

  if (!summaryText) {
    return null;
  }

  return (
    <div className={className ?? "mt-4"}>
      <div
        className="overflow-hidden transition-[max-height] duration-modal ease-standard motion-reduce:transition-none"
        style={{ maxHeight: contentHeight ?? undefined }}
      >
        <div ref={contentRef}>
          <p
            className="whitespace-normal text-sm leading-relaxed text-gray-200"
            style={
              isOpen
                ? undefined
                : {
                    display: "-webkit-box",
                    WebkitLineClamp: SUMMARY_COLLAPSED_LINE_CLAMP,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }
            }
          >
            {summaryText}
          </p>
        </div>
      </div>

      {canTruncate ? (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="btn-interactive mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Read less" : "Read more"}
        </button>
      ) : null}

      {insight ? (
        <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-gray-100">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 text-emerald-400">
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="text-sm leading-relaxed">{insight}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
