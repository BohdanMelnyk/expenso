import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Expense as APIExpense } from '../../api/client';
import { groupByPerson, formatAmount } from './utils';

interface Props {
  expenses: APIExpense[];
  loading?: boolean;
}

const PersonAnalytics: React.FC<Props> = ({ expenses, loading = false }) => {
  const personData = groupByPerson(expenses);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (personData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Person Analytics
        </h2>
        <div className="h-96 flex items-center justify-center text-gray-500 dark:text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  const totalAmount = personData.reduce((sum, p) => sum + p.amount, 0);
  const totalCount = personData.reduce((sum, p) => sum + p.count, 0);

  // Color map for consistent colors
  const colorMap: { [key: string]: string } = {
    'He': 'rgb(59, 130, 246)',
    'She': 'rgb(236, 72, 153)',
    'Other': 'rgb(107, 114, 128)'
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Spending by Person
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total transactions: {totalCount}
          </p>
        </div>
      </div>

      <div style={{ height: '350px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={personData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="person"
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
              formatter={(value: any) => [formatAmount(value), 'Amount']}
            />
            <Bar
              dataKey="amount"
              fill="#8884d8"
              radius={[8, 8, 0, 0]}
              isAnimationActive={false}
            >
              {personData.map((entry, index) => {
                const color = colorMap[entry.person] || 'rgb(107, 114, 128)';
                return (
                  <Bar
                    key={`bar-${index}`}
                    dataKey="amount"
                    fill={color}
                    radius={[8, 8, 0, 0]}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-4 text-gray-700 dark:text-gray-300">Person</th>
              <th className="text-right py-2 px-4 text-gray-700 dark:text-gray-300">Total</th>
              <th className="text-right py-2 px-4 text-gray-700 dark:text-gray-300">Avg/Transaction</th>
              <th className="text-right py-2 px-4 text-gray-700 dark:text-gray-300">Count</th>
              <th className="text-right py-2 px-4 text-gray-700 dark:text-gray-300">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {personData.map((person, index) => {
              const percentage = (person.amount / totalAmount * 100).toFixed(1);
              const avgPerTransaction = (person.amount / person.count).toFixed(2);
              const color = colorMap[person.person] || 'rgb(107, 114, 128)';

              return (
                <tr
                  key={index}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span
                      className="inline-block w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-gray-900 dark:text-gray-100">{person.person}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                    {formatAmount(person.amount)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                    {formatAmount(parseFloat(avgPerTransaction))}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                    {person.count}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                    {percentage}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PersonAnalytics;
