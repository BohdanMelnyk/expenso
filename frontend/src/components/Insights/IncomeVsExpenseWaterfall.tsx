import React from 'react';
import { Expense as APIExpense, Income } from '../../api/client';
import { calculateSavingsRate, formatAmount } from './utils';

interface Props {
  expenses: APIExpense[];
  incomes: Income[];
  loading?: boolean;
}

const IncomeVsExpenseWaterfall: React.FC<Props> = ({ expenses, incomes, loading = false }) => {
  const { rate, savings, income, expenses: totalExpenses } = calculateSavingsRate(incomes, expenses);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  // Waterfall data for visualization
  const waterfallData = [
    { label: 'Income', value: income, fill: 'rgb(34, 197, 94)' },
    { label: 'Expenses', value: -totalExpenses, fill: 'rgb(244, 63, 94)' },
    { label: 'Savings', value: 0, fill: savings >= 0 ? 'rgb(59, 130, 246)' : 'rgb(244, 63, 94)' }
  ];

  // Calculate positions for bars
  let cumulative = 0;
  const positions = waterfallData.map((item, index) => {
    if (index === waterfallData.length - 1) {
      return { ...item, cumulative: 0, height: Math.abs(savings) };
    }
    const position = { ...item, cumulative, height: Math.abs(item.value) };
    cumulative += item.value;
    return position;
  });

  const maxValue = Math.max(income, Math.abs(savings));
  const scale = maxValue > 0 ? 300 / maxValue : 1;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Income vs Expenses Waterfall
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Savings Rate: {rate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Waterfall Chart */}
      <div className="mb-8">
        <div className="flex items-end justify-around gap-4 h-80 px-4">
          {positions.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                {formatAmount(Math.abs(item.value) || item.height)}
              </div>
              <div
                className="w-full rounded-t-lg flex items-end justify-center transition-all"
                style={{
                  backgroundColor: item.fill,
                  height: `${item.height * scale}px`,
                  minHeight: item.height > 0 ? '20px' : '0px'
                }}
              >
                {item.height > 50 && (
                  <span className="text-white font-bold text-sm mb-2">
                    {Math.round(item.height)}
                  </span>
                )}
              </div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-2 text-center">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Ring for Savings Rate */}
      <div className="mb-8 flex justify-center">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={savings >= 0 ? 'rgb(59, 130, 246)' : 'rgb(244, 63, 94)'}
              strokeWidth="8"
              strokeDasharray={`${(rate / 100) * 282.7} 282.7`}
              strokeLinecap="round"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {rate.toFixed(0)}%
            </p>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Savings Rate
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Total Income
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatAmount(income)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            From {incomes.length} transactions
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Total Expenses
          </p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatAmount(totalExpenses)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            From {expenses.length} transactions
          </p>
        </div>

        <div className={`p-4 rounded-lg ${
          savings >= 0
            ? 'bg-blue-50 dark:bg-blue-900/20'
            : 'bg-orange-50 dark:bg-orange-900/20'
        }`}>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Net Savings
          </p>
          <p className={`text-2xl font-bold ${
            savings >= 0
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-orange-600 dark:text-orange-400'
          }`}>
            {formatAmount(savings)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {savings >= 0 ? 'Surplus' : 'Deficit'}
          </p>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-900">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          💡 Financial Insights
        </p>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          {rate >= 20 ? (
            <li>✅ Excellent savings rate! You're saving {rate.toFixed(0)}% of your income.</li>
          ) : rate >= 10 ? (
            <li>✓ Good savings rate of {rate.toFixed(0)}%. Consider increasing it to 20%.</li>
          ) : rate >= 0 ? (
            <li>⚠ You're saving only {rate.toFixed(0)}%. Try to save more.</li>
          ) : (
            <li>❌ You're spending more than you earn by {Math.abs(rate).toFixed(0)}%.</li>
          )}
          <li>
            Your average transaction is {formatAmount(
              (income + totalExpenses) / (incomes.length + expenses.length)
            )}.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default IncomeVsExpenseWaterfall;
