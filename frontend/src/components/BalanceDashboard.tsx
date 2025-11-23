import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { expenseAPI, incomeAPI, Expense as APIExpense, Income } from '../api/client';
import { usePeriod } from '../contexts/PeriodContext';
import { usePeriodDateRange } from '../hooks/usePeriodDateRange';
import { formatDateLocal } from '../utils/dateFormatter';

interface BalanceSummary {
  total_earnings: number;
  total_expenses: number;
  balance: number;
  earnings_count: number;
  expenses_count: number;
}


export default function BalanceDashboard() {
  const navigate = useNavigate();
  const { period } = usePeriod();
  const { startDate, endDate } = usePeriodDateRange(period);
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [actualExpenses, setActualExpenses] = useState<APIExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalanceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const startDateStr = formatDateLocal(startDate);
      const endDateStr = formatDateLocal(endDate);

      const [balanceResponse, incomesResponse, expensesResponse] = await Promise.all([
        expenseAPI.getBalanceSummary(startDateStr, endDateStr),
        incomeAPI.getIncomes(startDateStr, endDateStr),
        expenseAPI.getActualExpenses(startDateStr, endDateStr)
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
  }, [startDate, endDate]);

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
  }, [fetchBalanceData]);

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
                Recent Expenses - Highest First ({actualExpenses.length})
              </h3>
              <div className="max-h-96 overflow-y-auto">
                {actualExpenses.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No expenses found for this period</p>
                ) : (
                  <div className="space-y-3">
                    {actualExpenses
                      .sort((a, b) => b.amount - a.amount)
                      .slice(0, 10)
                      .map((expense) => (
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