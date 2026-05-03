"use client";

import { Edit, MinusCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import type { Goal } from "@/types";

function getDaysRemainingPill(goal: Goal) {
  if (!goal.deadline) return null;
  if (goal.daysRemaining <= 0) {
    return (
      <span className="rounded-full bg-red-900/60 px-2 py-0.5 text-xs font-medium text-red-300">
        Deadline passed
      </span>
    );
  }
  const colorClass =
    goal.daysRemaining < 10
      ? "bg-red-900/60 text-red-300"
      : goal.daysRemaining <= 30
      ? "bg-amber-900/60 text-amber-300"
      : "bg-emerald-900/60 text-emerald-300";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {goal.daysRemaining}d left
    </span>
  );
}

function getGoalTypeBadge(goalType: Goal["goalType"]) {
  if (goalType === "SHORT_TERM")
    return (
      <span className="rounded-full bg-blue-900/60 px-2 py-0.5 text-xs font-medium text-blue-300">
        Short Term
      </span>
    );
  return (
    <span className="rounded-full bg-purple-900/60 px-2 py-0.5 text-xs font-medium text-purple-300">
      Long Term
    </span>
  );
}

type GoalCardProps = {
  goal: Goal;
  onContribute: (g: Goal) => void;
  onEdit: (g: Goal) => void;
  onDeactivate: (id: string) => void;
};

export default function GoalCard({ goal, onContribute, onEdit, onDeactivate }: GoalCardProps) {
  const { handleDelete: confirmDeactivate, isPendingConfirm } = useConfirmDelete();
  const progress = Math.min(goal.progressPercentage, 100);

  return (
    <div className="flex flex-col rounded-xl border border-gray-800 bg-gray-900/60 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold text-white">{goal.name}</span>
          {getGoalTypeBadge(goal.goalType)}
          {getDaysRemainingPill(goal)}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(goal)}
            className="rounded-md p-1.5 text-gray-400 transition-all duration-150 hover:text-white active:scale-95"
            aria-label="Edit goal"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              confirmDeactivate(goal.id, () => onDeactivate(goal.id))
            }
            className={`rounded-md px-2 py-1 text-xs font-medium transition-all duration-150 active:scale-95 ${
              isPendingConfirm(goal.id)
                ? "bg-red-500/20 text-red-300"
                : "text-gray-400 hover:text-red-400"
            }`}
            aria-label="Deactivate goal"
          >
            {isPendingConfirm(goal.id) ? (
              "Confirm?"
            ) : (
              <MinusCircle className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-700">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 text-xs text-gray-400">
          <span className="tabular-nums">
            {formatCurrency(goal.savedAmount)}{" "}
            <span className="text-gray-500">/ {formatCurrency(goal.targetAmount)}</span>
          </span>
          <span className="font-medium text-gray-300">
            {goal.progressPercentage.toFixed(1)}%
          </span>
        </div>
      </div>

      {goal.description ? (
        <p className="mt-3 text-sm text-gray-400 whitespace-pre-line">
          {goal.description}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => onContribute(goal)}
        className="mt-5 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:bg-emerald-400 active:scale-95"
      >
        Add funds
      </button>
    </div>
  );
}

