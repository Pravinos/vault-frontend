import { useQuery } from '@tanstack/react-query'

import { fetchDashboard, getExpenseSummary, getIncomeSummary } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'

function toYearMonth(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function getLastNMonths(count: number): string[] {
  const months: string[] = []
  const now = new Date()
  for (let index = count - 1; index >= 0; index -= 1) {
    months.push(toYearMonth(new Date(now.getFullYear(), now.getMonth() - index, 1)))
  }
  return months
}

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const monthRange = getLastNMonths(6)
      const [dashboard, expenseSummaries, incomeSummaries] = await Promise.all([
        fetchDashboard(),
        Promise.all(monthRange.map((month) => getExpenseSummary(month))),
        Promise.all(monthRange.map((month) => getIncomeSummary(month))),
      ])
      return { dashboard, expenseSummaries, incomeSummaries, monthRange }
    },
    staleTime: 2 * 60 * 1000,
  })
}
