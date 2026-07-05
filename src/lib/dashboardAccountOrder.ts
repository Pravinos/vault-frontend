import type { AccountDashboardData } from "@/types/dashboard";

export const DASHBOARD_ACCOUNT_ORDER_KEY = "vault:dashboard:accountOrder";

export function readDashboardAccountOrder(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(DASHBOARD_ACCOUNT_ORDER_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

export function writeDashboardAccountOrder(ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DASHBOARD_ACCOUNT_ORDER_KEY, JSON.stringify(ids));
}

export function sortAccountsByDashboardOrder(
  accounts: AccountDashboardData[],
  storedOrder: string[],
): AccountDashboardData[] {
  if (storedOrder.length === 0 || accounts.length === 0) return accounts;

  const byId = new Map(accounts.map((account) => [account.id, account]));
  const ordered: AccountDashboardData[] = [];
  const seen = new Set<string>();

  for (const id of storedOrder) {
    const account = byId.get(id);
    if (!account) continue;
    ordered.push(account);
    seen.add(id);
  }

  for (const account of accounts) {
    if (!seen.has(account.id)) {
      ordered.push(account);
    }
  }

  return ordered;
}
