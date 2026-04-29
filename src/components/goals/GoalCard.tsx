"use client";

import { Edit, MinusCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Goal } from "@/types";

function getProgressColor(progress: number) {
  if (progress >= 100) return "bg-green-500";
  if (progress >= 80) return "bg-blue-500";
  if (progress >= 50) return "bg-yellow-500";
  if (progress >= 0) return "bg-red-500";
  return "bg-gray-500";
}

function getGoalTypeBadge(goalType: Goal["goalType"]) {
  if (goalType === "SHORT_TERM")
    return (
      <span className="ml-2 rounded-full bg-blue-900 px-2 py-0.5 text-xs font-medium text-blue-300">
        Short Term
      </span>
    );
  return (
    <span className="ml-2 rounded-full bg-purple-900 px-2 py-0.5 text-xs font-medium text-purple-300">
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
  const progressColor = getProgressColor(goal.progressPercentage);

  return (
    <div className="flex flex-col rounded-xl bg-gray-800 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-white font-semibold text-lg">{goal.name}</span>
          {getGoalTypeBadge(goal.goalType)}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(goal)}
            className="rounded-md p-1 text-gray-300 hover:text-white"
            aria-label="Edit goal"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Deactivate this goal?")) {
                onDeactivate(goal.id);
              }
            }}
            className="rounded-md p-1 text-gray-300 hover:text-red-400"
            aria-label="Deactivate goal"
          >
            <MinusCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 w-full rounded-full bg-gray-700">
          <div
            className={`h-2 rounded-full ${progressColor}`}
            style={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between text-xs text-gray-300">
          <span>
            {formatCurrency(goal.savedAmount)} / {formatCurrency(goal.targetAmount)}
          </span>
          <span>{goal.progressPercentage.toFixed(1)}%</span>
          {goal.deadline ? (
            goal.daysRemaining > 0 ? (
              <span>{goal.daysRemaining} days left</span>
            ) : (
              <span className="text-red-400">Deadline passed</span>
            )
          ) : (
            <span>No deadline</span>
          )}
        </div>
      </div>

      {goal.description ? (
        <p className="mt-3 text-sm text-gray-400 whitespace-pre-line">{goal.description}</p>
      ) : null}

      <button
        type="button"
        onClick={() => onContribute(goal)}
        className="mt-5 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
      >
        Add funds
      </button>
    </div>
  );
}
