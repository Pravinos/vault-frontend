import { useMutation, useQueryClient } from '@tanstack/react-query'

import { addCheckpoint } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { CreateCheckpointPayload } from '@/types'

export function useAddCheckpoint(accountId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCheckpointPayload) => addCheckpoint(accountId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.accountCheckpoints(accountId) })
      void qc.invalidateQueries({ queryKey: queryKeys.account(accountId) })
      void qc.invalidateQueries({ queryKey: queryKeys.accounts })
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}
