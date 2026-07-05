"use client";

import { ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { getAccountAccent, getAccountBadgeClasses } from "@/lib/accountColors";
import { formatCurrency } from "@/lib/utils";
import type { AccountType } from "@/types";

export interface AccountCardData {
  id: string;
  name: string;
  accountType: AccountType;
  calculatedBalance: number;
  openingBalance?: number;
  sinceOpening?: number;
  currentValue?: number | null;
  returnPercentage?: number | null;
}

interface AccountCardProps {
  account: AccountCardData;
  compact?: boolean;
  className?: string;
  staggerIndex?: number;
  footer?: ReactNode;
  details?: ReactNode;
  detailsDefaultOpen?: boolean;
  detailsOpen?: boolean;
  onDetailsOpenChange?: (open: boolean) => void;
}

// sync status removed — visual indicator handled elsewhere if needed

function getSinceOpening(account: AccountCardData): number {
  if (typeof account.sinceOpening === "number") {
    return account.sinceOpening;
  }
  const opening = typeof account.openingBalance === "number" ? account.openingBalance : 0;
  return account.calculatedBalance - opening;
}

function formatSignedCurrency(value: number): string {
  const absolute = formatCurrency(Math.abs(value));
  if (value > 0) return `+${absolute}`;
  if (value < 0) return `-${absolute}`;
  return `±${absolute}`;
}

function formatSignedPercent(value: number | null | undefined): string {
  const safeValue = value ?? 0;
  const fixed = Math.abs(safeValue).toFixed(2);
  if (safeValue > 0) return `+${fixed}%`;
  if (safeValue < 0) return `-${fixed}%`;
  return `±${fixed}%`;
}

export default function AccountCard({
  account,
  compact = false,
  className,
  staggerIndex,
  footer,
  details,
  detailsDefaultOpen = false,
  detailsOpen: controlledDetailsOpen,
  onDetailsOpenChange,
}: AccountCardProps) {
  const [internalDetailsOpen, setInternalDetailsOpen] = useState(detailsDefaultOpen);
  const isControlled = controlledDetailsOpen !== undefined;
  const detailsOpen = isControlled ? controlledDetailsOpen : internalDetailsOpen;
  const isInvestment = account.accountType === "INVESTMENT";

  const toggleDetails = () => {
    const next = !detailsOpen;
    if (isControlled) {
      onDetailsOpenChange?.(next);
      return;
    }
    setInternalDetailsOpen(next);
  };

  const primaryBalance = isInvestment ? account.currentValue ?? 0 : account.calculatedBalance;
  const sinceOpening = getSinceOpening(account);
  const microPositive = isInvestment ? (account.returnPercentage ?? 0) >= 0 : sinceOpening >= 0;
  const microText = useMemo(() => {
    if (isInvestment) {
      return `${formatSignedPercent(account.returnPercentage)} return`;
    }
    return `${formatSignedCurrency(sinceOpening)} since opening`;
  }, [account.returnPercentage, isInvestment, sinceOpening]);
  const showDetailsToggle = Boolean(details);

  return (
    <div
      className={`animate-card-enter rounded-card border border-gray-800 border-l-4 ${getAccountAccent(account.accountType)} bg-[#1a2332] p-card-sm ${
        className ?? ""
      }`.trim()}
      style={staggerIndex !== undefined ? { animationDelay: `${staggerIndex * 50}ms` } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-sm font-semibold text-white">{account.name}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span
            className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getAccountBadgeClasses(account.accountType)}`}
          >
            {account.accountType}
          </span>
        </div>
      </div>

      <div className={compact ? "mt-2" : "mt-3"}>
        <p className={`font-bold tabular-nums text-white ${compact ? "text-xl" : "text-3xl"}`}>
          {formatCurrency(primaryBalance)}
        </p>
      </div>

      <div
        className={`mt-2 flex items-center gap-1.5 text-xs ${microPositive ? "text-emerald-400" : "text-red-400"}`}
      >
        {microPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
        <span>{microText}</span>
      </div>

      {footer ? <div className="mt-3">{footer}</div> : null}

      {showDetailsToggle ? (
        <div className="mt-3 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={toggleDetails}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-300 transition-colors hover:text-white"
            aria-expanded={detailsOpen}
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ease-in-out ${
                detailsOpen ? "rotate-180" : ""
              }`}
            />
            {detailsOpen ? "Hide details" : "Show details"}
          </button>
          <div
            className={`grid transition-all duration-200 ease-in-out ${
              detailsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="mt-3">{details}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
