"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Target } from "lucide-react";
import GoalCard from "@/components/goals/GoalCard";
import GoalForm from "@/components/goals/GoalForm";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import { useAnimatedProgress } from "@/lib/hooks/useAnimatedProgress";
import { useDeactivateGoal } from "@/lib/hooks/useGoalMutations";
import { useGoals } from "@/lib/hooks/useGoals";
import { useFormatCurrency } from "@/lib/currencyContext";
import { queryKeys } from "@/lib/queryKeys";
import type { Goal } from "@/types";

export default function GoalsPage() {
  const formatCurrency = useFormatCurrency();
  const qc = useQueryClient();
  const { data: goals = [], isLoading: loading, error, refetch } = useGoals();
  const deactivateGoalMutation = useDeactivateGoal();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Goal | undefined>(undefined);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const invalidateGoals = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.goals });
  }, [qc]);

  const stats = useMemo(() => {
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const completedCount = goals.filter((g) => g.progressPercentage >= 100).length;
    const overdueCount = goals.filter((g) => g.isOverdue && g.progressPercentage < 100).length;

    const linkedAccountCounts = new Map<string, number>();
    for (const goal of goals) {
      for (const account of goal.linkedAccounts) {
        linkedAccountCounts.set(account.id, (linkedAccountCounts.get(account.id) ?? 0) + 1);
      }
    }
    const hasSharedAccounts = [...linkedAccountCounts.values()].some((count) => count > 1);

    const overallProgress =
      goals.length > 0
        ? goals.reduce((sum, g) => sum + g.progressPercentage, 0) / goals.length
        : 0;

    const totalSaved = goals.reduce((sum, g) => sum + g.savedAmount, 0);

    return {
      totalSaved,
      totalTarget,
      completedCount,
      overdueCount,
      overallProgress,
      hasSharedAccounts,
    };
  }, [goals]);
  const animatedOverallProgress = useAnimatedProgress(stats.overallProgress);

  const openCreate = () => {
    setEditing(undefined);
    setShowForm(true);
  };

  const openEdit = (g: Goal) => {
    setEditing(g);
    setShowForm(true);
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateGoalMutation.mutateAsync(id);
      setToast({ message: "Goal deactivated", type: "success" });
    } catch {
      setToast({ message: "Unable to deactivate goal.", type: "error" });
    }
  };

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditing(undefined);
  }, []);

  const handleFormSuccess = useCallback(
    async (mode: "create" | "edit") => {
      await invalidateGoals();
      setToast({
        message: mode === "edit" ? "Goal updated" : "Goal created",
        type: "success",
      });
    },
    [invalidateGoals]
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Goals</h1>
        <button
          type="button"
          onClick={openCreate}
          className="btn-interactive inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" />
          Add Goal
        </button>
      </div>

      {error ? (
        <ErrorMessage message="Unable to load goals." onRetry={() => void refetch()} />
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} variant="card" className="h-52 rounded-xl" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Create a savings goal and track your progress over time."
          action={{ label: "Add goal", onClick: openCreate }}
        />
      ) : (
        <>
          <div className="rounded-card-lg border border-border bg-surface-raised p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-gray-500">Overall progress</p>
                <p className="mt-1 text-sm text-gray-400">
                  {stats.hasSharedAccounts ? (
                    <>
                      <span className="font-semibold text-white">
                        {stats.overallProgress.toFixed(0)}%
                      </span>
                      {" average progress across "}
                      {goals.length} goal{goals.length === 1 ? "" : "s"}
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-white">
                        {formatCurrency(stats.totalSaved)}
                      </span>
                      {" saved of "}
                      <span className="font-semibold text-emerald-300">
                        {formatCurrency(stats.totalTarget)}
                      </span>
                      {" across "}
                      {goals.length} goal{goals.length === 1 ? "" : "s"}
                    </>
                  )}
                </p>
                {stats.hasSharedAccounts ? (
                  <p className="mt-1 text-xs text-gray-500">
                    Combined target {formatCurrency(stats.totalTarget)} · shared accounts counted per goal
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {stats.completedCount > 0 ? (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">
                    {stats.completedCount} complete
                  </span>
                ) : null}
                {stats.overdueCount > 0 ? (
                  <span className="rounded-full bg-rose-500/15 px-2 py-0.5 font-semibold text-rose-300">
                    {stats.overdueCount} overdue
                  </span>
                ) : null}
                <span className="font-medium text-gray-400">
                  {stats.overallProgress.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="progress-bar-fill h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                style={{ width: `${animatedOverallProgress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onEdit={openEdit}
                onDeactivate={handleDeactivate}
                onUpdated={invalidateGoals}
              />
            ))}
          </div>
        </>
      )}

      {showForm ? (
        <GoalForm goal={editing} onSuccess={handleFormSuccess} onClose={handleFormClose} />
      ) : null}

      {toast ? (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      ) : null}
    </div>
  );
}
