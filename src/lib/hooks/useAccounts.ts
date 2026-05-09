import { useQuery } from '@tanstack/react-query'

import { getAccounts } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: getAccounts,
    staleTime: 5 * 60 * 1000,
  })
}
