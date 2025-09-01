import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { expenseAPI, incomeAPI, Expense as APIExpense, Income } from '../api/client';

interface BalanceSummary {
  total_earnings: number;
  total_expenses: number;
  balance: number;
  earnings_count: number;
  expenses_count: number;
}


export default function BalanceDashboard() {
  const navigate = useNavigate();
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [actualExpenses, setActualExpenses] = useState<APIExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // January 1st of current year
    endDate: new Date().toISOString().split('T')[0] // Today
  });

  const fetchBalanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [balanceResponse, incomesResponse, expensesResponse] = await Promise.all([
        expenseAPI.getBalanceSummary(dateRange.startDate, dateRange.endDate),
        incomeAPI.getIncomes(dateRange.startDate, dateRange.endDate),
        expenseAPI.getActualExpenses(dateRange.startDate, dateRange.endDate)
      ]);

      setBalanceSummary(balanceResponse.data);
      setIncomes(incomesResponse.data);
      setActualExpenses(expensesResponse.data);
    } catch (error) {
      console.error('Error fetching balance data:', error);
      setError('Failed to load balance data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals from actual data instead of backend summary
  const calculateTotals = () => {
    const totalEarnings = incomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = actualExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const balance = totalEarnings - totalExpenses;
    
    return {
      totalEarnings,
      totalExpenses,
      balance,
      earningsCount: incomes.length,
      expensesCount: actualExpenses.length
    };
  };

  useEffect(() => {
    fetchBalanceData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const setPresetDateRange = (preset: 'this_month' | 'last_month' | 'this_year' | 'last_3_months') => {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date();

    switch (preset) {
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'last_3_months':
        startDate = new Date();
        startDate.setMonth(now.getMonth() - 3);
        break;
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
    }

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  };

  const handleVendorClick = (vendorId: number) => {
    navigate(`/vendor/${vendorId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="h-32 bg-gray-300 rounded"></div>
              <div className="h-32 bg-gray-300 rounded"></div>
              <div className="h-32 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
            <button 
              onClick={fetchBalanceData}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Financial Balance Dashboard</h1>
          
          {/* Date Range Filter */}
          <div className="space-y-4">
            {/* Date Inputs and Submit Button */}
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                  From
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                  To
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <button
                  onClick={fetchBalanceData}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? 'Loading...' : 'Submit'}
                </button>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600 font-medium mr-2">Quick select:</span>
              <button
                onClick={() => setPresetDateRange('this_month')}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                This Month
              </button>
              <button
                onClick={() => setPresetDateRange('last_month')}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Last Month
              </button>
              <button
                onClick={() => setPresetDateRange('last_3_months')}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Last 3 Months
              </button>
              <button
                onClick={() => setPresetDateRange('this_year')}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                This Year
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {balanceSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Earnings Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">€</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Earnings</dt>
                      <dd className="text-lg font-medium text-green-600">
                        {formatCurrency(totals.totalEarnings)}
                      </dd>
                      <dd className="text-sm text-gray-500">
                        {totals.earningsCount} income entries
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Expenses Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold">-</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Expenses</dt>
                      <dd className="text-lg font-medium text-red-600">
                        {formatCurrency(totals.totalExpenses)}
                      </dd>
                      <dd className="text-sm text-gray-500">
                        {totals.expensesCount} expense entries
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                      totals.balance >= 0 ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      <span className="text-white font-bold">=</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Net Balance</dt>
                      <dd className={`text-lg font-medium ${getBalanceColor(totals.balance)}`}>
                        {formatCurrency(totals.balance)}
                      </dd>
                      <dd className="text-sm text-gray-500">
                        {totals.balance >= 0 ? 'Surplus' : 'Deficit'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Recent Incomes */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Incomes ({incomes.length})
              </h3>
              <div className="max-h-96 overflow-y-auto">
                {incomes.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No incomes found for this period</p>
                ) : (
                  <div className="space-y-3">
                    {incomes.slice(0, 10).map((income) => (
                      <button
                        key={income.id}
                        onClick={() => navigate(`/incomes/${income.id}`)}
                        className="flex justify-between items-center py-2 border-b border-gray-100 w-full text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer"
                      >
                        <div>
                          {income.vendor?.id ? (
                            <span className="text-sm font-medium text-blue-600">
                              {income.vendor.name}
                            </span>
                          ) : (
                            <p className="text-sm font-medium text-gray-900">{income.source}</p>
                          )}
                          <p className="text-xs text-gray-500">{new Date(income.date).toLocaleDateString()}</p>
                          {income.comment && <p className="text-xs text-gray-400">{income.comment}</p>}
                        </div>
                        <span className="text-green-600 font-medium">
                          {formatCurrency(income.amount)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Expenses */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Expenses ({actualExpenses.length})
              </h3>
              <div className="max-h-96 overflow-y-auto">
                {actualExpenses.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No expenses found for this period</p>
                ) : (
                  <div className="space-y-3">
                    {actualExpenses.slice(0, 10).map((expense) => (
                      <button
                        key={expense.id}
                        onClick={() => navigate(`/expenses/${expense.id}`)}
                        className="flex justify-between items-center py-2 border-b border-gray-100 w-full text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer"
                      >
                        <div>
                          {expense.vendor?.id ? (
                            <span className="text-sm font-medium text-blue-600">
                              {expense.vendor.name}
                            </span>
                          ) : (
                            <p className="text-sm font-medium text-gray-900">Unknown Vendor</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {new Date(expense.date).toLocaleDateString()} • {expense.comment}
                          </p>
                        </div>
                        <span className="text-red-600 font-medium">
                          {formatCurrency(expense.amount)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}