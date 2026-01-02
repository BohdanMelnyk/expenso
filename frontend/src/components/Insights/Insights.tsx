import React, { useState, useEffect } from 'react';
import { expenseAPI, incomeAPI } from '../../api/client';
import { usePeriod } from '../../contexts/PeriodContext';
import { usePeriodDateRange } from '../../hooks/usePeriodDateRange';
import { formatDateLocal } from '../../utils/dateFormatter';
import SpendingPatterns from './SpendingPatterns';
import PersonAnalytics from './PersonAnalytics';
import WeeklyHeatmap from './WeeklyHeatmap';
import PaymentMethodTrends from './PaymentMethodTrends';
import TopExpenseCategories from './TopExpenseCategories';
import IncomeVsExpenseWaterfall from './IncomeVsExpenseWaterfall';
import CategoryDistribution from './CategoryDistribution';
import SpendingMomentum from './SpendingMomentum';
import ErrorMessage from '../ErrorMessage';
import SkeletonLoader from '../SkeletonLoader';

interface PageData {
  expenses: any[];
  incomes: any[];
  loading: boolean;
  error: string | null;
}

const Insights: React.FC = () => {
  const { period } = usePeriod();
  const { startDate, endDate } = usePeriodDateRange(period);
  const [data, setData] = useState<PageData>({
    expenses: [],
    incomes: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        const startDateStr = formatDateLocal(startDate);
        const endDateStr = formatDateLocal(endDate);

        const [expensesRes, incomesRes] = await Promise.all([
          expenseAPI.getActualExpenses(startDateStr, endDateStr),
          incomeAPI.getIncomes(startDateStr, endDateStr)
        ]);

        setData({
          expenses: expensesRes.data || [],
          incomes: incomesRes.data || [],
          loading: false,
          error: null
        });
      } catch (err: any) {
        console.error('Error fetching insights data:', err);
        setData(prev => ({
          ...prev,
          loading: false,
          error: err.response?.data?.error || 'Failed to load insights data'
        }));
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const handleRetry = () => {
    setData(prev => ({ ...prev, loading: true, error: null }));
    // Refetch logic is in the useEffect above, just trigger it
    window.location.reload();
  };

  if (data.loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Insights</h1>
          <div className="space-y-8">
            {[...Array(3)].map((_, i) => (
              <SkeletonLoader key={i} type="chart" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Insights</h1>
          <ErrorMessage error={data.error} onRetry={handleRetry} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Insights</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive analysis of your spending patterns, trends, and financial health.
          </p>
        </div>

        {/* Charts Grid */}
        <div className="space-y-8">
          {/* Row 1: Spending Patterns & Person Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SpendingPatterns expenses={data.expenses} loading={data.loading} />
            <PersonAnalytics expenses={data.expenses} loading={data.loading} />
          </div>

          {/* Row 2: Weekly Heatmap & Payment Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <WeeklyHeatmap expenses={data.expenses} loading={data.loading} />
            <PaymentMethodTrends expenses={data.expenses} loading={data.loading} />
          </div>

          {/* Row 3: Top Categories & Income vs Expense */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TopExpenseCategories expenses={data.expenses} loading={data.loading} />
            <IncomeVsExpenseWaterfall
              expenses={data.expenses}
              incomes={data.incomes}
              loading={data.loading}
            />
          </div>

          {/* Row 4: Category Distribution (Full Width) */}
          <CategoryDistribution expenses={data.expenses} loading={data.loading} />

          {/* Row 5: Spending Momentum */}
          <SpendingMomentum
            expenses={data.expenses}
            startDate={startDate}
            endDate={endDate}
            loading={data.loading}
          />
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
              €{Math.round(data.expenses.reduce((sum, e) => sum + e.amount, 0))}
            </p>
            <p className="text-xs text-gray-500 mt-1">{data.expenses.length} transactions</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Income</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
              €{Math.round(data.incomes.reduce((sum, i) => sum + i.amount, 0))}
            </p>
            <p className="text-xs text-gray-500 mt-1">{data.incomes.length} transactions</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Categories</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
              {new Set(data.expenses.map(e => e.category)).size}
            </p>
            <p className="text-xs text-gray-500 mt-1">Unique categories</p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Transaction</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
              €
              {(
                (data.expenses.reduce((sum, e) => sum + e.amount, 0) +
                  data.incomes.reduce((sum, i) => sum + i.amount, 0)) /
                (data.expenses.length + data.incomes.length || 1)
              ).toFixed(0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">All transactions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
