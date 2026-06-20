import { useQuery } from '@tanstack/react-query'

import {
  fetchDashboard,
  getBudgets,
  getBudgetSummary,
  getExpenseSummary,
  getIncomeSummary,
} from '@/lib/api'
import { mergeBudgetSummaryItems } from '@/lib/highlightedBudgets'
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

export async function fetchDashboardData() {
  const monthRange = getLastNMonths(6)
  const currentMonth = monthRange[monthRange.length - 1] ?? toYearMonth(new Date())

  const [dashboard, expenseSummaries, incomeSummaries, budgetsList, budgetSummary] =
    await Promise.all([
      fetchDashboard(),
      Promise.all(monthRange.map((month) => getExpenseSummary(month))),
      Promise.all(monthRange.map((month) => getIncomeSummary(month))),
      getBudgets(currentMonth),
      getBudgetSummary(currentMonth),
    ])

  return {
    dashboard,
    expenseSummaries,
    incomeSummaries,
    monthRange,
    currentMonth,
    budgetItems: mergeBudgetSummaryItems(budgetsList, budgetSummary),
  }
}

export const dashboardQueryOptions = {
  queryKey: queryKeys.dashboard,
  queryFn: fetchDashboardData,
  staleTime: 2 * 60 * 1000,
}

export function useDashboard() {
  return useQuery(dashboardQueryOptions)
}
