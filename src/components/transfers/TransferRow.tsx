"use client";

import React from "react";
import { ArrowRight, ArrowDown } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/currencyContext";

interface AccountSummary {
  name: string;
  balance?: number;
}

interface TransferRowProps {
  fromAccount: AccountSummary;
  toAccount: AccountSummary;
  amount: number;
  date: string;
  isReversal: boolean;
  onRevert?: () => void;
  note?: string | null;
  createdAt?: string | null;
}

export default function TransferRow({
  fromAccount,
  toAccount,
  amount,
  date,
  isReversal,
  onRevert,
  note,
  createdAt,
}: TransferRowProps) {
  const formatCurrency = useFormatCurrency();
  return (
    <div className="rounded-card border border-border bg-surface-raised p-3">
      <div className="relative flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 rounded-sm bg-surface-sunken p-3 border border-border">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">From</div>
          <div className="font-semibold text-white">{fromAccount.name}</div>
          {typeof fromAccount.balance === "number" ? (
            <div className="text-xs text-gray-400 mt-1">{formatCurrency(fromAccount.balance)}</div>
          ) : null}
        </div>

        <div className="flex flex-col items-center justify-center px-3">
          <div className="text-sm font-bold text-emerald-400 tabular-nums">{formatCurrency(amount)}</div>
          <div className="hidden sm:block mt-1">
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
          <div className="block sm:hidden mt-1">
            <ArrowDown className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="flex-1 rounded-sm bg-surface-sunken p-3 border border-border">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">To</div>
          <div className="font-semibold text-white">{toAccount.name}</div>
          {typeof toAccount.balance === "number" ? (
            <div className="text-xs text-gray-400 mt-1">{formatCurrency(toAccount.balance)}</div>
          ) : null}
        </div>

        {isReversal ? (
          <div className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full bg-yellow-600/10 px-2 py-1 text-xs font-medium text-yellow-300">
            Reversed
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {date ? (
            <p className="text-xs text-gray-400">
              Transfer date: <span className="text-gray-300">{formatDate(date)}</span>
            </p>
          ) : null}
          {note && note.trim() ? (
            <p className={`text-sm text-gray-300 truncate ${date ? "mt-1" : ""}`}>{note}</p>
          ) : null}
          {createdAt && formatDate(createdAt) !== formatDate(date) ? (
            <p className="mt-1 text-xs text-gray-500">Recorded: {formatDate(createdAt)}</p>
          ) : null}
        </div>

        <div className="ml-4 flex-shrink-0">
          {!isReversal && onRevert ? (
            <button
              type="button"
              onClick={onRevert}
              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
            >
              Revert
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
