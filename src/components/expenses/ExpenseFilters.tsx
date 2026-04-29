"use client";

import type { Category } from "@/types";

type ExpenseFiltersProps = {
  month: string;
  categoryId: number | null;
  categories: Category[];
  onMonthChange: (month: string) => void;
  onCategoryChange: (id: number | null) => void;
};

export default function ExpenseFilters({
  month,
  categoryId,
  categories,
  onMonthChange,
  onCategoryChange,
}: ExpenseFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <input
        type="month"
        value={month}
        onChange={(event) => onMonthChange(event.target.value)}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white sm:w-48"
      />
      <select
        value={categoryId ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          onCategoryChange(value ? Number(value) : null);
        }}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white sm:w-56"
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </div>
  );
}
