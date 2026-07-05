import type { AccountType } from "@/types";

const ACCOUNT_ACCENT: Record<AccountType, string> = {
  CHECKING: "border-l-emerald-400",
  SAVINGS: "border-l-blue-400",
  INVESTMENT: "border-l-violet-400",
};

const ACCOUNT_BADGE: Record<AccountType, string> = {
  CHECKING: "bg-emerald-500/10 text-emerald-400",
  SAVINGS: "bg-blue-500/10 text-blue-400",
  INVESTMENT: "bg-violet-500/10 text-violet-400",
};

const DEFAULT_TYPE: AccountType = "CHECKING";

/** Left-border accent class for account cards and list rows. */
export function getAccountAccent(type: AccountType): string {
  return ACCOUNT_ACCENT[type] ?? ACCOUNT_ACCENT[DEFAULT_TYPE];
}

/** Pill badge classes for account type labels. */
export function getAccountBadgeClasses(type: AccountType): string {
  return ACCOUNT_BADGE[type] ?? ACCOUNT_BADGE[DEFAULT_TYPE];
}
