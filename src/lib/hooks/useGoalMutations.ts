import { useMutation, useQueryClient } from '@tanstack/react-query'

import { deactivateGoal } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useDeactivateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateGoal(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.goals })
    },
  })
}
