import { useQuery } from '@tanstack/react-query'

import { getLatestWeeklySummary } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useLatestSummary() {
  return useQuery({
    queryKey: queryKeys.latestSummary,
    queryFn: getLatestWeeklySummary,
    staleTime: 30 * 60 * 1000,
  })
}
