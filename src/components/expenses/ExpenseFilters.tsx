"use client";

import type { Account, Category } from "@/types";

type ExpenseFiltersProps = {
  month: string;
  categoryId: number | null;
  categories: Category[];
  accountId: string | null;
  accounts: Account[];
  onMonthChange: (month: string) => void;
  onCategoryChange: (id: number | null) => void;
  onAccountChange: (id: string | null) => void;
};

export default function ExpenseFilters({
  month,
  categoryId,
  categories,
  accountId,
  accounts,
  onMonthChange,
  onCategoryChange,
  onAccountChange,
}: ExpenseFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        type="month"
        value={month}
        onChange={(event) => onMonthChange(event.target.value)}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-base text-white focus:border-emerald-500 focus:outline-none sm:w-48"
      />
      <select
        value={categoryId ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          onCategoryChange(value ? Number(value) : null);
        }}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-base text-white focus:border-emerald-500 focus:outline-none sm:w-52"
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <select
        value={accountId ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          onAccountChange(value || null);
        }}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-base text-white focus:border-emerald-500 focus:outline-none sm:w-52"
      >
        <option value="">All accounts</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
    </div>
  );
}
