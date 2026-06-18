import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'

import { getAccountTransfers } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Account, Transfer } from '@/types'

export function resolveLatestTransferRecipientAccountId(
  accounts: Account[],
  transferLists: Array<Transfer[] | undefined>
): string | null {
  let latestTransfer: Transfer | null = null

  for (const transfers of transferLists) {
    if (!transfers) {
      continue
    }

    for (const transfer of transfers) {
      if (
        !latestTransfer ||
        new Date(transfer.createdAt).getTime() > new Date(latestTransfer.createdAt).getTime()
      ) {
        latestTransfer = transfer
      }
    }
  }

  if (!latestTransfer) {
    return null
  }

  return accounts.find((account) => account.name === latestTransfer.toAccountName)?.id ?? null
}

export function useLatestTransferRecipientAccountId(
  accounts: Account[],
  enabled: boolean
) {
  const transferQueries = useQueries({
    queries: accounts.map((account) => ({
      queryKey: queryKeys.accountTransfers(account.id),
      queryFn: () => getAccountTransfers(account.id),
      enabled: enabled && accounts.length >= 2,
      staleTime: 2 * 60 * 1000,
    })),
  })

  const isLoading = enabled && transferQueries.some((query) => query.isLoading)

  const recipientAccountId = useMemo(
    () =>
      resolveLatestTransferRecipientAccountId(
        accounts,
        transferQueries.map((query) => query.data)
      ),
    [accounts, transferQueries]
  )

  return { recipientAccountId, isLoading }
}
