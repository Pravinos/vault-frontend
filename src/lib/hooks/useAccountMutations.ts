import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { createTransfer, deleteAccount, revertTransfer } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { CreateTransferPayload } from '@/types'

export async function invalidateTransferBalanceQueries(qc: QueryClient) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.accounts }),
    qc.invalidateQueries({ queryKey: queryKeys.dashboard }),
    qc.invalidateQueries({ queryKey: ['account'] }),
    qc.invalidateQueries({ queryKey: ['account-transfers'] }),
  ])
}

export function useCreateTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTransferPayload) => createTransfer(payload),
    onSuccess: () => {
      void invalidateTransferBalanceQueries(qc)
    },
  })
}

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
      void invalidateTransferBalanceQueries(qc)
      if (accountId) {
        void qc.invalidateQueries({ queryKey: queryKeys.accountTransfers(accountId) })
      }
    },
  })
}
