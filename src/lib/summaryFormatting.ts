const SUMMARY_READ_MORE_THRESHOLD = 180;
export const SUMMARY_COLLAPSED_LINE_CLAMP = 4;

const INSIGHT_KEYWORDS = ["practical tip", "allocate", "recommend", "suggestion"];

function parseDateOnlyUtc(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function formatWeekRange(start: string, end: string): string {
  const startDate = parseDateOnlyUtc(start);
  const endDate = parseDateOnlyUtc(end);

  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
    return `Week of ${start} - ${end}`;
  }

  const dateOptions: Intl.DateTimeFormatOptions = { timeZone: "UTC" };

  const startLabel = startDate.toLocaleDateString("en-US", {
    ...dateOptions,
    month: "short",
    day: "numeric",
  });
  const endLabel = endDate.toLocaleDateString("en-US", {
    ...dateOptions,
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
  const trimmed = text.trim();
  if (!trimmed) return false;

  const lineCount = trimmed.split("\n").length;
  return lineCount > SUMMARY_COLLAPSED_LINE_CLAMP || trimmed.length > SUMMARY_READ_MORE_THRESHOLD;
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
