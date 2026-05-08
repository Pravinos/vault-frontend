"use client";

import SelectField from "@/components/ui/SelectField";
import MonthNavigator from "@/components/ui/MonthNavigator";
import type { Account } from "@/types";

type IncomeFiltersProps = {
  month: string;
  accountId: string | null;
  accounts: Account[];
  onMonthChange: (month: string) => void;
  onAccountChange: (id: string | null) => void;
};

export default function IncomeFilters({
  month,
  accountId,
  accounts,
  onMonthChange,
  onAccountChange,
}: IncomeFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="w-full sm:w-auto">
        <MonthNavigator value={month} onChange={onMonthChange} />
      </div>
      <SelectField
        value={accountId ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          onAccountChange(value || null);
        }}
        className="sm:w-56"
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
