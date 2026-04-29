"use client";

import { useEffect, useState } from "react";

import CategoryChart from "@/components/dashboard/CategoryChart";
import StatsBar from "@/components/dashboard/StatsBar";
import WeeklySummaryCard from "@/components/dashboard/WeeklySummaryCard";
import Skeleton from "@/components/ui/Skeleton";
import ErrorMessage from "@/components/ui/ErrorMessage";
import TopBar from "@/components/layout/TopBar";
import {
  getExpenseStats,
  getExpenseSummary,
  getLatestSummary,
} from "@/lib/api";
import { getMonthString } from "@/lib/utils";
import type { ExpenseMonthlySummary, ExpenseStats, WeeklySummary } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [summary, setSummary] = useState<ExpenseMonthlySummary | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const month = getMonthString();
        const [statsData, summaryData, weeklyData] = await Promise.all([
          getExpenseStats(),
          getExpenseSummary(month),
          getLatestSummary(),
        ]);

        setStats(statsData);
        setSummary(summaryData);
        setWeeklySummary(weeklyData);
      } catch (err) {
        setError("Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Dashboard" />
      <div className="flex-1 space-y-6 px-6 py-6">
        {error ? (
          <ErrorMessage message={error} onRetry={() => window.location.reload()} />
        ) : loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} variant="stat" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <Skeleton variant="chart" />
              </div>
              <div className="lg:col-span-2">
                <Skeleton variant="card" />
              </div>
            </div>
          </div>
        ) : stats && summary ? (
          <div className="space-y-6">
            <StatsBar stats={stats} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <CategoryChart summary={summary} />
              </div>
              <div className="lg:col-span-2">
                <WeeklySummaryCard summary={weeklySummary} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
