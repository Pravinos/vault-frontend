"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Pin, Trash2 } from "lucide-react";

import {
  isValidBudgetAmount,
  statusBadgeClasses,
  statusBarColor,
  statusLabel,
} from "@/lib/budgetStatus";
import { useAnimatedProgress } from "@/lib/hooks/useAnimatedProgress";
import { useFormatCurrency } from "@/lib/currencyContext";
import type { BudgetSummaryItem } from "@/types/budget";

type BudgetCardProps = {
  item: BudgetSummaryItem;
  budgetId: string | undefined;
  onSave: (categoryId: number, amount: number) => Promise<void>;
  onDelete: (id: string) => void;
  isPendingConfirm: boolean;
  isSaving: boolean;
  showHighlightToggle?: boolean;
  isHighlighted?: boolean;
  onToggleHighlight?: () => void;
};

export default function BudgetCard({
  item,
  budgetId,
  onSave,
  onDelete,
  isPendingConfirm,
  isSaving,
  showHighlightToggle = false,
  isHighlighted = false,
  onToggleHighlight,
}: BudgetCardProps) {
  const formatCurrency = useFormatCurrency();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(item.budgetAmount));
  const [editError, setEditError] = useState<string | null>(null);
  const [statusPulse, setStatusPulse] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const prevStatusRef = useRef(item.status);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) {
      setEditValue(String(item.budgetAmount));
    }
  }, [item.budgetAmount, editing]);

  useEffect(() => {
    if (prevStatusRef.current !== "OVER_BUDGET" && item.status === "OVER_BUDGET") {
      setStatusPulse(true);
    }
    prevStatusRef.current = item.status;
  }, [item.status]);

  const progressWidth = Math.min(Math.max(item.percentageUsed, 0), 100);
  const animatedProgressWidth = useAnimatedProgress(progressWidth);

  const startEdit = () => {
    setEditValue(String(item.budgetAmount));
    setEditError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditValue(String(item.budgetAmount));
    setEditError(null);
    setEditing(false);
  };

  const saveEdit = async () => {
    const parsed = Number.parseFloat(editValue);
    if (!isValidBudgetAmount(parsed)) {
      setEditError("Enter an amount greater than 0");
      return;
    }
    if (parsed === item.budgetAmount) {
      setEditing(false);
      return;
    }

    try {
      await onSave(item.categoryId, parsed);
      setEditing(false);
    } catch {
      // Parent handles error toast; keep edit mode open.
    }
  };

  return (
    <div
      className={`animate-card-enter rounded-card border bg-surface-raised p-card-sm ${
        isHighlighted ? "border-teal-500/40 ring-1 ring-teal-500/20" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xl">{item.categoryIcon}</span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{item.categoryName}</p>
            {isHighlighted ? (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-400">
                Dashboard highlight
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {showHighlightToggle && onToggleHighlight ? (
            <button
              type="button"
              onClick={onToggleHighlight}
              className={`btn-interactive rounded-md p-1.5 ${
                isHighlighted
                  ? "bg-teal-500/15 text-teal-300"
                  : "text-gray-400 hover:bg-white/5 hover:text-teal-300"
              }`}
              aria-label={
                isHighlighted
                  ? `Remove ${item.categoryName} from dashboard highlights`
                  : `Highlight ${item.categoryName} on dashboard`
              }
              title={isHighlighted ? "Remove from dashboard" : "Show on dashboard"}
            >
              <Pin className={`h-4 w-4 ${isHighlighted ? "fill-current" : ""}`} />
            </button>
          ) : null}
          {!editing ? (
            <button
              type="button"
              onClick={startEdit}
              className="btn-interactive rounded-md p-1.5 text-gray-400 hover:bg-white/5 hover:text-white"
              aria-label={`Edit budget for ${item.categoryName}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void saveEdit()}
              disabled={isSaving}
              className="btn-interactive rounded-md p-1.5 text-teal-400 hover:bg-teal-500/10 disabled:opacity-50"
              aria-label="Save budget amount"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          {budgetId ? (
            <button
              type="button"
              onClick={() => onDelete(budgetId)}
              className={`btn-interactive rounded-md p-1.5 ${
                isPendingConfirm
                  ? "bg-rose-500/20 text-rose-300"
                  : "text-gray-400 hover:bg-white/5 hover:text-rose-400"
              }`}
              aria-label={
                isPendingConfirm
                  ? `Confirm delete budget for ${item.categoryName}`
                  : `Delete budget for ${item.categoryName}`
              }
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`progress-bar-fill h-full rounded-full ${statusBarColor(item.status)}`}
          style={{ width: `${animatedProgressWidth}%` }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          {editing ? (
            <>
              <input
                ref={inputRef}
                type="number"
                min="0.01"
                step="0.01"
                value={editValue}
                onChange={(event) => {
                  setEditValue(event.target.value);
                  setEditError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveEdit();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelEdit();
                  }
                }}
                className="w-28 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white focus:border-teal-500/50 focus:outline-none"
              />
              {editError ? (
                <p className="mt-1 text-xs text-rose-400">{editError}</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-gray-300">
              <span className="font-semibold text-white">{formatCurrency(item.spentAmount)}</span>
              {" / "}
              {formatCurrency(item.budgetAmount)}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {item.remainingAmount >= 0 ? (
              <>{formatCurrency(item.remainingAmount)} remaining</>
            ) : (
              <span className="text-rose-400">
                {formatCurrency(Math.abs(item.remainingAmount))} over budget
              </span>
            )}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-200 ${statusBadgeClasses(item.status)} ${
            statusPulse && item.status === "OVER_BUDGET" ? "status-pulse" : ""
          }`}
        >
          {statusLabel(item.status)}
        </span>
      </div>
    </div>
  );
}
