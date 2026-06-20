export interface Budget {
  id: string;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  month: string;
  amount: number;
}

export interface BudgetSummaryItem {
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  status: "ON_TRACK" | "WARNING" | "OVER_BUDGET";
}
