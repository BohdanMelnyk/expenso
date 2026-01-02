import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Expense as APIExpense } from '../../api/client';
import { calculatePaymentMethodTrends, formatAmount } from './utils';

interface Props {
  expenses: APIExpense[];
  loading?: boolean;
}

const PaymentMethodTrends: React.FC<Props> = ({ expenses, loading = false }) => {
  const methodData = calculatePaymentMethodTrends(expenses);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  if (methodData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Payment Method Trends
        </h2>
        <div className="h-96 flex items-center justify-center text-gray-500 dark:text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  // Build chart data from trends
  const maxWeeks = Math.max(...methodData.map(m => m.trend.length));
  const chartData = [];

  for (let i = 0; i < maxWeeks; i++) {
    const week = `W${i + 1}`;
    const dataPoint: any = { week };

    methodData.forEach(method => {
      dataPoint[method.method] = method.trend[i] || 0;
    });

    chartData.push(dataPoint);
  }

  const colors = [
    'rgb(147, 51, 234)',
    'rgb(59, 130, 246)',
    'rgb(34, 197, 94)',
    'rgb(244, 63, 94)',
    'rgb(251, 146, 60)',
    'rgb(168, 85, 247)'
  ];

  const colorMap: { [key: string]: string } = {};
  methodData.forEach((method, index) => {
    colorMap[method.method] = colors[index % colors.length];
  });

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Payment Method Trends
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {methodData.length} payment methods tracked
          </p>
        </div>
      </div>

      <div style={{ height: '350px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              {methodData.map((method, index) => (
                <linearGradient
                  key={`gradient-${method.method}`}
                  id={`color-${method.method}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={colorMap[method.method]}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor={colorMap[method.method]}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="week"
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
              formatter={(value: any) => [formatAmount(value), '']}
            />
            <Legend />
            {methodData.map((method) => (
              <Area
                key={method.method}
                type="monotone"
                dataKey={method.method}
                stroke={colorMap[method.method]}
                fill={`url(#color-${method.method})`}
                stackId="1"
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Payment Method Breakdown */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-4 text-gray-700 dark:text-gray-300">
                Payment Method
              </th>
              <th className="text-right py-2 px-4 text-gray-700 dark:text-gray-300">Total</th>
              <th className="text-right py-2 px-4 text-gray-700 dark:text-gray-300">
                % of Total
              </th>
            </tr>
          </thead>
          <tbody>
            {methodData.map((method, index) => {
              const totalAmount = methodData.reduce((sum, m) => sum + m.amount, 0);
              const percentage = (method.amount / totalAmount * 100).toFixed(1);

              return (
                <tr
                  key={index}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span
                      className="inline-block w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: colorMap[method.method] }}
                    />
                    <span className="text-gray-900 dark:text-gray-100">{method.method}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                    {formatAmount(method.amount)}
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

export default PaymentMethodTrends;
