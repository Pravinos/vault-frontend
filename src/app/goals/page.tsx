"use client";

import { useEffect, useState } from "react";
import GoalCard from "@/components/goals/GoalCard";
import GoalForm from "@/components/goals/GoalForm";
import ContributeModal from "@/components/goals/ContributeModal";
import TopBar from "@/components/layout/TopBar";
import { deactivateGoal, getGoals } from "@/lib/api";
import type { Goal } from "@/types";

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [contributingGoal, setContributingGoal] = useState<Goal | undefined>(undefined);

  const fetchGoals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGoals();
      setGoals(data.filter((g) => g.isActive));
    } catch (err) {
      setError("Unable to load goals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleAddClick = () => {
    setEditingGoal(undefined);
    setShowForm(true);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateGoal(id);
      await fetchGoals();
    } catch (err) {
      setError("Unable to deactivate goal.");
    }
  };

  const handleContribute = (goal: Goal) => {
    setContributingGoal(goal);
  };

  const handleFormSuccess = async () => {
    await fetchGoals();
  };

  const handleContributeSuccess = async () => {
    await fetchGoals();
  };

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title="Goals"
        action={
          <button
            type="button"
            onClick={handleAddClick}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
          >
            Add Goal
          </button>
        }
      />
      <div className="flex-1 space-y-6 px-6 py-6">
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-800/60" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-800 py-16 text-gray-400">
            <p className="text-sm">No active goals. Create one to start saving.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onContribute={handleContribute}
                onEdit={handleEdit}
                onDeactivate={handleDeactivate}
              />
            ))}
          </div>
        )}
      </div>

      {showForm ? (
        <GoalForm
          goal={editingGoal}
          onSuccess={handleFormSuccess}
          onClose={() => setShowForm(false)}
        />
      ) : null}

      {contributingGoal ? (
        <ContributeModal
          goal={contributingGoal}
          onSuccess={handleContributeSuccess}
          onClose={() => setContributingGoal(undefined)}
        />
      ) : null}
    </div>
  );
}
