import React from 'react';
import { Expense as APIExpense } from '../../api/client';
import { formatAmount } from './utils';

interface Props {
  expenses: APIExpense[];
  startDate: Date;
  endDate: Date;
  loading?: boolean;
}

const SpendingMomentum: React.FC<Props> = ({ expenses, startDate, endDate, loading = false }) => {
  // Calculate spending momentum
  const calculateMomentum = () => {
    if (expenses.length === 0) {
      return {
        momentum: 0,
        trend: 'neutral',
        firstHalf: 0,
        secondHalf: 0,
        avgPerDay: 0,
        projectedEnd: 0
      };
    }

    // Split period into two halves
    const totalTime = endDate.getTime() - startDate.getTime();
    const midpoint = new Date(startDate.getTime() + totalTime / 2);

    const firstHalf = expenses
      .filter(e => new Date(e.date) < midpoint)
      .reduce((sum, e) => sum + e.amount, 0);

    const secondHalf = expenses
      .filter(e => new Date(e.date) >= midpoint)
      .reduce((sum, e) => sum + e.amount, 0);

    // Calculate momentum (positive = increasing spend, negative = decreasing spend)
    const momentum = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

    // Calculate average per day
    const daysElapsed = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const avgPerDay = expenses.reduce((sum, e) => sum + e.amount, 0) / daysElapsed;

    // Project to end of period
    const daysRemaining = Math.max(0, daysElapsed - daysElapsed); // Simplified - could be more complex
    const projectedEnd = expenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      momentum: Math.round(momentum * 10) / 10,
      trend: momentum > 5 ? 'increasing' : momentum < -5 ? 'decreasing' : 'stable',
      firstHalf,
      secondHalf,
      avgPerDay,
      projectedEnd
    };
  };

  const data = calculateMomentum();
  const momentumValue = Math.abs(data.momentum);
  const isIncreasing = data.momentum > 0;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  // Determine colors based on trend
  const ringColor = isIncreasing ? 'rgb(244, 63, 94)' : 'rgb(34, 197, 94)';
  const bgColor = isIncreasing
    ? 'bg-red-50 dark:bg-red-900/20'
    : 'bg-green-50 dark:bg-green-900/20';
  const textColor = isIncreasing
    ? 'text-red-600 dark:text-red-400'
    : 'text-green-600 dark:text-green-400';

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Spending Momentum
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Rate of spending change over period
        </p>
      </div>

      {/* Main Momentum Ring */}
      <div className="flex justify-center mb-8">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="6"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeDasharray={`${(Math.min(momentumValue, 100) / 100) * 282.7} 282.7`}
              strokeLinecap="round"
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '50px 50px'
              }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
              <p className={`text-4xl font-bold ${textColor}`}>
                {isIncreasing ? '+' : ''}{data.momentum.toFixed(0)}%
              </p>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">
                {data.trend === 'increasing' ? '⬆ Increasing' : '⬇ Decreasing'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Indicator */}
      <div className={`p-4 rounded-lg mb-6 ${bgColor}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Spending Trend
            </p>
            <p className={`text-2xl font-bold ${textColor}`}>
              {data.trend === 'increasing' ? 'Increasing' : data.trend === 'decreasing' ? 'Decreasing' : 'Stable'}
            </p>
          </div>
          <div className="text-4xl">
            {data.trend === 'increasing' ? '📈' : '📉'}
          </div>
        </div>
      </div>

      {/* Period Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            1st Half Period
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatAmount(data.firstHalf)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {expenses.filter(e => new Date(e.date) < new Date(startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2)).length} transactions
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            2nd Half Period
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatAmount(data.secondHalf)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {expenses.filter(e => new Date(e.date) >= new Date(startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2)).length} transactions
          </p>
        </div>
      </div>

      {/* Daily Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Avg per Day
          </p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {formatAmount(data.avgPerDay)}
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Total Spent
          </p>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {formatAmount(data.projectedEnd)}
          </p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Transactions
          </p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {expenses.length}
          </p>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-900">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          💡 Momentum Analysis
        </p>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          {data.momentum > 10 ? (
            <li>⚠ Your spending is increasing significantly ({data.momentum.toFixed(0)}%). Monitor your expenses.</li>
          ) : data.momentum > 0 ? (
            <li>→ Your spending is increasing slightly. Keep an eye on it.</li>
          ) : data.momentum < -10 ? (
            <li>✅ Great! Your spending is decreasing significantly ({Math.abs(data.momentum).toFixed(0)}%).</li>
          ) : data.momentum < 0 ? (
            <li>✓ Your spending is decreasing gradually. Good progress!</li>
          ) : (
            <li>Neutral Your spending is stable across the period.</li>
          )}
          <li>
            You're spending an average of {formatAmount(data.avgPerDay)} per day.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SpendingMomentum;
