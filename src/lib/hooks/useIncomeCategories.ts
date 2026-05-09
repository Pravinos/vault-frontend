import { useQuery } from '@tanstack/react-query'

import { getIncomeCategories } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useIncomeCategories() {
  return useQuery({
    queryKey: queryKeys.incomeCategories,
    queryFn: getIncomeCategories,
    staleTime: Infinity,
  })
}
