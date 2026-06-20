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
  accountId: string;
  accountName: string;
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
  accountId: string;
  expenseDate?: string;
}

export type AccountType = "CHECKING" | "SAVINGS" | "INVESTMENT";

export interface Account {
  id: string;
  name: string;
  accountType: AccountType;
  openingBalance: number;
  manualBalance: number | null;
  manualBalanceUpdatedAt: string | null;
  createdAt: string;
  calculatedBalance: number;
  totalIncome: number;
  totalExpenses: number;
  contributedAmount: number | null;
  currentValue: number | null;
  returnAmount: number | null;
  returnPercentage: number | null;
  platform: string | null;
  instrument: string | null;
  assetType: string | null;
}

export interface CreateAccountPayload {
  name: string;
  accountType: AccountType;
  openingBalance: number;
  platform?: string;
  instrument?: string;
  assetType?: string;
}

export interface UpdateAccountPayload {
  name: string;
  accountType: AccountType;
  platform?: string;
  instrument?: string;
  assetType?: string;
}

export interface ManualBalancePayload {
  manualBalance: number;
  alsoSetAsOpeningBalance?: boolean;
}

export interface CreateTransferPayload {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  transferDate: string;
  note?: string;
}

export interface Transfer {
  id: string;
  fromAccountName: string;
  toAccountName: string;
  amount: number;
  note?: string;
  transferDate: string;
  createdAt: string;
  isRevert?: boolean;
  isReversal?: boolean;
  originalTransferId?: string | null;
  reversalOfTransferId?: string | null;
  revertedTransferId?: string | null;
  transferType?: string | null;
}

export interface InvestmentCheckpoint {
  id: string;
  value: number;
  recordedAt: string;
  note: string | null;
}

export interface CreateCheckpointPayload {
  value: number;
  note?: string;
}

export interface IncomeCategory {
  id: number;
  name: string;
  icon: string;
}

export interface Income {
  id: string;
  amount: number;
  note: string | null;
  incomeCategoryId: number;
  categoryName: string;
  categoryIcon: string;
  accountId: string;
  accountName: string;
  incomeDate: string;
  createdAt: string;
}

export interface CreateIncomePayload {
  amount: number;
  note?: string;
  incomeCategoryId: number;
  accountId: string;
  incomeDate: string;
}

export type GoalType = "SHORT_TERM" | "LONG_TERM";

export interface LinkedAccountSummary {
  id: string;
  name: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'INVESTMENT';
  calculatedBalance: number;
}

export interface Goal {
  id: string;
  name: string;
  description: string | null;
  targetAmount: number;
  savedAmount: number; // derived from linked accounts
  goalType: GoalType;
  deadline: string | null;
  createdAt: string;
  isActive: boolean;
  progressPercentage: number;
  daysRemaining: number;
  isOverdue: boolean;
  linkedAccounts: LinkedAccountSummary[];
}

export interface CreateGoalRequest {
  name: string;
  description?: string;
  targetAmount: number;
  goalType: GoalType;
  deadline?: string;
  accountIds?: string[];
}

export interface WeeklySummary {
  id: string;
  weekStart: string;
  weekEnd: string;
  summaryText: string;
  totalSpent: number;
  generatedAt: string;
  provider: string;
  model: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  model?: string;
  timestamp: string;
}

export interface AiTaskConfig {
  provider: 'lmstudio' | 'groq';
  model: string;
}

export interface AiConfig {
  chat: AiTaskConfig;
  summary: AiTaskConfig;
  availableModels: {
    lmstudio: string[];
    groq: string[];
  };
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  reply: string;
  provider: string;
  model: string;
  functionCallsUsed: string[];
}

export type {
  Budget,
  BudgetRequest,
  BudgetResponse,
  BudgetSummaryItem,
} from "@/types/budget";
