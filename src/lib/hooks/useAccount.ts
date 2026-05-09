import { useQuery } from '@tanstack/react-query'

import { getAccount } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useAccount(accountId: string) {
  return useQuery({
    queryKey: queryKeys.account(accountId),
    queryFn: () => getAccount(accountId),
    staleTime: 5 * 60 * 1000,
    enabled: !!accountId,
  })
}
