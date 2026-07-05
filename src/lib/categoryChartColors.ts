/** Shared palette for category donut charts and matching list indicators. */
export const CATEGORY_CHART_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f43f5e",
  "#64748b",
  "#34d399",
  "#60a5fa",
] as const;

export function getCategoryChartColor(index: number): string {
  return CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length];
}
