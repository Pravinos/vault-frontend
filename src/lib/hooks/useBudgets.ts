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

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertBudget,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["budgets"] });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["budgets"] });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
