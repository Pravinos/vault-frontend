import { useMutation, useQueryClient } from '@tanstack/react-query'

import { deleteExpense } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useDeleteExpense(month: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.expenses(month) })
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard })
      void qc.invalidateQueries({ queryKey: queryKeys.accounts })
    },
  })
}
