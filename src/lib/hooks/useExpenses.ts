import { useQuery } from '@tanstack/react-query'

import { getExpenses, getExpenseSummary } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useExpenses(month: string) {
  return useQuery({
    queryKey: queryKeys.expenses(month),
    queryFn: async () => {
      const [expenses, summary] = await Promise.all([
        getExpenses({ month: month || undefined }),
        getExpenseSummary(month || undefined),
      ])
      return { expenses, summary }
    },
    staleTime: 3 * 60 * 1000,
    enabled: !!month,
  })
}
