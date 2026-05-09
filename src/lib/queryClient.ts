import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,      // 2 min default
      gcTime: 10 * 60 * 1000,         // keep unused cache 10 min
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})
