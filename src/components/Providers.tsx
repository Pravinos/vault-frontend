"use client";

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { CurrencyProvider } from '@/lib/currencyContext'
import { queryClient } from '@/lib/queryClient'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        {children}
      </CurrencyProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
