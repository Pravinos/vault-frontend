import { useMutation, useQueryClient } from '@tanstack/react-query'

import { deleteAccount, revertTransfer } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.accounts })
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard })
      qc.removeQueries({ queryKey: queryKeys.account(id) })
      qc.removeQueries({ queryKey: queryKeys.accountTransfers(id) })
      qc.removeQueries({ queryKey: queryKeys.accountCheckpoints(id) })
    },
  })
}

export function useRevertTransfer(accountId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (transferId: string) => revertTransfer(transferId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.accounts })
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard })
      if (accountId) {
        void qc.invalidateQueries({ queryKey: queryKeys.accountTransfers(accountId) })
        void qc.invalidateQueries({ queryKey: queryKeys.account(accountId) })
      }
    },
  })
}
