import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Expense as APIExpense } from '../../api/client';
import { getTopCategories, formatAmount } from './utils';

interface Props {
  expenses: APIExpense[];
  loading?: boolean;
  limit?: number;
}

const TopExpenseCategories: React.FC<Props> = ({ expenses, loading = false, limit = 10 }) => {
  const categories = getTopCategories(expenses, limit);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Top Expense Categories
        </h2>
        <div className="h-96 flex items-center justify-center text-gray-500 dark:text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  const totalExpenses = categories.reduce((sum, cat) => sum + cat.amount, 0);

  // Prepare data for chart - show as horizontal bars
  const chartData = categories.map(cat => ({
    ...cat,
    shortName: cat.category.length > 20 ? cat.category.substring(0, 17) + '...' : cat.category
  }));

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Top Expense Categories
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total: {formatAmount(totalExpenses)}
          </p>
        </div>
      </div>

      <div style={{ height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `€${Math.round(value)}`}
            />
            <YAxis
              type="category"
              dataKey="shortName"
              stroke="#6b7280"
              style={{ fontSize: '11px' }}
              width={145}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px'
              }}
              formatter={(value: any, name: string) => {
                if (name === 'amount') return [formatAmount(value), 'Amount'];
                if (name === 'variance') return [formatAmount(value), 'Variance'];
                return [value, name];
              }}
            />
            <Bar
              dataKey="amount"
              fill="rgb(147, 51, 234)"
              radius={[0, 8, 8, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Categories Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-4 text-gray-700 dark:text-gray-300">Category</th>
              <th className="text-right py-2 px-4 text-gray-700 dark:text-gray-300">Amount</th>
              <th className="text-right py-2 px-4 text-gray-700 dark:text-gray-300">Variance</th>
              <th className="text-right py-2 px-4 text-gray-700 dark:text-gray-300">% Total</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, index) => (
              <tr
                key={index}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <td className="py-3 px-4 text-gray-900 dark:text-gray-100 font-medium">
                  {cat.category}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-purple-600 dark:text-purple-400">
                  {formatAmount(cat.amount)}
                </td>
                <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                  {cat.variance > 0 ? (
                    <span className="text-orange-600 dark:text-orange-400">
                      ±{formatAmount(cat.variance)}
                    </span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                  <div className="flex items-center justify-end gap-2">
                    <span>{cat.percentOfTotal.toFixed(1)}%</span>
                    <div className="w-12 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${cat.percentOfTotal}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Top Category
          </p>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {categories[0]?.percentOfTotal.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">{categories[0]?.category}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Avg Category
          </p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {(100 / categories.length).toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Per category</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Categories
          </p>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {categories.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Tracked</p>
        </div>
      </div>
    </div>
  );
};

export default TopExpenseCategories;
