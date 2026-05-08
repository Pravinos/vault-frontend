"use client";

import SelectField from "@/components/ui/SelectField";
import MonthNavigator from "@/components/ui/MonthNavigator";
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
      <div className="w-full sm:w-auto">
        <MonthNavigator value={month} onChange={onMonthChange} />
      </div>
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
