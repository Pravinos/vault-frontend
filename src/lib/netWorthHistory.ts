export type NetWorthHistoryDatum = {
  month: string;
  netWorth: number;
};

export function formatShortMonth(yearMonth: string): string {
  const [yearString, monthString] = yearMonth.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return yearMonth;
  }
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

export function buildNetWorthHistory(
  monthRange: string[],
  monthlyNetCashFlow: number[],
  currentNetWorth: number
): NetWorthHistoryDatum[] {
  return monthRange.map((yearMonth, index) => {
    const futureCashFlow = monthlyNetCashFlow
      .slice(index + 1)
      .reduce((sum, amount) => sum + amount, 0);

    return {
      month: formatShortMonth(yearMonth),
      netWorth: currentNetWorth - futureCashFlow,
    };
  });
}
