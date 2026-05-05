"use client";

import SelectField from "@/components/ui/SelectField";
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
    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
      <input
        type="month"
        value={month}
        onChange={(event) => onMonthChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 sm:w-auto"
      />
      <SelectField
        value={categoryId ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          onCategoryChange(value ? Number(value) : null);
        }}
        className="sm:w-52"
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.icon} {category.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        value={accountId ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          onAccountChange(value || null);
        }}
        className="sm:w-52"
      >
        <option value="">All accounts</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </SelectField>
    </div>
  );
}
