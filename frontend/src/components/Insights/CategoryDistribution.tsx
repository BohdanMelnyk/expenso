import React, { useState } from 'react';
import { Treemap, Tooltip, ResponsiveContainer } from 'recharts';
import { Expense as APIExpense } from '../../api/client';
import { formatAmount } from './utils';

interface Props {
  expenses: APIExpense[];
  loading?: boolean;
}

interface TreemapData {
  name: string;
  value: number;
  fill: string;
  [key: string]: any; // Allow any additional properties for Recharts compatibility
}

const CategoryDistribution: React.FC<Props> = ({ expenses, loading = false }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Group by category
  const categoryMap: { [key: string]: number } = {};
  expenses.forEach(exp => {
    const cat = exp.category || 'Uncategorized';
    categoryMap[cat] = (categoryMap[cat] || 0) + exp.amount;
  });

  const totalAmount = Object.values(categoryMap).reduce((a, b) => a + b, 0);

  // Color palette - 12 distinct colors
  const colors = [
    '#6366F1', '#8B5CF6', '#D946EF', '#EC4899',
    '#F43F5E', '#F97316', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4',
    '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6'
  ];

  // Prepare treemap data
  const treemapData: TreemapData[] = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amount], index) => ({
      name: cat,
      value: amount,
      fill: colors[index % colors.length]
    }));

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (treemapData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Category Distribution
        </h2>
        <div className="h-96 flex items-center justify-center text-gray-500 dark:text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  const selectedCategoryData = selectedCategory
    ? treemapData.find(d => d.name === selectedCategory)
    : null;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Category Distribution
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total: {formatAmount(totalAmount)} across {treemapData.length} categories
          </p>
        </div>
        {selectedCategory && (
          <button
            onClick={() => setSelectedCategory(null)}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Treemap Chart */}
      <div style={{ height: '350px' }} className="mb-6 bg-gray-50 dark:bg-gray-900/20 rounded">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={treemapData as any}
            dataKey="value"
            stroke="#fff"
            fill="#8884d8"
            isAnimationActive={false}
          >
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px'
              }}
              formatter={(value: any) => [formatAmount(value), 'Amount']}
              cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {treemapData.map((cat, index) => {
          const percentage = (cat.value / totalAmount * 100).toFixed(1);
          const isSelected = selectedCategory === cat.name;

          return (
            <button
              key={index}
              onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
              className={`p-4 rounded-lg text-left transition-all ${
                isSelected
                  ? 'ring-2 ring-offset-2 dark:ring-offset-gray-800 shadow-lg'
                  : 'hover:shadow-md'
              }`}
              style={{
                backgroundColor: cat.fill,
                opacity: isSelected ? 1 : 0.8,
                boxShadow: isSelected ? `0 0 0 2px ${cat.fill}` : 'none'
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-white truncate">{cat.name}</h3>
                  <p className="text-white/80 text-sm mt-1">{percentage}% of total</p>
                </div>
              </div>
              <p className="text-white text-lg font-bold mt-2">{formatAmount(cat.value)}</p>
            </button>
          );
        })}
      </div>

      {/* Selected Category Details */}
      {selectedCategoryData && (
        <div className="mt-6 p-4 rounded-lg border-2" style={{ borderColor: selectedCategoryData.fill }}>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {selectedCategoryData.name} Details
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Amount</p>
              <p className="text-lg font-bold" style={{ color: selectedCategoryData.fill }}>
                {formatAmount(selectedCategoryData.value)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">% of Total</p>
              <p className="text-lg font-bold" style={{ color: selectedCategoryData.fill }}>
                {((selectedCategoryData.value / totalAmount) * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Transactions</p>
              <p className="text-lg font-bold" style={{ color: selectedCategoryData.fill }}>
                {expenses.filter(e => (e.category || 'Uncategorized') === selectedCategoryData.name).length}
              </p>
            </div>
          </div>

          {/* Expenses in category */}
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Recent Transactions
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {expenses
                .filter(e => (e.category || 'Uncategorized') === selectedCategoryData.name)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((exp, idx) => (
                  <div key={idx} className="flex justify-between text-xs py-1">
                    <span className="text-gray-700 dark:text-gray-300 truncate">
                      {exp.comment || 'Transaction'}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 ml-2">
                      {formatAmount(exp.amount)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryDistribution;
