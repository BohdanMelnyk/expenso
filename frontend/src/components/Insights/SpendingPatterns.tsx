import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Expense as APIExpense } from '../../api/client';
import { aggregateByWeek, formatAmount } from './utils';

interface Props {
  expenses: APIExpense[];
  loading?: boolean;
}

const SpendingPatterns: React.FC<Props> = ({ expenses, loading = false }) => {
  const data = aggregateByWeek(expenses);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Weekly Spending Patterns
        </h2>
        <div className="h-96 flex items-center justify-center text-gray-500 dark:text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  // Transform data for chart
  const chartData = data.map(week => ({
    name: `W${week.week}`,
    spend: week.spend,
    variance: week.variance,
    fullLabel: `Week ${week.week}, ${week.year}`
  }));

  // Calculate trend line (simple moving average)
  const trend = chartData.map((_, i) => {
    if (i === 0) return chartData[0].spend;
    const start = Math.max(0, i - 2);
    const relevant = chartData.slice(start, i + 1);
    return relevant.reduce((sum, d) => sum + d.spend, 0) / relevant.length;
  });

  const chartDataWithTrend = chartData.map((d, i) => ({
    ...d,
    trend: trend[i]
  }));

  const averageSpend = chartData.reduce((sum, d) => sum + d.spend, 0) / chartData.length;
  const maxSpend = Math.max(...chartData.map(d => d.spend));
  const variance = Math.sqrt(
    chartData.reduce((sum, d) => sum + Math.pow(d.spend - averageSpend, 2), 0) / chartData.length
  );
  const coefficient = (variance / averageSpend * 100).toFixed(1);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Weekly Spending Patterns
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Variance: {coefficient}% | Average: {formatAmount(averageSpend)} | Peak: {formatAmount(maxSpend)}
          </p>
        </div>
      </div>

      <div style={{ height: '350px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartDataWithTrend}>
            <defs>
              <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgba(147, 51, 234, 0.8)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="rgba(147, 51, 234, 0)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `€${Math.round(value)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px'
              }}
              formatter={(value: any) => [formatAmount(value), 'Spend']}
              labelFormatter={(label: string) => `${label}`}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="spend"
              stroke="rgb(147, 51, 234)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSpend)"
              name="Actual Spend"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="trend"
              stroke="rgb(59, 130, 246)"
              strokeWidth={2}
              fill="none"
              strokeDasharray="5 5"
              name="3-Week Trend"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Average Weekly</p>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {formatAmount(averageSpend)}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Peak Week</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {formatAmount(maxSpend)}
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Volatility</p>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {coefficient}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default SpendingPatterns;
