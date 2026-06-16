"use client";

import { Edit, MinusCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useConfirmDelete } from "@/lib/hooks/useConfirmDelete";
import type { Goal } from "@/types";
import { useState, useEffect, useRef } from "react";
import ManageAccountsModal from "./ManageAccountsModal";
import Toast from "@/components/ui/Toast";

function getDaysRemainingPill(goal: Goal) {
  if (!goal.deadline) return null;
  if (goal.isOverdue) {
    return (
      <span className="rounded-full bg-red-900/60 px-2 py-0.5 text-xs font-medium text-red-300">
        Overdue
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
  onEdit: (g: Goal) => void;
  onDeactivate: (id: string) => void;
  onUpdated?: () => void;
};

export default function GoalCard({ goal, onEdit, onDeactivate, onUpdated }: GoalCardProps) {
  const { handleDelete: confirmDeactivate, isPendingConfirm } = useConfirmDelete();
  const [showManage, setShowManage] = useState(false);
  const progress = Math.min(goal.progressPercentage, 100);
  const prevProgressRef = useRef<number>(goal.progressPercentage);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const completed = goal.progressPercentage >= 100;

  useEffect(() => {
    const prev = prevProgressRef.current;
    if (prev < 100 && goal.progressPercentage >= 100) {
      setToast({ message: `Congratulations — you completed "${goal.name}"!`, type: "success" });
    }
    prevProgressRef.current = goal.progressPercentage;
  }, [goal.progressPercentage, goal.name]);

  return (
    <div className={`flex flex-col rounded-xl p-5 ${completed ? 'border border-emerald-600 bg-emerald-900/30' : 'border border-gray-800 bg-gray-900/60'}`}>
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
          <button
            type="button"
            onClick={() => setShowManage(true)}
            className="rounded-md p-1.5 text-gray-400 transition-all duration-150 hover:text-white active:scale-95"
            aria-label="Manage linked accounts"
          >
            Manage
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-700">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${completed ? 'bg-green-500' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 text-xs text-gray-400">
          <div>
            <div className="tabular-nums font-medium text-white">
              {formatCurrency(goal.savedAmount)}
            </div>
            <div className="text-xs text-gray-500">Saved across linked accounts / {formatCurrency(goal.targetAmount)}</div>
          </div>
          <span className="font-medium text-gray-300">{goal.progressPercentage.toFixed(1)}%</span>
        </div>
      </div>

      {goal.description ? (
        <p className="mt-3 text-sm text-gray-400 whitespace-pre-line">{goal.description}</p>
      ) : null}

      <div className="mt-4">
        {goal.linkedAccounts && goal.linkedAccounts.length > 0 ? (
          <div className="space-y-2">
            {goal.linkedAccounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm text-gray-300">
                <div>{a.name}</div>
                <div className="tabular-nums text-gray-200">{formatCurrency(a.calculatedBalance)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 text-sm text-gray-400">Link accounts to track live progress</div>
        )}
      </div>

      {showManage ? (
        <ManageAccountsModal
          goal={goal}
          onClose={() => setShowManage(false)}
          onSuccess={() => {
            setShowManage(false);
            onUpdated?.();
          }}
        />
      ) : null}
      {toast ? (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      ) : null}
    </div>
  );
}

