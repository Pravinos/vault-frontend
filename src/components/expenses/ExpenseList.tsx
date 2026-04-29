"use client";

import { Pencil, Receipt, Trash2 } from "lucide-react";

import Badge from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Expense } from "@/types";

type ExpenseListProps = {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
};

export default function ExpenseList({
  expenses,
  onEdit,
  onDelete,
}: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-800 py-16 text-gray-400">
        <Receipt className="mb-3 h-8 w-8" />
        <p className="text-sm">No expenses found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {expenses.map((expense) => {
        const noteLabel = expense.note?.trim() || expense.category.name;

        return (
          <div
            key={expense.id}
            className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-200 sm:flex-row sm:items-center"
          >
            <div className="flex flex-1 items-start gap-3">
              <Badge category={expense.category.name} />
              <div>
                <p className="text-sm font-medium text-white">{noteLabel}</p>
                <p className="text-xs text-gray-400">
                  {expense.category.name}
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-300 sm:w-40">
              {formatDate(expense.expenseDate)}
            </div>
            <div className="flex items-center justify-between sm:w-52 sm:justify-end sm:gap-4">
              <span className="text-sm font-semibold text-emerald-400">
                {formatCurrency(expense.amount)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(expense)}
                  className="rounded-md p-1 text-gray-300 hover:text-white"
                  aria-label="Edit expense"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Delete this expense?")) {
                      onDelete(expense.id);
                    }
                  }}
                  className="rounded-md p-1 text-gray-300 hover:text-red-300"
                  aria-label="Delete expense"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
