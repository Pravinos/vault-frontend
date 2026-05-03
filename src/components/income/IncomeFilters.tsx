"use client";

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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <input
        type="month"
        value={month}
        onChange={(event) => onMonthChange(event.target.value)}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white sm:w-48"
      />
      <select
        value={accountId ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          onAccountChange(value || null);
        }}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white sm:w-56"
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
