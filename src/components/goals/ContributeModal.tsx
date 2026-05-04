"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { contributeToGoal } from "@/lib/api";
import type { Goal } from "@/types";

function getProgressColor(progress: number) {
  if (progress >= 100) return "bg-green-500";
  if (progress >= 80) return "bg-blue-500";
  if (progress >= 50) return "bg-yellow-500";
  if (progress >= 0) return "bg-red-500";
  return "bg-gray-500";
}

type ContributeModalProps = {
  goal: Goal;
  onSuccess: () => void;
  onClose: () => void;
};

export default function ContributeModal({ goal, onSuccess, onClose }: ContributeModalProps) {
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progressColor = getProgressColor(goal.progressPercentage);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!amount || Number(amount) < 0.01) {
      setError("Amount must be at least 0.01");
      return;
    }
    setIsSubmitting(true);
    try {
      await contributeToGoal(goal.id, { amount: Number(amount) });
      onSuccess();
      onClose();
    } catch (e) {
      setError("Unable to contribute to goal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add Funds">
      <div className="mb-2 text-sm text-gray-300">{goal.name}</div>
      <div className="mb-4">
        <div className="h-2 w-full rounded-full bg-gray-700">
          <div
            className={`h-2 rounded-full ${progressColor}`}
            style={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}
          />
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
        ) : null}
        <div>
          <label className="text-sm text-gray-200">Amount</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70 active:scale-95"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Adding..." : `Add €${amount || "0.00"}`}
        </button>
      </form>
    </Modal>
  );
}
