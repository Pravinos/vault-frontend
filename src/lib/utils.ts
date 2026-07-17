import type { CurrencyCode } from "@/lib/currency";
import { DEFAULT_CURRENCY, formatCurrency } from "@/lib/currency";

export { formatCurrency } from "@/lib/currency";
export type { CurrencyCode } from "@/lib/currency";

export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";

  // A bare date-only string (YYYY-MM-DD) is parsed by `new Date()` as UTC
  // midnight, which renders as the *previous* day in negative-offset timezones
  // (the Americas). Anchor it to local midnight so the calendar day is correct.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  let date = new Date(isDateOnly ? `${dateStr}T00:00:00` : dateStr);

  if (Number.isNaN(date.getTime())) {
    date = new Date(`${dateStr}T00:00:00`);
  }

  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}
export function formatMonth(monthStr: string): string {
  if (!monthStr) return "";
  const parts = monthStr.split("-");
  if (parts.length !== 2) return monthStr;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return monthStr;

  const d = new Date(year, month - 1, 1);
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

export function getMonthString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** YYYY-MM-DD in the user's local timezone (not UTC). */
export function getLocalDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getCurrentTimestamp(): number {
  return Date.now();
}

export type GoalPaceKind = "reached" | "overdue" | "pace";

export interface GoalPace {
  kind: GoalPaceKind;
  message: string;
}

/** Suggested savings pace for a goal, based on target, current saved amount, and days left. */
export function getGoalPace(
  target: number,
  current: number,
  daysLeft: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): GoalPace {
  const remainingAmount = target - current;

  if (remainingAmount <= 0) {
    return { kind: "reached", message: "Goal reached 🎉" };
  }

  if (daysLeft <= 0) {
    return {
      kind: "overdue",
      message: `Target date passed — ${formatCurrency(remainingAmount, currency)} still needed`,
    };
  }

  const useWeekly = daysLeft < 90;
  const pace = useWeekly
    ? remainingAmount / (daysLeft / 7)
    : remainingAmount / (daysLeft / 30.44);
  const roundedPace = Math.round(pace);

  const message = useWeekly
    ? `Save ~${formatCurrency(roundedPace, currency)}/week to hit this on time`
    : `Save ~${formatCurrency(roundedPace, currency)}/month to hit this on time`;

  return { kind: "pace", message };
}

export const categoryColorMap: Record<string, string> = {
  Groceries: "bg-rose-100 text-rose-700",
  Rent: "bg-indigo-100 text-indigo-700",
  Utilities: "bg-yellow-100 text-yellow-700",
  Travel: "bg-emerald-100 text-emerald-700",
  Entertainment: "bg-violet-100 text-violet-700",
  Income: "bg-green-100 text-green-700",
};
