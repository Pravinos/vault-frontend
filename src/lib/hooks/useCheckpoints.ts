import { useQuery } from '@tanstack/react-query'

import { getCheckpoints } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useCheckpoints(accountId: string) {
  return useQuery({
    queryKey: queryKeys.accountCheckpoints(accountId),
    queryFn: () => getCheckpoints(accountId),
    staleTime: 10 * 60 * 1000,
    enabled: !!accountId,
  })
}
