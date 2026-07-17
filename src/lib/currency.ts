export type CurrencyCode = "USD" | "EUR" | "CNY" | "JPY" | "GBP";

export const DEFAULT_CURRENCY: CurrencyCode = "EUR";

export const CURRENCY_OPTIONS: { code: CurrencyCode; symbol: string; label: string }[] = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "CNY", symbol: "¥", label: "Chinese Yuan" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "GBP", symbol: "£", label: "British Pound" },
];

// Currencies with no minor unit (whole-number amounts only).
const ZERO_DECIMAL_CURRENCIES = new Set<CurrencyCode>(["JPY"]);

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): string {
  const fractionDigits = ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(safeAmount);
}

export function getCurrencyOptionLabel(code: CurrencyCode): string {
  const option = CURRENCY_OPTIONS.find((entry) => entry.code === code);
  // CNY and JPY share the "¥" symbol, so include the code + name to disambiguate.
  return option ? `${option.code} · ${option.label} (${option.symbol})` : code;
}

export function isValidCurrency(value: string): value is CurrencyCode {
  return CURRENCY_OPTIONS.some((option) => option.code === value);
}
