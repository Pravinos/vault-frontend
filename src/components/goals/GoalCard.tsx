"use client";

import { Edit, Link2, MinusCircle } from "lucide-react";
import { getAccountAccent, getAccountBadgeClasses } from "@/lib/accountColors";
import { formatDate, getGoalPace } from "@/lib/utils";
import { useCurrency, useFormatCurrency } from "@/lib/currencyContext";
import { useAnimatedProgress } from "@/lib/hooks/useAnimatedProgress";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import type { Goal } from "@/types";
import { useState, useEffect, useRef } from "react";
import ManageAccountsModal from "./ManageAccountsModal";
import Toast from "@/components/ui/Toast";

function getDaysRemainingPill(goal: Goal) {
  if (!goal.deadline || goal.progressPercentage >= 100) return null;
  if (goal.isOverdue) {
    return (
      <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-300">
        Overdue
      </span>
    );
  }
  const colorClass =
    goal.daysRemaining < 10
      ? "bg-rose-500/15 text-rose-300"
      : goal.daysRemaining <= 30
        ? "bg-amber-500/15 text-amber-300"
        : "bg-emerald-500/15 text-emerald-300";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}
    >
      {goal.daysRemaining}d left
    </span>
  );
}

function getGoalTypeBadge(goalType: Goal["goalType"]) {
  if (goalType === "SHORT_TERM") {
    return (
      <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
        Short term
      </span>
    );
  }
  return (
    <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-300">
      Long term
    </span>
  );
}

type GoalCardProps = {
  goal: Goal;
  onEdit: (g: Goal) => void;
  onDeactivate: (id: string) => void;
  onUpdated?: () => void;
};

export default function GoalCard({ goal, onEdit, onDeactivate, onUpdated }: GoalCardProps) {
  const formatCurrency = useFormatCurrency();
  const { currency } = useCurrency();
  const { handleDelete: confirmDeactivate, isPendingConfirm } = useConfirmDelete();
  const [showManage, setShowManage] = useState(false);
  const progress = Math.min(goal.progressPercentage, 100);
  const animatedProgress = useAnimatedProgress(progress);
  const prevProgressRef = useRef<number>(goal.progressPercentage);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const completed = goal.progressPercentage >= 100;
  const pace =
    goal.deadline || goal.savedAmount >= goal.targetAmount
      ? getGoalPace(goal.targetAmount, goal.savedAmount, goal.daysRemaining, currency)
      : null;

  useEffect(() => {
    const prev = prevProgressRef.current;
    if (prev < 100 && goal.progressPercentage >= 100) {
      setToast({ message: `Congratulations — you completed "${goal.name}"!`, type: "success" });
    }
    prevProgressRef.current = goal.progressPercentage;
  }, [goal.progressPercentage, goal.name]);

  return (
    <div
      className={`animate-card-enter flex flex-col rounded-card border p-card-md ${
        completed
          ? "border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20"
          : "border-border bg-surface-raised"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-white">{goal.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {getGoalTypeBadge(goal.goalType)}
            {getDaysRemainingPill(goal)}
            {completed ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                Complete
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setShowManage(true)}
            className="btn-interactive rounded-md p-1.5 text-gray-400 hover:bg-white/5 hover:text-emerald-300"
            aria-label="Manage linked accounts"
            title="Manage linked accounts"
          >
            <Link2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(goal)}
            className="btn-interactive rounded-md p-1.5 text-gray-400 hover:bg-white/5 hover:text-white"
            aria-label={`Edit ${goal.name}`}
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => confirmDeactivate(goal.id, () => onDeactivate(goal.id))}
            className={`btn-interactive rounded-md p-1.5 ${
              isPendingConfirm(goal.id)
                ? "bg-rose-500/20 text-rose-300"
                : "text-gray-400 hover:bg-white/5 hover:text-rose-400"
            }`}
            aria-label={
              isPendingConfirm(goal.id) ? `Confirm deactivate ${goal.name}` : `Deactivate ${goal.name}`
            }
            title={isPendingConfirm(goal.id) ? "Click again to confirm" : "Deactivate goal"}
          >
            <MinusCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`progress-bar-fill h-full rounded-full ${
              completed
                ? "bg-emerald-400"
                : "bg-gradient-to-r from-emerald-600 to-emerald-400"
            }`}
            style={{ width: `${animatedProgress}%` }}
          />
        </div>
        {pace ? (
          <p
            className={`mt-1.5 text-xs ${
              pace.kind === "overdue"
                ? "text-amber-400"
                : pace.kind === "reached"
                  ? "text-emerald-400"
                  : "text-gray-500"
            }`}
          >
            {pace.message}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <div>
            <p className="tabular-nums text-sm font-semibold text-white">
              {formatCurrency(goal.savedAmount)}
              <span className="font-normal text-gray-500">
                {" "}
                / {formatCurrency(goal.targetAmount)}
              </span>
            </p>
            {goal.deadline ? (
              <p className="mt-0.5 text-xs text-gray-500">Due {formatDate(goal.deadline)}</p>
            ) : null}
          </div>
          <span className="tabular-nums text-sm font-medium text-gray-300">
            {goal.progressPercentage.toFixed(0)}%
          </span>
        </div>
      </div>

      {goal.description ? (
        <p className="mt-3 line-clamp-2 text-sm text-gray-400">{goal.description}</p>
      ) : null}

      <div className="mt-4 flex-1">
        {goal.linkedAccounts && goal.linkedAccounts.length > 0 ? (
          <div className="space-y-1.5">
            {goal.linkedAccounts.map((a) => (
              <div
                key={a.id}
                className={`flex items-center justify-between rounded-lg border border-border border-l-4 ${getAccountAccent(a.accountType)} bg-surface-sunken/60 px-3 py-2 text-sm`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-gray-300">{a.name}</span>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getAccountBadgeClasses(a.accountType)}`}
                  >
                    {a.accountType}
                  </span>
                </div>
                <span className="ml-3 shrink-0 tabular-nums text-gray-200">
                  {formatCurrency(a.calculatedBalance)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowManage(true)}
            className="btn-interactive w-full rounded-lg border border-dashed border-white/10 px-3 py-2.5 text-sm text-gray-500 transition hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-300"
          >
            Link accounts to track live progress
          </button>
        )}
      </div>

      {showManage ? (
        <ManageAccountsModal
          goal={goal}
          onClose={() => setShowManage(false)}
          onUpdated={onUpdated}
        />
      ) : null}
      {toast ? (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      ) : null}
    </div>
  );
}
