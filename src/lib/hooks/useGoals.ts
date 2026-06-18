import { useQuery } from '@tanstack/react-query'

import { getGoals } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals,
    queryFn: getGoals,
  })
}
