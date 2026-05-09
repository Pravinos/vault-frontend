import { useMutation, useQueryClient } from '@tanstack/react-query'

import { deleteWeeklySummary, generateWeeklySummary } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useDeleteSummary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteWeeklySummary(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.summaries })
      void qc.invalidateQueries({ queryKey: queryKeys.latestSummary })
    },
  })
}

export function useGenerateSummaryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: generateWeeklySummary,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.summaries })
      void qc.invalidateQueries({ queryKey: queryKeys.latestSummary })
    },
  })
}
