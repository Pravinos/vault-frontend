import { useQuery } from '@tanstack/react-query'

import { getAccountTransfers } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useAccountTransfers(accountId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.accountTransfers(accountId ?? ''),
    queryFn: () => getAccountTransfers(accountId!),
    staleTime: 2 * 60 * 1000,
    enabled: !!accountId && enabled,
    select: (data) =>
      [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
  })
}
