import type { BudgetResponse, BudgetSummaryItem } from "@/types/budget";

export const HIGHLIGHTED_BUDGETS_KEY = "vault-highlighted-budget-ids-v2";
export const HIGHLIGHTED_BUDGETS_CHANGED_EVENT = "vault-highlighted-budgets-changed";
export const MAX_HIGHLIGHTED_BUDGETS = 3;

type HighlightStore = Record<string, number[]>;

function readHighlightStore(): HighlightStore {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(HIGHLIGHTED_BUDGETS_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const store: HighlightStore = {};
    for (const [month, ids] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(ids)) continue;
      store[month] = ids.filter((id): id is number => typeof id === "number");
    }
    return store;
  } catch {
    return {};
  }
}

function writeHighlightStore(store: HighlightStore): void {
  localStorage.setItem(HIGHLIGHTED_BUDGETS_KEY, JSON.stringify(store));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(HIGHLIGHTED_BUDGETS_CHANGED_EVENT));
  }
}

export function readHighlightedBudgetIds(month: string): number[] {
  if (!month) return [];
  return (readHighlightStore()[month] ?? []).slice(0, MAX_HIGHLIGHTED_BUDGETS);
}

export function writeHighlightedBudgetIds(month: string, ids: number[]): void {
  if (!month) return;

  const store = readHighlightStore();
  store[month] = ids.slice(0, MAX_HIGHLIGHTED_BUDGETS);
  writeHighlightStore(store);
}

export function mergeBudgetSummaryItems(
  budgets: BudgetResponse[],
  summary: BudgetSummaryItem[]
): BudgetSummaryItem[] {
  if (budgets.length === 0) return [];

  const summaryByCategoryId = new Map(summary.map((item) => [item.categoryId, item]));

  return budgets.map((budget) => {
    const existing = summaryByCategoryId.get(budget.categoryId);
    if (existing) return existing;

    return {
      categoryId: budget.categoryId,
      categoryName: budget.categoryName,
      categoryIcon: budget.categoryIcon,
      budgetAmount: budget.amount,
      spentAmount: 0,
      remainingAmount: budget.amount,
      percentageUsed: 0,
      status: "ON_TRACK",
    };
  });
}

export function toggleHighlightedBudgetId(
  month: string,
  categoryId: number,
  currentIds: number[]
): { ids: number[]; error?: "limit" } {
  if (currentIds.includes(categoryId)) {
    const ids = currentIds.filter((id) => id !== categoryId);
    writeHighlightedBudgetIds(month, ids);
    return { ids };
  }

  if (currentIds.length >= MAX_HIGHLIGHTED_BUDGETS) {
    return { ids: currentIds, error: "limit" };
  }

  const ids = [...currentIds, categoryId];
  writeHighlightedBudgetIds(month, ids);
  return { ids };
}

export function resolveDashboardBudgets(
  all: BudgetSummaryItem[],
  storedIds: number[]
): BudgetSummaryItem[] {
  if (all.length === 0) return [];
  if (all.length <= MAX_HIGHLIGHTED_BUDGETS) return all;

  const byCategoryId = new Map(all.map((item) => [item.categoryId, item]));
  return storedIds
    .filter((id) => byCategoryId.has(id))
    .map((id) => byCategoryId.get(id)!)
    .slice(0, MAX_HIGHLIGHTED_BUDGETS);
}

export function sortedCategoryIdsKey(categoryIds: number[]): string {
  return [...categoryIds].sort((a, b) => a - b).join(",");
}
