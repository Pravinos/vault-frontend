"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import SelectField from "@/components/ui/SelectField";
import { createGoal, updateGoal } from "@/lib/api";
import { useAccounts } from "@/lib/hooks/useAccounts";
import type { Goal, CreateGoalRequest } from "@/types";

type GoalFormProps = {
  goal?: Goal;
  onSuccess: () => void;
  onClose: () => void;
};

type FormErrors = {
  name?: string;
  targetAmount?: string;
  goalType?: string;
  deadline?: string;
  description?: string;
};

export default function GoalForm({ goal, onSuccess, onClose }: GoalFormProps) {
  const [name, setName] = useState(goal?.name ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount.toString() ?? "");
  const [goalType, setGoalType] = useState<"SHORT_TERM" | "LONG_TERM">(
    goal?.goalType ?? "SHORT_TERM"
  );
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const { data: accounts = [] } = useAccounts();
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    goal?.linkedAccounts?.map((a) => a.id) ?? []
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditMode = useMemo(() => Boolean(goal), [goal]);

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!name.trim()) nextErrors.name = "Name is required";
    if (name.length > 100) nextErrors.name = "Max 100 characters";
    if (!targetAmount || Number(targetAmount) < 0.01) nextErrors.targetAmount = "Target must be at least 0.01";
    if (!goalType) nextErrors.goalType = "Goal type is required";
    if (description.length > 255) nextErrors.description = "Max 255 characters";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;
    setFormError(null);
    setIsSubmitting(true);
    const payload: CreateGoalRequest = {
      name: name.trim(),
      description: description.trim() ? description.trim() : undefined,
      targetAmount: Number(targetAmount),
      goalType: goalType as "SHORT_TERM" | "LONG_TERM",
      deadline: deadline || undefined,
      accountIds: selectedAccountIds.length ? selectedAccountIds : undefined,
    };
    try {
      if (goal) {
        await updateGoal(goal.id, payload);
      } else {
        await createGoal(payload);
      }
      onSuccess();
      onClose();
    } catch (error) {
      setFormError("Unable to save goal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={isEditMode ? "Edit Goal" : "Add Goal"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{formError}</p>
        ) : null}
        <div>
          <label className="text-sm text-gray-200">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
            maxLength={100}
            required
          />
          {errors.name ? <p className="mt-1 text-xs text-red-400">{errors.name}</p> : null}
        </div>
        <div>
          <label className="text-sm text-gray-200">Description</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
            maxLength={255}
            placeholder="Optional"
          />
          {errors.description ? <p className="mt-1 text-xs text-red-400">{errors.description}</p> : null}
        </div>
        <div>
          <label className="text-sm text-gray-200">Target amount</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={targetAmount}
            onChange={e => setTargetAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
            required
          />
          {errors.targetAmount ? <p className="mt-1 text-xs text-red-400">{errors.targetAmount}</p> : null}
        </div>
        <div>
          <SelectField
            label="Goal type"
            value={goalType}
            onChange={e => setGoalType(e.target.value as "SHORT_TERM" | "LONG_TERM")}
            required
          >
            <option value="SHORT_TERM">Short Term</option>
            <option value="LONG_TERM">Long Term</option>
          </SelectField>
          {errors.goalType ? <p className="mt-1 text-xs text-red-400">{errors.goalType}</p> : null}
        </div>
        <div>
          <label className="text-sm text-gray-200">Deadline</label>
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white"
          />
        </div>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-gray-700 px-4 py-2 text-base text-gray-200 hover:border-gray-500 sm:w-auto sm:text-sm"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:text-sm"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : isEditMode ? "Save" : "Add"}
          </button>
        </div>

        <div>
          <p className="text-sm text-gray-200">Link accounts</p>
          <p className="mt-1 mb-2 text-xs text-gray-400">Select accounts to include in goal progress (optional)</p>
          <div className="space-y-2">
            {accounts.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm text-gray-200">
                <input
                  type="checkbox"
                  checked={selectedAccountIds.includes(a.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAccountIds((s) => [...s, a.id]);
                    } else {
                      setSelectedAccountIds((s) => s.filter((id) => id !== a.id));
                    }
                  }}
                />
                <span className="flex-1">{a.name}</span>
                <span className="text-xs text-gray-400">{Number(a.calculatedBalance).toFixed(2)}</span>
              </label>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
