export interface Category {
  id: number;
  name: string;
  icon: string;
}

export interface Expense {
  id: string;
  amount: number;
  note: string | null;
  category: Category;
  expenseDate: string;
  createdAt: string;
}

export interface ExpenseMonthlySummary {
  month: string;
  total: number;
  byCategory: { category: string; total: number }[];
}

export interface ExpenseStats {
  totalThisMonth: number;
  totalLastMonth: number;
  averagePerDay: number;
  topCategory: string;
  totalExpensesThisMonth: number;
}

export interface CreateExpenseRequest {
  amount: number;
  note?: string;
  categoryId: number;
  expenseDate?: string;
}

export type GoalType = "SHORT_TERM" | "LONG_TERM";

export interface Goal {
  id: string;
  name: string;
  description: string | null;
  targetAmount: number;
  savedAmount: number;
  goalType: GoalType;
  deadline: string | null;
  createdAt: string;
  isActive: boolean;
  progressPercentage: number;
  daysRemaining: number;
}

export interface CreateGoalRequest {
  name: string;
  description?: string;
  targetAmount: number;
  goalType: GoalType;
  deadline?: string;
}

export interface ContributeRequest {
  amount: number;
}

export interface WeeklySummary {
  id: string;
  weekStart: string;
  weekEnd: string;
  summaryText: string;
  totalSpent: number;
  generatedAt: string;
  provider: string;
}
