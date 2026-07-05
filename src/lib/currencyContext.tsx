"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  formatCurrency,
  isValidCurrency,
  type CurrencyCode,
} from "@/lib/currency";

const STORAGE_KEY = "vault-display-currency";

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidCurrency(stored)) {
      setCurrencyState(stored);
    }
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);
  }, []);

  const value = useMemo(() => ({ currency, setCurrency }), [currency, setCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

export function useFormatCurrency() {
  const { currency } = useCurrency();
  return useMemo(
    () => (amount: number) => formatCurrency(amount, currency),
    [currency],
  );
}

export {
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  formatCurrency,
  getCurrencyOptionLabel,
  type CurrencyCode,
} from "@/lib/currency";
