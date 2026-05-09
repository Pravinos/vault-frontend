import { useQuery } from '@tanstack/react-query'

import { getIncome, getIncomeSummary } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useIncome(month: string) {
  return useQuery({
    queryKey: queryKeys.income(month),
    queryFn: async () => {
      const [income, summary] = await Promise.all([
        getIncome({ month: month || undefined }),
        getIncomeSummary(month || undefined),
      ])
      return { income, summary }
    },
    staleTime: 3 * 60 * 1000,
    enabled: !!month,
  })
}
