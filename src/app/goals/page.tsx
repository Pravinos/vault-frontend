"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Target } from "lucide-react";
import GoalCard from "@/components/goals/GoalCard";
import GoalForm from "@/components/goals/GoalForm";
import EmptyState from "@/components/ui/EmptyState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import Skeleton from "@/components/ui/Skeleton";
import Toast from "@/components/ui/Toast";
import { useDeactivateGoal } from "@/lib/hooks/useGoalMutations";
import { useGoals } from "@/lib/hooks/useGoals";
import { queryKeys } from "@/lib/queryKeys";
import type { Goal } from "@/types";

export default function GoalsPage() {
  const qc = useQueryClient();
  const { data: goals = [], isLoading: loading, error, refetch } = useGoals();
  const deactivateGoalMutation = useDeactivateGoal();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Goal | undefined>(undefined);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const invalidateGoals = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.goals });
  }, [qc]);

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

  const handleFormSuccess = useCallback(async () => {
    await invalidateGoals();
  }, [invalidateGoals]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Goals</h1>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" /> Add Goal
        </button>
      </div>

      <div>
        {error ? (
          <ErrorMessage
            message="Unable to load goals."
            onRetry={() => void refetch()}
          />
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
        )}
      </div>

      {showForm ? (
        <GoalForm
          goal={editing}
          onSuccess={handleFormSuccess}
          onClose={handleFormClose}
        />
      ) : null}

      {toast ? (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      ) : null}
    </div>
  );
}
