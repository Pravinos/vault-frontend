import axios, { type InternalAxiosRequestConfig } from "axios";

import { clearToken, getToken } from "@/lib/auth";

/**
 * API base config:
 * Local dev URL: http://localhost:8080
 * Production URL: https://vault-api-0uue.onrender.com
 * Data API auth uses Bearer token from localStorage.
 * HttpOnly cookies are only used by Next.js middleware for page guarding.
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
  CreateTransferPayload,
  Expense,
  ExpenseMonthlySummary,
  ExpenseStats,
  Goal,
  Income,
  IncomeCategory,
  InvestmentCheckpoint,
  ManualBalancePayload,
  Transfer,
  WeeklySummary,
} from "@/types";
import type { DashboardData } from "@/types/dashboard";

export function fetchOptions(extra?: RequestInit): RequestInit {
  const headers = new Headers(extra?.headers ?? {});
  const method = (extra?.method ?? "GET").toUpperCase();
  const hasBody = extra?.body !== undefined && extra?.body !== null;

  if (!headers.has("Content-Type") && method !== "GET" && method !== "HEAD" && hasBody) {
    headers.set("Content-Type", "application/json");
  }

  if (typeof window !== "undefined" && !headers.has("Authorization")) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return {
    ...extra,
    headers,
  };
}

export async function apiFetch(url: string, options?: RequestInit) {
  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
  const targetUrl = normalizedUrl.startsWith("/api/v1/")
    ? normalizedUrl
    : `/api/v1${normalizedUrl}`;
  const res = await fetch(targetUrl, fetchOptions(options));

  if (res.status === 401) {
    return handleAuthFailure();
  }

  if (res.status === 429) {
    throw new Error("Too many requests. Please wait 15 minutes and try again.");
  }

  return res;
}

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await apiFetch("/api/v1/dashboard");
  if (!res) {
    throw new Error("Not authenticated");
  }
  if (!res.ok) {
    let details = "";
    try {
      const payload = (await res.json()) as { message?: string; error?: string };
      details = payload.message ?? payload.error ?? JSON.stringify(payload);
    } catch {
      details = await res.text().catch(() => "");
    }

    const suffix = details ? `: ${details}` : "";
    throw new Error(`Failed to load dashboard (${res.status})${suffix}`);
  }
  return res.json();
}

const api = axios.create({
  baseURL: "/api/v1",
  timeout: 30000,
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let authFailureHandling = false;

async function handleAuthFailure(): Promise<null> {
  if (authFailureHandling) {
    return null;
  }

  authFailureHandling = true;
  clearToken();

  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignore logout network errors. Redirect still recovers client state.
  }

  if (typeof window !== "undefined") {
    const target = "/login?reason=expired";
    if (`${window.location.pathname}${window.location.search}` !== target) {
      window.location.replace(target);
    }
  }

  return null;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as
      | (InternalAxiosRequestConfig & { __retry?: boolean })
      | undefined;
    const status = error.response?.status;

    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;

      if (status === 401 && pathname !== "/login") {
        await handleAuthFailure();
        return Promise.reject(error);
      }

      if (status === 401 && pathname === "/login") {
        return Promise.reject(error);
      }

      if (status === 403 && pathname !== "/login") {
        await handleAuthFailure();
        return Promise.reject(error);
      }
    }

    const shouldRetry =
      (status === 502 || status === 504) && config && !config.__retry;

    if (shouldRetry) {
      config.__retry = true;
      await wait(5000);
      return api.request(config);
    }

    const isExpectedNotFound =
      status === 404 && config?.url === "/ai/summaries/latest";

    if (process.env.NODE_ENV === "development" && !isExpectedNotFound) {
      console.error("API error:", error);
    }

    return Promise.reject(error);
  }
);

api.interceptors.request.use((config) => {
  authFailureHandling = false;
  return config;
});

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

export async function deleteAccount(id: string): Promise<void> {
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

// Transfers
export async function createTransfer(
  payload: CreateTransferPayload
): Promise<Transfer> {
  const response = await api.post<Transfer>("/transfers", payload);
  return response.data;
}

export async function getAccountTransfers(accountId: string): Promise<Transfer[]> {
  const response = await api.get<Transfer[]>(`/accounts/${accountId}/transfers`);
  return response.data;
}

export async function revertTransfer(transferId: string): Promise<Transfer> {
  const response = await api.post<Transfer>(`/transfers/${transferId}/revert`);
  return response.data;
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
export async function getWeeklySummaries(): Promise<WeeklySummary[]> {
  const response = await api.get<WeeklySummary[]>("/ai/summaries");
  return response.data;
}

export async function getLatestWeeklySummary(): Promise<WeeklySummary | null> {
  try {
    const response = await api.get<WeeklySummary>("/ai/summaries/latest");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function generateWeeklySummary(): Promise<WeeklySummary> {
  const response = await api.post<WeeklySummary>(
    "/ai/summaries/generate",
    undefined,
    { timeout: 60000 }
  );
  return response.data;
}

export async function deleteWeeklySummary(id: string): Promise<void> {
  await api.delete<void>(`/ai/summaries/${id}`);
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
