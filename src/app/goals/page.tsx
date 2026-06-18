"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import GoalCard from "@/components/goals/GoalCard";
import GoalForm from "@/components/goals/GoalForm";
import Skeleton from "@/components/ui/Skeleton";
import { getGoals, deactivateGoal } from "@/lib/api";
import type { Goal } from "@/types";

export default function GoalsPage() {
  const qc = useQueryClient();
  const { data: goals = [], isLoading: loading } = useQuery({ queryKey: ["goals"], queryFn: getGoals });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Goal | undefined>(undefined);

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
      await deactivateGoal(id);
      await qc.invalidateQueries({ queryKey: ["goals"] });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

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
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} variant="card" className="h-52 rounded-xl" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center">
            <p className="text-base font-medium text-gray-200">No goals yet</p>
            <p className="mt-1 text-sm text-gray-500">Create a goal to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} onEdit={openEdit} onDeactivate={handleDeactivate} onUpdated={() => qc.invalidateQueries({ queryKey: ["goals"] })} />
            ))}
          </div>
        )}
      </div>

      {showForm ? (
        <GoalForm
          goal={editing}
          onSuccess={() => qc.invalidateQueries({ queryKey: ["goals"] })}
          onClose={() => setShowForm(false)}
        />
      ) : null}
    </div>
  );
}
