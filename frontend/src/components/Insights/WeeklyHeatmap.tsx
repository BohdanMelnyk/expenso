import React from 'react';
import { Expense as APIExpense } from '../../api/client';
import { formatAmount } from './utils';

interface Props {
  expenses: APIExpense[];
  loading?: boolean;
}

const WeeklyHeatmap: React.FC<Props> = ({ expenses, loading = false }) => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekNumbers: number[] = [];
  const heatmapData: { [key: string]: number } = {};

  // Build heatmap data
  expenses.forEach(exp => {
    const date = new Date(exp.date);
    const weekNum = getWeekNumber(date);
    const dayOfWeek = date.getDay();
    const key = `${weekNum}-${dayOfWeek}`;

    if (!weekNumbers.includes(weekNum)) {
      weekNumbers.push(weekNum);
    }

    heatmapData[key] = (heatmapData[key] || 0) + exp.amount;
  });

  weekNumbers.sort((a, b) => a - b);

  // Find min and max for color scaling
  const values = Object.values(heatmapData);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);

  // Color scale function (red for high spending)
  const getColor = (value: number): string => {
    if (value === 0) return 'bg-gray-100 dark:bg-gray-700';

    const intensity = (value - minValue) / (maxValue - minValue);
    if (intensity < 0.33) return 'bg-yellow-100 dark:bg-yellow-900/30';
    if (intensity < 0.66) return 'bg-orange-300 dark:bg-orange-900/50';
    return 'bg-red-400 dark:bg-red-900/60';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (weekNumbers.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Weekly Heatmap
        </h2>
        <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Weekly Heatmap
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Spending intensity by day of week
        </p>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 dark:bg-gray-700 rounded" />
          <span className="text-gray-600 dark:text-gray-400">No data</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 dark:bg-yellow-900/30 rounded" />
          <span className="text-gray-600 dark:text-gray-400">Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-300 dark:bg-orange-900/50 rounded" />
          <span className="text-gray-600 dark:text-gray-400">Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-400 dark:bg-red-900/60 rounded" />
          <span className="text-gray-600 dark:text-gray-400">High</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Day names header */}
          <div className="flex mb-2">
            <div className="w-12" />
            {dayNames.map(day => (
              <div
                key={day}
                className="flex-1 min-w-16 text-center text-xs font-semibold text-gray-700 dark:text-gray-300"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap rows */}
          {weekNumbers.map(weekNum => (
            <div key={weekNum} className="flex mb-2 items-center">
              <div className="w-12 text-xs font-medium text-gray-600 dark:text-gray-400 text-right pr-2">
                W{weekNum}
              </div>
              {dayNames.map((_, dayIndex) => {
                const key = `${weekNum}-${dayIndex}`;
                const value = heatmapData[key] || 0;
                const color = getColor(value);

                return (
                  <div
                    key={key}
                    className={`flex-1 min-w-16 aspect-square ${color} rounded flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity`}
                    title={value > 0 ? formatAmount(value) : 'No data'}
                  >
                    {value > 0 && (
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                        {Math.round(value)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {(() => {
          const dayTotals = dayNames.map((_, i) =>
            Object.entries(heatmapData)
              .filter(([key]) => key.endsWith(`-${i}`))
              .reduce((sum, [_, val]) => sum + val, 0)
          );

          const maxDay = dayNames[dayTotals.indexOf(Math.max(...dayTotals))];
          const avgDay = dayTotals.reduce((a, b) => a + b, 0) / 7;

          return (
            <>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Highest Spending Day
                </p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{maxDay}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Avg Daily
                </p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatAmount(avgDay)}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Total Weeks
                </p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {weekNumbers.length}
                </p>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};

// Helper: Get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default WeeklyHeatmap;
