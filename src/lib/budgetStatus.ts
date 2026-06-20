import type { BudgetSummaryItem } from "@/types/budget";

export function statusBarColor(status: BudgetSummaryItem["status"]) {
  switch (status) {
    case "ON_TRACK":
      return "bg-teal-400";
    case "WARNING":
      return "bg-amber-400";
    case "OVER_BUDGET":
      return "bg-rose-500";
  }
}

export function statusBadgeClasses(status: BudgetSummaryItem["status"]) {
  switch (status) {
    case "ON_TRACK":
      return "bg-teal-500/15 text-teal-300";
    case "WARNING":
      return "bg-amber-500/15 text-amber-300";
    case "OVER_BUDGET":
      return "bg-rose-500/15 text-rose-300";
  }
}

export function statusLabel(status: BudgetSummaryItem["status"]) {
  switch (status) {
    case "ON_TRACK":
      return "On track";
    case "WARNING":
      return "Warning";
    case "OVER_BUDGET":
      return "Over budget";
  }
}

export function isValidBudgetAmount(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/** Match backend money-level status thresholds for aggregate totals. */
export function aggregateBudgetStatus(
  spentAmount: number,
  budgetAmount: number
): BudgetSummaryItem["status"] {
  if (budgetAmount <= 0) return "ON_TRACK";
  if (spentAmount >= budgetAmount) return "OVER_BUDGET";
  if (spentAmount >= budgetAmount * 0.8) return "WARNING";
  return "ON_TRACK";
}
