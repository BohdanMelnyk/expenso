import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { expenseAPI, Expense, Tag, formatAmount, tagAPI } from '../api/client';
import { usePeriod, Period } from '../contexts/PeriodContext';
import { usePeriodDateRange } from '../hooks/usePeriodDateRange';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './Toast';
import SkeletonLoader from './SkeletonLoader';

const TagStatistics: React.FC = () => {
  const navigate = useNavigate();
  const { tagId } = useParams<{ tagId: string }>();
  const [searchParams] = useSearchParams();
  const { period, setPeriod } = usePeriod();
  const { startDate: periodStartDate, endDate: periodEndDate } = usePeriodDateRange(period);
  const { toasts, removeToast, showError } = useToast();

  const [tag, setTag] = useState<Tag | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get period from URL params if provided
  useEffect(() => {
    const periodParam = searchParams.get('period') as Period | null;
    if (periodParam && ['week', 'month', 'year', 'all'].includes(periodParam)) {
      setPeriod(periodParam);
    }
  }, [searchParams, setPeriod]);

  useEffect(() => {
    if (!tagId) {
      setError('Tag ID not provided');
      return;
    }

    fetchTagAndExpenses();
  }, [tagId, periodStartDate, periodEndDate]);

  const fetchTagAndExpenses = async () => {
    if (!tagId) return;

    try {
      setLoading(true);
      const tagNum = parseInt(tagId, 10);

      // Fetch tag details
      const tagResponse = await tagAPI.getTag(tagNum);
      setTag(tagResponse.data);

      // Fetch expenses for this tag
      const startDateStr = periodStartDate.toISOString().split('T')[0];
      const endDateStr = periodEndDate.toISOString().split('T')[0];
      const expensesResponse = await expenseAPI.getExpensesByTag(tagNum, startDateStr, endDateStr);
      setExpenses(expensesResponse.data);
    } catch (err) {
      setError('Failed to fetch tag details and expenses');
      showError('Failed to fetch tag details and expenses');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const handleExpenseClick = (expenseId: number) => {
    navigate(`/expenses/${expenseId}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse bg-gray-200 rounded h-8 w-40"></div>
        <SkeletonLoader type="table" />
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
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/statistics')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Statistics
        </button>
      </div>

      {/* Tag Details */}
      {tag && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: tag.color }}
            ></div>
            <h1 className="text-3xl font-bold text-gray-900">{tag.name}</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900">Total Amount</h3>
              <p className="text-2xl font-bold text-blue-600">{formatAmount(totalAmount)}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-green-900">Number of Expenses</h3>
              <p className="text-2xl font-bold text-green-600">{expenses.length}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900">Average Amount</h3>
              <p className="text-2xl font-bold text-gray-600">
                {expenses.length > 0 ? formatAmount(totalAmount / expenses.length) : '€0.00'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Expenses with this tag</h2>
        </div>

        {expenses.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No expenses found for this tag in the selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    onClick={() => handleExpenseClick(expense.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">{expense.comment}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.vendor?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatAmount(expense.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.category}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default TagStatistics;
