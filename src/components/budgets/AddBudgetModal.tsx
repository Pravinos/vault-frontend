"use client";

import { useEffect, useState } from "react";

import Modal from "@/components/ui/Modal";
import SelectField from "@/components/ui/SelectField";
import { isValidBudgetAmount } from "@/lib/budgetStatus";
import type { Category } from "@/types";

type AddBudgetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSubmit: (categoryId: number, amount: number) => Promise<void>;
  isSubmitting: boolean;
};

export default function AddBudgetModal({
  isOpen,
  onClose,
  categories,
  onSubmit,
  isSubmitting,
}: AddBudgetModalProps) {
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setCategoryId("");
      setAmount("");
    }
  }, [isOpen]);

  const reset = () => {
    setCategoryId("");
    setAmount("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (categoryId === "") return;

    const parsed = Number.parseFloat(amount);
    if (!isValidBudgetAmount(parsed)) return;

    try {
      await onSubmit(categoryId, parsed);
      reset();
      onClose();
    } catch {
      // Parent handles error toast; keep modal open with current values.
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Budget">
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <div>
          <label htmlFor="budget-category" className="mb-1.5 block text-sm text-gray-400">
            Category
          </label>
          <SelectField
            id="budget-category"
            value={categoryId}
            onChange={(event) => {
              const value = event.target.value;
              setCategoryId(value ? Number(value) : "");
            }}
            required
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </SelectField>
        </div>

        <div>
          <label htmlFor="budget-amount" className="mb-1.5 block text-sm text-gray-400">
            Monthly budget
          </label>
          <input
            id="budget-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
            placeholder="0.00"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder:text-gray-600 focus:border-teal-500/50 focus:outline-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="btn-interactive flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || categoryId === "" || !amount}
            className="btn-interactive flex-1 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-400 disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Add Budget"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
