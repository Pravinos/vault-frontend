import { useQuery } from '@tanstack/react-query'

import { getAiConfig } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

export function useAiSettings() {
  return useQuery({
    queryKey: queryKeys.aiSettings,
    queryFn: getAiConfig,
    staleTime: Infinity,
  })
}
