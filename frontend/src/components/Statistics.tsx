import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { expenseAPI, Expense } from '../api/client';

const Statistics: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await expenseAPI.getExpenses();
      setExpenses(response.data);
    } catch (err) {
      setError('Failed to fetch expenses');
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Filter expenses by period
  const getFilteredExpenses = () => {
    const now = new Date();
    const cutoffDate = new Date();

    switch (selectedPeriod) {
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return expenses.filter(expense => new Date(expense.date) >= cutoffDate);
  };

  // Group expenses by vendor type for pie chart
  const getExpensesByVendorType = () => {
    const filteredExpenses = getFilteredExpenses();
    const groupedData: { [key: string]: number } = {};

    filteredExpenses.forEach(expense => {
      if (expense.vendor) {
        const type = expense.vendor.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        groupedData[type] = (groupedData[type] || 0) + expense.amount;
      }
    });

    return Object.entries(groupedData).map(([name, value]) => ({
      name,
      value,
      percentage: ((value / filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)) * 100).toFixed(1)
    }));
  };

  // Group expenses by month for bar chart
  const getMonthlyExpenses = () => {
    const filteredExpenses = getFilteredExpenses();
    const monthlyData: { [key: string]: number } = {};

    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      monthlyData[monthName] = (monthlyData[monthName] || 0) + expense.amount;
    });

    return Object.entries(monthlyData)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  // Get top vendors
  const getTopVendors = () => {
    const filteredExpenses = getFilteredExpenses();
    const vendorData: { [key: string]: { name: string; amount: number; count: number } } = {};

    filteredExpenses.forEach(expense => {
      if (expense.vendor) {
        const vendorId = expense.vendor.id.toString();
        if (!vendorData[vendorId]) {
          vendorData[vendorId] = {
            name: expense.vendor.name,
            amount: 0,
            count: 0
          };
        }
        vendorData[vendorId].amount += expense.amount;
        vendorData[vendorId].count += 1;
      }
    });

    return Object.values(vendorData)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  };

  const pieColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  const pieData = getExpensesByVendorType();
  const monthlyData = getMonthlyExpenses();
  const topVendors = getTopVendors();
  const filteredExpenses = getFilteredExpenses();
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgExpense = filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Expense Statistics</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`px-3 py-1 rounded-md text-sm ${selectedPeriod === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Last Month
            </button>
            <button
              onClick={() => setSelectedPeriod('quarter')}
              className={`px-3 py-1 rounded-md text-sm ${selectedPeriod === 'quarter' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Last 3 Months
            </button>
            <button
              onClick={() => setSelectedPeriod('year')}
              className={`px-3 py-1 rounded-md text-sm ${selectedPeriod === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Last Year
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900">Total Spent</h3>
            <p className="text-2xl font-bold text-blue-600">{formatAmount(totalAmount)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900">Total Expenses</h3>
            <p className="text-2xl font-bold text-green-600">{filteredExpenses.length}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900">Average Expense</h3>
            <p className="text-2xl font-bold text-purple-600">{formatAmount(avgExpense)}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Expenses by Category */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatAmount(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available for this period</p>
          )}
        </div>

        {/* Bar Chart - Monthly Expenses */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Expenses</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => formatAmount(value as number)} />
                <Bar dataKey="amount" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available for this period</p>
          )}
        </div>
      </div>

      {/* Top Vendors Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Top Vendors</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Number of Expenses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average per Expense
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topVendors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No vendor data available for this period
                  </td>
                </tr>
              ) : (
                topVendors.map((vendor, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {vendor.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatAmount(vendor.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vendor.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatAmount(vendor.amount / vendor.count)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Statistics;