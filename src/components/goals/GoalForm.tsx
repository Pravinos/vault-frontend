"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import SelectField from "@/components/ui/SelectField";
import { createGoal, updateGoal } from "@/lib/api";
import { useFormatCurrency } from "@/lib/currencyContext";
import { useAccounts } from "@/lib/hooks/useAccounts";
import { useModalDismiss } from "@/lib/hooks/useModalDismiss";
import type { Goal, CreateGoalRequest } from "@/types";

type GoalFormProps = {
  goal?: Goal;
  onSuccess: (mode: "create" | "edit") => void | Promise<void>;
  onClose: () => void;
};

type FormErrors = {
  name?: string;
  targetAmount?: string;
  goalType?: string;
  deadline?: string;
  description?: string;
};

const inputClassName =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder:text-gray-600 focus:border-emerald-500/50 focus:outline-none";

export default function GoalForm({ goal, onSuccess, onClose }: GoalFormProps) {
  const formatCurrency = useFormatCurrency();
  const { isOpen, requestClose } = useModalDismiss();
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
    if (!targetAmount || Number(targetAmount) < 0.01)
      nextErrors.targetAmount = "Target must be at least 0.01";
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
      accountIds: goal
        ? selectedAccountIds
        : selectedAccountIds.length
          ? selectedAccountIds
          : undefined,
    };
    try {
      if (goal) {
        await updateGoal(goal.id, payload);
      } else {
        await createGoal(payload);
      }
      onSuccess(isEditMode ? "edit" : "create");
      requestClose();
    } catch {
      setFormError("Unable to save goal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={requestClose}
      onClosed={onClose}
      title={isEditMode ? "Edit Goal" : "Add Goal"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {formError}
          </p>
        ) : null}

        <div>
          <label htmlFor="goal-name" className="mb-1.5 block text-sm text-gray-400">
            Name
          </label>
          <input
            id="goal-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClassName}
            maxLength={100}
            required
          />
          {errors.name ? <p className="mt-1 text-xs text-red-400">{errors.name}</p> : null}
        </div>

        <div>
          <label htmlFor="goal-description" className="mb-1.5 block text-sm text-gray-400">
            Description
          </label>
          <input
            id="goal-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClassName}
            maxLength={255}
            placeholder="Optional"
          />
          {errors.description ? (
            <p className="mt-1 text-xs text-red-400">{errors.description}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="goal-target" className="mb-1.5 block text-sm text-gray-400">
            Target amount
          </label>
          <input
            id="goal-target"
            type="number"
            min="0.01"
            step="0.01"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className={inputClassName}
            required
          />
          {errors.targetAmount ? (
            <p className="mt-1 text-xs text-red-400">{errors.targetAmount}</p>
          ) : null}
        </div>

        <div>
          <SelectField
            label="Goal type"
            value={goalType}
            onChange={(e) => setGoalType(e.target.value as "SHORT_TERM" | "LONG_TERM")}
            required
          >
            <option value="SHORT_TERM">Short Term</option>
            <option value="LONG_TERM">Long Term</option>
          </SelectField>
          {errors.goalType ? <p className="mt-1 text-xs text-red-400">{errors.goalType}</p> : null}
        </div>

        <div>
          <label htmlFor="goal-deadline" className="mb-1.5 block text-sm text-gray-400">
            Deadline
          </label>
          <input
            id="goal-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={inputClassName}
          />
        </div>

        <div>
          <p className="text-sm text-gray-400">Link accounts</p>
          <p className="mt-1 mb-2 text-xs text-gray-500">
            Select accounts to include in goal progress (optional)
          </p>
          {accounts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-sm text-gray-500">
              No accounts available. Create an account first to track progress.
            </p>
          ) : (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.02] p-2">
              {accounts.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-200 transition hover:bg-white/5"
                >
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
                    className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50"
                  />
                  <span className="min-w-0 flex-1 truncate">{a.name}</span>
                  <span className="shrink-0 tabular-nums text-xs text-gray-500">
                    {formatCurrency(a.calculatedBalance)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={requestClose}
            className="btn-interactive w-full rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 sm:w-auto"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-interactive w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : isEditMode ? "Save changes" : "Add goal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
