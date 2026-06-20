export const queryKeys = {
  // Accounts
  accounts:           ['accounts']                                as const,
  account:            (id: string) => ['account', id]            as const,
  accountTransfers:   (id: string) => ['account-transfers', id]  as const,
  accountCheckpoints: (id: string) => ['checkpoints', id]        as const,

  // Expenses
  expenses: (month: string) => ['expenses', month] as const,
  expenseHeatmaps: ['expenses', 'heatmap'] as const,
  expenseHeatmap: (year: number) => ['expenses', 'heatmap', year] as const,

  // Income
  income: (month: string) => ['income', month] as const,

  // Budgets
  budgets: (month: string) => ['budgets', month] as const,
  budgetSummary: (month: string) => ['budgets', 'summary', month] as const,

  // Dashboard
  dashboard:     ['dashboard']      as const,

  // Goals
  goals:         ['goals']          as const,
  goal:          (id: string) => ['goals', id] as const,

  // Summaries & AI
  summaries:     ['summaries']      as const,
  latestSummary: ['latest-summary'] as const,
  aiSettings:    ['ai-settings']    as const,

  // Reference data
  categories:       ['categories']        as const,
  incomeCategories: ['income-categories'] as const,
}
