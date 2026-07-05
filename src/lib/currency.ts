export type CurrencyCode = "USD" | "EUR" | "CNY" | "JPY" | "GBP";

export const DEFAULT_CURRENCY: CurrencyCode = "EUR";

export const CURRENCY_OPTIONS: { code: CurrencyCode; symbol: string }[] = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "CNY", symbol: "¥" },
  { code: "JPY", symbol: "¥" },
  { code: "GBP", symbol: "£" },
];

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getCurrencyOptionLabel(code: CurrencyCode): string {
  const option = CURRENCY_OPTIONS.find((entry) => entry.code === code);
  return option ? `${option.code} (${option.symbol})` : code;
}

export function isValidCurrency(value: string): value is CurrencyCode {
  return CURRENCY_OPTIONS.some((option) => option.code === value);
}
