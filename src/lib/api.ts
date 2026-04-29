import axios from "axios";

import type {
  Category,
  ContributeRequest,
  CreateExpenseRequest,
  CreateGoalRequest,
  Expense,
  ExpenseMonthlySummary,
  ExpenseStats,
  Goal,
  WeeklySummary,
} from "@/types";


if (!process.env.NEXT_PUBLIC_API_URL) {
  if (process.env.NODE_ENV === "development") {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set in .env.local. Please set it to your backend URL."
    );
  }
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const api = axios.create({
  baseURL: `${apiBaseUrl}/api/v1`,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
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
  await api.post<void>(`/goals/${id}/deactivate`);
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
