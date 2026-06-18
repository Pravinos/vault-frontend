import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { getCheckpoints } from "@/lib/api";
import { applyInvestmentReturnMetrics } from "@/lib/investmentMetrics";
import { queryKeys } from "@/lib/queryKeys";
import type { InvestmentMetrics } from "@/lib/investmentMetrics";

type MetricsAccount = {
  id: string;
  accountType: string;
  contributedAmount?: number | null;
  currentValue?: number | null;
  returnAmount?: number | null;
  returnPercentage?: number | null;
  openingBalance?: number;
  totalIncome?: number;
  totalExpenses?: number;
};

export function useInvestmentMetricsMap<T extends MetricsAccount>(accounts: T[]) {
  const investmentAccounts = useMemo(
    () => accounts.filter((account) => account.accountType === "INVESTMENT"),
    [accounts]
  );

  const checkpointQueries = useQueries({
    queries: investmentAccounts.map((account) => ({
      queryKey: queryKeys.accountCheckpoints(account.id),
      queryFn: () => getCheckpoints(account.id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  return useMemo(() => {
    const metricsByAccountId = new Map<
      string,
      Pick<InvestmentMetrics, "currentValue" | "returnAmount" | "returnPercentage">
    >();

    investmentAccounts.forEach((account, index) => {
      const checkpoints = checkpointQueries[index]?.data ?? [];
      const enriched = applyInvestmentReturnMetrics(account, checkpoints);
      metricsByAccountId.set(account.id, {
        currentValue: enriched.currentValue,
        returnAmount: enriched.returnAmount,
        returnPercentage: enriched.returnPercentage,
      });
    });

    return metricsByAccountId;
  }, [checkpointQueries, investmentAccounts]);
}
