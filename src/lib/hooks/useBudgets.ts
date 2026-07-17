import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteBudget, getBudgets, getBudgetSummary, upsertBudget } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useBudgets(month: string) {
  return useQuery({
    queryKey: queryKeys.budgets(month),
    queryFn: () => getBudgets(month),
    staleTime: 3 * 60 * 1000,
    enabled: !!month,
  });
}

export function useBudgetSummary(month: string) {
  return useQuery({
    queryKey: queryKeys.budgetSummary(month),
    queryFn: () => getBudgetSummary(month),
    staleTime: 3 * 60 * 1000,
    enabled: !!month,
  });
}

// Invalidate every budgets-scoped query. The ["budgets"] prefix covers both the
// per-month budgets list (["budgets", month]) and the budget summary
// (["budgets", "summary", month]), so edited amounts refresh immediately instead
// of the summary cache serving a stale budgetAmount for its staleTime window.
function invalidateBudgetQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["budgets"] });
  void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertBudget,
    onSuccess: () => invalidateBudgetQueries(qc),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => invalidateBudgetQueries(qc),
  });
}
