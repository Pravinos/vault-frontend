import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { getCheckpoints } from "@/lib/api";
import { applyInvestmentReturnMetrics } from "@/lib/investmentMetrics";
import { queryKeys } from "@/lib/queryKeys";
import type { InvestmentMetrics } from "@/lib/investmentMetrics";
import type { InvestmentCheckpoint } from "@/types";

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

export type InvestmentMetricsEntry = Pick<
  InvestmentMetrics,
  "currentValue" | "returnAmount" | "returnPercentage"
> & {
  latestCheckpointRecordedAt: string | null;
};

function getLatestCheckpointRecordedAt(
  checkpoints: InvestmentCheckpoint[]
): string | null {
  if (checkpoints.length === 0) {
    return null;
  }

  const latest = [...checkpoints].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  )[0];

  return latest.recordedAt;
}

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

  const isLoadingCheckpoints =
    investmentAccounts.length > 0 && checkpointQueries.some((query) => query.isLoading);

  const metricsByAccountId = useMemo(() => {
    const map = new Map<string, InvestmentMetricsEntry>();

    investmentAccounts.forEach((account, index) => {
      const checkpoints = checkpointQueries[index]?.data ?? [];
      const enriched = applyInvestmentReturnMetrics(account, checkpoints);
      map.set(account.id, {
        currentValue: enriched.currentValue,
        returnAmount: enriched.returnAmount,
        returnPercentage: enriched.returnPercentage,
        latestCheckpointRecordedAt: getLatestCheckpointRecordedAt(checkpoints),
      });
    });

    return map;
  }, [checkpointQueries, investmentAccounts]);

  return { metricsByAccountId, isLoadingCheckpoints };
}
