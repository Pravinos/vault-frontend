"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useExpenseHeatmap } from "@/lib/hooks/useExpenses";
import { useFormatCurrency } from "@/lib/currencyContext";
import { getStaggerDelayMs } from "@/lib/motion";

const ROW_LABELS = ["M", "", "W", "", "F", "", ""] as const;
const CELL_SIZE = "0.75rem";
const CELL_GAP = "3px";
const DAY_LABEL_WIDTH = "0.75rem";

type ExpenseHeatmapProps = {
  year: number;
  onYearChange: (year: number) => void;
  onDayClick?: (date: string) => void;
  selectedDate?: string | null;
  enabled?: boolean;
};

function getDaysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

function getWeekColumnCount(year: number): number {
  const firstDayOfWeek = getMondayBasedDay(new Date(year, 0, 1));
  return Math.ceil((firstDayOfWeek + getDaysInYear(year)) / 7);
}

function getGridWidth(weekColumnCount: number): string {
  if (weekColumnCount <= 0) return CELL_SIZE;
  return `calc(${weekColumnCount} * ${CELL_SIZE} + ${weekColumnCount - 1} * ${CELL_GAP})`;
}

function getMondayBasedDay(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function formatHeatmapTooltip(
  dateStr: string,
  amount: number,
  formatCurrency: (amount: number) => string,
): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const formattedDate = date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (amount <= 0) {
    return `No expenses — ${formattedDate}`;
  }

  return `${formatCurrency(amount)} — ${formattedDate}`;
}

function getCellColor(totalAmount: number, maxDayAmount: number): string {
  if (totalAmount <= 0 || maxDayAmount <= 0) {
    return "bg-[#1e1e1e]";
  }

  const ratio = totalAmount / maxDayAmount;

  if (ratio < 0.25) return "bg-teal-900";
  if (ratio < 0.5) return "bg-teal-700";
  if (ratio < 0.75) return "bg-teal-500";
  return "bg-teal-300";
}

function HeatmapSkeleton({ weekColumnCount }: { weekColumnCount: number }) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-block w-fit">
        <div
          className="mb-2 h-3 skeleton-shimmer rounded"
          style={{
            marginLeft: `calc(${DAY_LABEL_WIDTH} + ${CELL_GAP})`,
            width: getGridWidth(weekColumnCount),
          }}
        />
        <div className="flex gap-1">
          <div className="flex w-3 flex-col gap-[3px] pt-0.5">
            {ROW_LABELS.map((label, index) => (
              <div key={index} className="flex h-3 items-center text-[10px]">
                {label}
              </div>
            ))}
          </div>
          <div
            className="grid gap-[3px]"
            style={{
              gridTemplateColumns: `repeat(${weekColumnCount}, ${CELL_SIZE})`,
              gridTemplateRows: `repeat(7, ${CELL_SIZE})`,
            }}
          >
            {Array.from({ length: 7 * weekColumnCount }).map((_, index) => (
              <div key={index} className="h-3 w-3 skeleton-shimmer rounded-sm" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExpenseHeatmap({
  year,
  onYearChange,
  onDayClick,
  selectedDate = null,
  enabled = true,
}: ExpenseHeatmapProps) {
  const formatCurrency = useFormatCurrency();
  const { data, isLoading, error, refetch } = useExpenseHeatmap(year, enabled);
  const weekColumnCount = getWeekColumnCount(year);
  const gridWidth = getGridWidth(weekColumnCount);

  const { monthLabels, cells } = useMemo(() => {
    const firstDay = new Date(year, 0, 1);
    const firstDayOfWeek = getMondayBasedDay(firstDay);
    const amountByDate = new Map(
      (data?.days ?? []).map((day) => [day.date, day.totalAmount])
    );
    const maxDayAmount = data?.maxDayAmount ?? 0;

    const monthLabelEntries: { label: string; column: number }[] = [];
    for (let month = 0; month < 12; month += 1) {
      const monthStart = new Date(year, month, 1);
      const dayOfYear = Math.floor(
        (monthStart.getTime() - firstDay.getTime()) / 86_400_000
      );
      monthLabelEntries.push({
        label: monthStart.toLocaleString("en-US", { month: "short" }),
        column: Math.floor((firstDayOfWeek + dayOfYear) / 7),
      });
    }

    const dayCells: {
      key: string;
      column: number;
      row: number;
      date: string;
      totalAmount: number;
      colorClass: string;
      tooltip: string;
    }[] = [];

    const daysInYear = getDaysInYear(year);

    for (let dayIndex = 0; dayIndex < daysInYear; dayIndex += 1) {
      const date = new Date(year, 0, dayIndex + 1);
      const dateStr = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const totalAmount = amountByDate.get(dateStr) ?? 0;
      const position = firstDayOfWeek + dayIndex;

      dayCells.push({
        key: dateStr,
        column: Math.floor(position / 7) + 1,
        row: (position % 7) + 1,
        date: dateStr,
        totalAmount,
        colorClass: getCellColor(totalAmount, maxDayAmount),
        tooltip: formatHeatmapTooltip(dateStr, totalAmount, formatCurrency),
      });
    }

    return { monthLabels: monthLabelEntries, cells: dayCells };
  }, [data, formatCurrency, year]);

  return (
    <div className="w-fit max-w-full rounded-card border border-[#2a2a2a] bg-[#161616] p-card-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
          Spending Activity
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onYearChange(year - 1)}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Previous year"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[3rem] text-center text-sm font-medium text-white">
            {year}
          </span>
          <button
            type="button"
            onClick={() => onYearChange(year + 1)}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Next year"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <HeatmapSkeleton weekColumnCount={weekColumnCount} />
      ) : error ? (
        <div className="space-y-2 py-1">
          <p className="text-sm text-gray-500">Unable to load spending activity.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-xs text-emerald-400 transition-colors hover:text-emerald-300"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="max-w-full overflow-x-auto">
          <div className="inline-block w-fit">
            <div
              className="relative mb-2 h-3"
              style={{
                marginLeft: `calc(${DAY_LABEL_WIDTH} + ${CELL_GAP})`,
                width: gridWidth,
              }}
            >
              {monthLabels.map(({ label, column }, index) => {
                const nextColumn = monthLabels[index + 1]?.column ?? weekColumnCount;
                const span = Math.max(nextColumn - column, 1);

                return (
                  <span
                    key={`${label}-${column}`}
                    className="absolute text-[10px] text-gray-500"
                    style={{
                      left: `calc(${column} * (${CELL_SIZE} + ${CELL_GAP}))`,
                      width: `calc(${span} * (${CELL_SIZE} + ${CELL_GAP}) - ${CELL_GAP})`,
                    }}
                  >
                    {label}
                  </span>
                );
              })}
            </div>

            <div className="flex gap-1">
              <div className="flex w-3 flex-col gap-[3px] pt-0.5">
                {ROW_LABELS.map((label, index) => (
                  <div
                    key={index}
                    className="flex h-3 items-center text-[10px] leading-none text-gray-500"
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div
                className="grid gap-[3px]"
                style={{
                  gridTemplateColumns: `repeat(${weekColumnCount}, ${CELL_SIZE})`,
                  gridTemplateRows: `repeat(7, ${CELL_SIZE})`,
                }}
              >
                {cells.map((cell) => {
                  const isSelected = cell.date === selectedDate;

                  return (
                    <button
                      key={cell.key}
                      type="button"
                      title={cell.tooltip}
                      onClick={() => onDayClick?.(cell.date)}
                      className={`animate-list-item-enter h-3 w-3 rounded-sm opacity-[0.85] transition-opacity duration-fast hover:opacity-100 ${cell.colorClass} ${
                        isSelected
                          ? "ring-1 ring-white ring-offset-1 ring-offset-[#161616]"
                          : ""
                      }`}
                      style={{
                        gridColumn: cell.column,
                        gridRow: cell.row,
                        animationDelay: `${getStaggerDelayMs(cell.column)}ms`,
                      }}
                      aria-label={cell.tooltip}
                      aria-pressed={isSelected}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
