export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IE", {
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
  const date = new Date(`${monthStr}-01T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function getMonthString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

export const categoryColorMap: Record<string, string> = {
  Food: "bg-orange-100 text-orange-700",
  Transport: "bg-blue-100 text-blue-700",
  Housing: "bg-purple-100 text-purple-700",
  Entertainment: "bg-pink-100 text-pink-700",
  Health: "bg-green-100 text-green-700",
  Shopping: "bg-yellow-100 text-yellow-700",
  Travel: "bg-sky-100 text-sky-700",
  Other: "bg-gray-100 text-gray-700",
};
