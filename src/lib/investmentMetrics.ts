import type { InvestmentCheckpoint } from "@/types";

type InvestmentMetricsSource = {
  contributedAmount?: number | null;
  currentValue?: number | null;
  returnAmount?: number | null;
  returnPercentage?: number | null;
  openingBalance?: number;
  totalIncome?: number;
  totalExpenses?: number;
};

export type InvestmentMetrics = {
  contributedAmount: number | null;
  currentValue: number | null;
  returnAmount: number | null;
  returnPercentage: number | null;
};

function getLatestCheckpointValue(checkpoints: InvestmentCheckpoint[]): number | null {
  if (checkpoints.length === 0) {
    return null;
  }

  const latest = [...checkpoints].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  )[0];

  return latest.value;
}

function resolveContributedAmount(source: InvestmentMetricsSource): number | null {
  if (typeof source.contributedAmount === "number") {
    return source.contributedAmount;
  }

  if (
    typeof source.currentValue === "number" &&
    typeof source.returnAmount === "number"
  ) {
    return source.currentValue - source.returnAmount;
  }

  if (typeof source.openingBalance === "number") {
    const income = source.totalIncome ?? 0;
    const expenses = source.totalExpenses ?? 0;
    return source.openingBalance + income - expenses;
  }

  return null;
}

export function deriveInvestmentMetrics(
  source: InvestmentMetricsSource,
  checkpoints: InvestmentCheckpoint[] = []
): InvestmentMetrics {
  const contributedAmount = resolveContributedAmount(source);
  const checkpointValue = getLatestCheckpointValue(checkpoints);
  const apiCurrentValue =
    typeof source.currentValue === "number" ? source.currentValue : null;
  const currentValue = checkpointValue ?? apiCurrentValue ?? contributedAmount;

  if (contributedAmount === null || currentValue === null) {
    return {
      contributedAmount,
      currentValue,
      returnAmount: source.returnAmount ?? null,
      returnPercentage: source.returnPercentage ?? null,
    };
  }

  const returnAmount = currentValue - contributedAmount;
  const returnPercentage =
    contributedAmount !== 0 ? (returnAmount / contributedAmount) * 100 : null;

  return {
    contributedAmount,
    currentValue,
    returnAmount,
    returnPercentage,
  };
}

export function applyInvestmentReturnMetrics<T extends InvestmentMetricsSource>(
  account: T,
  checkpoints: InvestmentCheckpoint[] = []
): T & Pick<InvestmentMetrics, "currentValue" | "returnAmount" | "returnPercentage"> {
  const metrics = deriveInvestmentMetrics(account, checkpoints);

  return {
    ...account,
    currentValue: metrics.currentValue,
    returnAmount: metrics.returnAmount,
    returnPercentage: metrics.returnPercentage,
  };
}
