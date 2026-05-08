export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
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

export function getCurrentTimestamp(): number {
  return Date.now();
}

export const categoryColorMap: Record<string, string> = {
  Groceries: "bg-rose-100 text-rose-700",
  Rent: "bg-indigo-100 text-indigo-700",
  Utilities: "bg-yellow-100 text-yellow-700",
  Travel: "bg-emerald-100 text-emerald-700",
  Entertainment: "bg-violet-100 text-violet-700",
  Income: "bg-green-100 text-green-700",
};
