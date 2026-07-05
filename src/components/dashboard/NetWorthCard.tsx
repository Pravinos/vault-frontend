"use client";

import { useEffect, useId, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LayoutDashboard, LineChart as LineChartIcon } from "lucide-react";

import { formatCurrency } from "@/lib/utils";
import type { NetWorthHistoryDatum } from "@/lib/netWorthHistory";

const VIEW_TRANSITION_MS = 300;

function formatYAxisTick(value: number) {
  const abs = Math.abs(Number(value) || 0);
  if (abs < 1000) return `${Math.round(Number(value))}`;
  if (abs < 1_000_000) return `${(Number(value) / 1000).toFixed(0)}k`;
  return `${(Number(value) / 1_000_000).toFixed(1)}M`;
}

export type NetWorthCardProps = {
  calculated: number;
  manual: number | null;
  drift: number | null;
  calculatedAnimated?: number;
  manualAnimated?: number;
  historyData: NetWorthHistoryDatum[];
};

export default function NetWorthCard({
  calculated,
  manual,
  drift,
  calculatedAnimated,
  manualAnimated,
  historyData,
}: NetWorthCardProps) {
  const [showChart, setShowChart] = useState(false);
  const [chartMounted, setChartMounted] = useState(false);
  const [chartVisible, setChartVisible] = useState(false);
  const gradientId = useId();

  const driftPositive = (drift ?? 0) >= 0;
  const headlineValue = typeof calculatedAnimated === "number" ? calculatedAnimated : calculated;
  const smallManual = typeof manualAnimated === "number" ? manualAnimated : manual ?? 0;
  const hasHistory = historyData.length > 1;
  const periodChange = hasHistory ? calculated - historyData[0].netWorth : null;
  const periodChangePositive = (periodChange ?? 0) >= 0;

  const handleToggle = () => {
    setShowChart((current) => {
      if (!current) {
        setChartMounted(true);
      }
      return !current;
    });
  };

  useEffect(() => {
    if (showChart) {
      const frame = requestAnimationFrame(() => setChartVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setChartVisible(false);
    const timer = window.setTimeout(() => setChartMounted(false), VIEW_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [showChart]);

  return (
    <div className="animate-card-enter rounded-card-lg bg-gradient-to-br from-[#1a2f2a] to-[#1a2332] p-card-md">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Net Worth</p>
        {hasHistory ? (
          <button
            type="button"
            onClick={handleToggle}
            aria-pressed={showChart}
            aria-label={showChart ? "Show net worth summary" : "Show net worth chart"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-gray-300 transition-colors duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-[0.98]"
          >
            {showChart ? (
              <>
                <LayoutDashboard className="h-3.5 w-3.5" />
                Summary
              </>
            ) : (
              <>
                <LineChartIcon className="h-3.5 w-3.5" />
                Chart
              </>
            )}
          </button>
        ) : null}
      </div>

      {/* Only the in-flow panel sets height; the hidden panel is absolute and ignored for layout */}
      <div className="relative overflow-hidden">
        <div
          className={`transition-opacity duration-300 ease-out ${
            chartVisible
              ? "pointer-events-none absolute inset-x-0 top-0 opacity-0"
              : "relative opacity-100"
          }`}
          aria-hidden={chartVisible}
        >
          <p className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {formatCurrency(headlineValue)}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-card bg-white/5 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Calculated
              </p>
              <p className="text-base font-bold text-emerald-400">{formatCurrency(headlineValue)}</p>
            </div>

            <div className="rounded-card bg-white/5 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                Manual
              </p>
              <p className={`text-base font-bold ${manual !== null ? "text-blue-400" : "text-gray-600"}`}>
                {manual !== null ? formatCurrency(smallManual) : "Not set"}
              </p>
            </div>
          </div>

          {drift !== null ? (
            <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3">
              <span className={`text-xs font-semibold ${driftPositive ? "text-emerald-400" : "text-red-400"}`}>
                {driftPositive ? "▲" : "▼"} {formatCurrency(Math.abs(drift))}
              </span>
              <span className="ml-auto text-xs text-gray-500">manual vs calculated</span>
            </div>
          ) : null}
        </div>

        {chartMounted ? (
          <div
            className={`transition-opacity duration-300 ease-out ${
              chartVisible
                ? "relative opacity-100"
                : "pointer-events-none absolute inset-x-0 top-0 opacity-0"
            }`}
            aria-hidden={!chartVisible}
          >
            <p className="mb-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {formatCurrency(headlineValue)}
            </p>
            {periodChange !== null ? (
              <p className={`mb-4 text-xs font-medium ${periodChangePositive ? "text-emerald-400" : "text-red-400"}`}>
                {periodChangePositive ? "+" : ""}
                {formatCurrency(periodChange)} over {historyData.length} months
              </p>
            ) : (
              <p className="mb-4 text-xs text-gray-500">Monthly trend</p>
            )}

            <div className="h-44 min-h-[176px] sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#334155" vertical={false} opacity={0.35} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={formatYAxisTick}
                  />
                  <Tooltip
                    cursor={{ stroke: "#10b981", strokeWidth: 1, strokeDasharray: "4 4" }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const value = Number(payload[0].value ?? 0);
                      return (
                        <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 shadow-2xl">
                          <p className="mb-1 text-sm font-semibold text-slate-100">{label}</p>
                          <p className="text-xs text-slate-300">
                            Net worth:{" "}
                            <span className="font-semibold text-emerald-400">{formatCurrency(value)}</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="netWorth"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill={`url(#${gradientId})`}
                    dot={false}
                    activeDot={{ r: 4, fill: "#10b981", stroke: "#0f172a", strokeWidth: 2 }}
                    isAnimationActive={chartVisible}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <p className="mt-3 text-[10px] text-gray-500">
              Estimated from monthly cash flow · last {historyData.length} months
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
