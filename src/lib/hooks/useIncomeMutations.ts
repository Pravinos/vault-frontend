import { useMutation, useQueryClient } from '@tanstack/react-query'

import { deleteIncome } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useDeleteIncome(month: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteIncome(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.income(month) })
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard })
      void qc.invalidateQueries({ queryKey: queryKeys.accounts })
      void qc.invalidateQueries({ queryKey: queryKeys.goals })
    },
  })
}
