const SUMMARY_READ_MORE_THRESHOLD = 180;

const INSIGHT_KEYWORDS = ["practical tip", "allocate", "recommend", "suggestion"];

export function formatWeekRange(start: string, end: string): string {
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

export function formatGeneratedDate(value: string): string {
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

export function isSummaryTruncatable(text: string): boolean {
  return text.trim().length > SUMMARY_READ_MORE_THRESHOLD;
}

export function extractSummaryInsight(text: string): string | null {
  const normalized = text.replace(/\n+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  const sentences = normalized.split(/(?<=[.!?])\s+/);
  const found = sentences.find((sentence) => {
    const lower = sentence.toLowerCase();
    return INSIGHT_KEYWORDS.some((keyword) => lower.includes(keyword));
  });

  return found?.trim() ?? null;
}
