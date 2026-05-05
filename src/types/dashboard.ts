export interface AccountDashboardData {
  id: string;
  name: string;
  accountType: "CHECKING" | "SAVINGS" | "INVESTMENT";
  calculatedBalance: number;
  manualBalance: number | null;
  openingBalance: number;
  sinceOpening: number;
  currentValue: number | null;
  returnAmount: number | null;
  returnPercentage: number | null;
  secondaryLabel: string;
  secondaryPositive: boolean;
}

export interface DashboardData {
  calculatedNetWorth: number;
  manualNetWorth: number | null;
  netWorthDrift: number | null;
  accounts: AccountDashboardData[];
  incomeThisMonth: number;
  expensesThisMonth: number;
  netCashFlow: number;
  incomeLastMonth: number;
  expensesLastMonth: number;
  dailyAverageExpense: number;
  topExpenseCategory: string;
  topExpenseCategoryAmount: number;
  currentMonthLabel: string;
  lastMonthLabel: string;
  expensesMoMPercent: number | null;
  incomeMoMPercent: number | null;
}
