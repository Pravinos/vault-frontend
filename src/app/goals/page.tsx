"use client";

import { useEffect, useState } from "react";
import { Plus, Target } from "lucide-react";
import GoalCard from "@/components/goals/GoalCard";
import GoalForm from "@/components/goals/GoalForm";
import ContributeModal from "@/components/goals/ContributeModal";
import TopBar from "@/components/layout/TopBar";
import Skeleton from "@/components/ui/Skeleton";
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
    const timer = setTimeout(() => {
      void fetchGoals();
    }, 0);

    return () => clearTimeout(timer);
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
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-emerald-400 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Goal
          </button>
        }
      />
      <div className="flex-1 space-y-6 px-4 py-6 sm:px-6">
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-52 rounded-xl" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 py-20">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <Target className="h-8 w-8 text-gray-500" />
            </div>
            <p className="text-base font-medium text-gray-300">No active goals</p>
            <p className="mt-1 text-sm text-gray-500">Create a goal and start saving towards it</p>
            <button
              type="button"
              onClick={handleAddClick}
              className="mt-6 flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-emerald-400 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Create your first goal
            </button>
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
