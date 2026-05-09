import { useQuery } from '@tanstack/react-query'

import { getWeeklySummaries } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useSummaries() {
  return useQuery({
    queryKey: queryKeys.summaries,
    queryFn: getWeeklySummaries,
    staleTime: 30 * 60 * 1000,
    select: (data) =>
      [...data].sort(
        (a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
      ),
  })
}
