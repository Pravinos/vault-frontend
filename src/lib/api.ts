import axios, { type InternalAxiosRequestConfig } from "axios";

/**
 * API base config:
 * Local dev URL: http://localhost:8080
 * Production URL: https://vault-api-0uue.onrender.com
 * CORS is currently open (*) with no credentials.
 * If the backend enables credentials, update CORS to explicit origins and coordinate withCredentials.
 */

import type {
  Account,
  AiConfig,
  Category,
  ChatRequest,
  ChatResponse,
  ContributeRequest,
  CreateAccountPayload,
  CreateCheckpointPayload,
  CreateExpenseRequest,
  CreateGoalRequest,
  CreateIncomePayload,
  Expense,
  ExpenseMonthlySummary,
  ExpenseStats,
  Goal,
  Income,
  IncomeCategory,
  InvestmentCheckpoint,
  ManualBalancePayload,
  WeeklySummary,
} from "@/types";


if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not set. Provide it in .env.local (dev) or .env.production (prod)."
  );
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const api = axios.create({
  baseURL: `${apiBaseUrl}/api/v1`,
  timeout: 30000,
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as
      | (InternalAxiosRequestConfig & { __retry?: boolean })
      | undefined;
    const status = error.response?.status;
    const shouldRetry =
      (status === 502 || status === 504) && config && !config.__retry;

    if (shouldRetry) {
      config.__retry = true;
      await wait(5000);
      return api.request(config);
    }

    if (process.env.NODE_ENV === "development") {
      console.error("API error:", error);
    }

    return Promise.reject(error);
  }
);

// Categories
export async function getCategories(): Promise<Category[]> {
  const response = await api.get<Category[]>("/categories");
  return response.data;
}

// Expenses
export async function getExpenses(params?: {
  month?: string;
  categoryId?: number;
}): Promise<Expense[]> {
  const response = await api.get<Expense[]>("/expenses", { params });
  return response.data;
}

export async function createExpense(
  data: CreateExpenseRequest
): Promise<Expense> {
  const response = await api.post<Expense>("/expenses", data);
  return response.data;
}

export async function updateExpense(
  id: string,
  data: CreateExpenseRequest
): Promise<Expense> {
  const response = await api.put<Expense>(`/expenses/${id}`, data);
  return response.data;
}

export async function deleteExpense(id: string): Promise<void> {
  await api.delete<void>(`/expenses/${id}`);
}

export async function getExpenseSummary(
  month?: string
): Promise<ExpenseMonthlySummary> {
  const response = await api.get<ExpenseMonthlySummary>("/expenses/summary", {
    params: month ? { month } : undefined,
  });
  return response.data;
}

export async function getExpenseStats(): Promise<ExpenseStats> {
  const response = await api.get<ExpenseStats>("/expenses/stats");
  return response.data;
}

// Accounts
export async function getAccounts(): Promise<Account[]> {
  const response = await api.get<Account[]>("/accounts");
  return response.data;
}

export async function getAccount(id: string): Promise<Account> {
  const response = await api.get<Account>(`/accounts/${id}`);
  return response.data;
}

export async function createAccount(
  payload: CreateAccountPayload
): Promise<Account> {
  const response = await api.post<Account>("/accounts", payload);
  return response.data;
}

export async function updateAccount(
  id: string,
  payload: CreateAccountPayload
): Promise<Account> {
  const response = await api.put<Account>(`/accounts/${id}`, payload);
  return response.data;
}

export async function deactivateAccount(id: string): Promise<void> {
  await api.delete<void>(`/accounts/${id}`);
}

export async function updateManualBalance(
  id: string,
  payload: ManualBalancePayload
): Promise<Account> {
  const endpoints = [
    `/accounts/${id}/manual-balance`,
    `/accounts/${id}/manual-balance/update`,
    `/accounts/${id}/balance`,
    `/accounts/${id}/manualBalance`,
  ];
  const openingBalanceFlag = payload.alsoSetAsOpeningBalance;
  const optionalOpeningBalance =
    openingBalanceFlag === true
      ? { alsoSetAsOpeningBalance: true }
      : {};

  const payloadVariants = [
    {
      manualBalance: payload.manualBalance,
      ...optionalOpeningBalance,
    },
    {
      balance: payload.manualBalance,
      ...optionalOpeningBalance,
    },
    {
      balance: payload.manualBalance,
      ...(openingBalanceFlag === true ? { alsoSetOpeningBalance: true } : {}),
    },
    {
      amount: payload.manualBalance,
      ...optionalOpeningBalance,
    },
    {
      manualBalance: payload.manualBalance.toString(),
      ...optionalOpeningBalance,
    },
  ];

  const methods: Array<"patch" | "put" | "post"> = ["patch", "put", "post"];
  let lastError: unknown;
  let attempts = 0;

  for (const endpoint of endpoints) {
    for (const variant of payloadVariants) {
      for (const method of methods) {
        attempts += 1;
        try {
          const response = await api.request<Account>({
            method,
            url: endpoint,
            data: variant,
          });

          if (response.data) {
            return response.data;
          }

          return getAccount(id);
        } catch (requestError) {
          lastError = requestError;
        }
      }
    }
  }

  if (axios.isAxiosError(lastError)) {
    const status = lastError.response?.status;
    const statusText = status ? `status ${status}` : "no status";
    throw new Error(`Unable to update manual balance (${statusText}) after ${attempts} attempts.`);
  }

  throw new Error(`Unable to update manual balance after ${attempts} attempts.`);
}

// Checkpoints
export async function getCheckpoints(
  accountId: string
): Promise<InvestmentCheckpoint[]> {
  const response = await api.get<InvestmentCheckpoint[]>(
    `/accounts/${accountId}/checkpoints`
  );
  return response.data;
}

export async function addCheckpoint(
  accountId: string,
  payload: CreateCheckpointPayload
): Promise<InvestmentCheckpoint> {
  const response = await api.post<InvestmentCheckpoint>(
    `/accounts/${accountId}/checkpoints`,
    payload
  );
  return response.data;
}

// Income
export async function getIncome(params?: {
  month?: string;
  accountId?: string;
}): Promise<Income[]> {
  const response = await api.get<Income[]>("/income", { params });
  return response.data;
}

export async function createIncome(payload: CreateIncomePayload): Promise<Income> {
  const response = await api.post<Income>("/income", payload);
  return response.data;
}

export async function updateIncome(
  id: string,
  payload: CreateIncomePayload
): Promise<Income> {
  const response = await api.put<Income>(`/income/${id}`, payload);
  return response.data;
}

export async function deleteIncome(id: string): Promise<void> {
  await api.delete<void>(`/income/${id}`);
}

export async function getIncomeSummary(
  month?: string
): Promise<Record<string, number>> {
  const response = await api.get<Record<string, number>>("/income/summary", {
    params: month ? { month } : undefined,
  });
  return response.data;
}

export async function getIncomeCategories(): Promise<IncomeCategory[]> {
  const response = await api.get<IncomeCategory[]>("/income-categories");
  return response.data;
}

// Goals
export async function getGoals(): Promise<Goal[]> {
  const response = await api.get<Goal[]>("/goals");
  return response.data;
}

export async function getGoal(id: string): Promise<Goal> {
  const response = await api.get<Goal>(`/goals/${id}`);
  return response.data;
}

export async function createGoal(data: CreateGoalRequest): Promise<Goal> {
  const response = await api.post<Goal>("/goals", data);
  return response.data;
}

export async function updateGoal(
  id: string,
  data: CreateGoalRequest
): Promise<Goal> {
  const response = await api.put<Goal>(`/goals/${id}`, data);
  return response.data;
}

export async function deactivateGoal(id: string): Promise<void> {
  await api.delete<void>(`/goals/${id}`);
}

export async function contributeToGoal(
  id: string,
  data: ContributeRequest
): Promise<Goal> {
  const response = await api.post<Goal>(`/goals/${id}/contribute`, data);
  return response.data;
}

// Summaries
export async function getLatestSummary(): Promise<WeeklySummary> {
  const response = await api.get<WeeklySummary>("/summaries/latest");
  return response.data;
}

export async function getAllSummaries(): Promise<WeeklySummary[]> {
  const response = await api.get<WeeklySummary[]>("/summaries");
  return response.data;
}

export async function generateWeeklySummary(): Promise<WeeklySummary> {
  const response = await api.post<WeeklySummary>("/ai/summaries/generate");
  return response.data;
}

// AI Chat & Config
export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  const response = await api.post<ChatResponse>("/ai/chat", req);
  return response.data;
}

export async function getAiConfig(): Promise<AiConfig> {
  const response = await api.get<AiConfig>("/ai/config");
  return response.data;
}

export async function updateAiConfig(update: {
  task: string;
  provider: string;
  model: string;
}): Promise<AiConfig> {
  const response = await api.patch<AiConfig>("/ai/config", update);
  return response.data;
}

export async function getLmStudioModels(): Promise<string[]> {
  const response = await api.get<string[]>("/ai/models/lmstudio");
  return response.data;
}

export async function getGroqModels(): Promise<string[]> {
  const response = await api.get<string[]>("/ai/models/groq");
  return response.data;
}
