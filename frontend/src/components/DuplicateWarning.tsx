import React from 'react';
import { AlertTriangle, Calendar, CreditCard, User, ExternalLink } from 'lucide-react';
import { Expense, formatAmount } from '../api/client';
import { useNavigate } from 'react-router-dom';

interface DuplicateWarningProps {
  duplicates: Expense[];
  newExpense: {
    amount: number;
    date: string;
    comment: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const DuplicateWarning: React.FC<DuplicateWarningProps> = ({
  duplicates,
  newExpense,
  onConfirm,
  onCancel,
  loading = false
}) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysDifference = (date1: string, date2: string) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleViewExpense = (expenseId: number) => {
    // Navigate to the expense detail/overview page
    navigate(`/expense/${expenseId}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-yellow-50 border-b border-yellow-200 p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">
                Possible Duplicate Expense Detected
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                We found {duplicates.length} similar expense{duplicates.length > 1 ? 's' : ''} within ±2 days
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* New Expense */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">New Expense You're Adding:</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-blue-900">{newExpense.comment}</p>
                  <div className="flex items-center mt-2 text-sm text-blue-700">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(newExpense.date)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-blue-900">
                    {formatAmount(newExpense.amount)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Existing Duplicates */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Similar Existing Expenses:</h4>
            <div className="space-y-3">
              {duplicates.map((expense, index) => (
                <div key={expense.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{expense.comment}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(expense.date)}
                          <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                            {getDaysDifference(newExpense.date, expense.date)} day{getDaysDifference(newExpense.date, expense.date) !== 1 ? 's' : ''} apart
                          </span>
                        </div>
                        <div className="flex items-center">
                          <CreditCard className="w-4 h-4 mr-1" />
                          {expense.paid_by_card ? 'Card' : 'Cash'}
                        </div>
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {expense.added_by === 'he' ? 'He' : 'She'}
                        </div>
                      </div>
                      {expense.vendor && (
                        <p className="text-sm text-gray-500 mt-1">
                          Vendor: {expense.vendor.name} ({expense.vendor.type.replace('_', ' ')})
                        </p>
                      )}
                      <button
                        onClick={() => handleViewExpense(expense.id)}
                        className="mt-2 flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Expense Details
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatAmount(expense.amount)}
                      </p>
                      {expense.amount === newExpense.amount && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded mt-1 inline-block">
                          Exact match
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 font-medium"
            >
              Cancel & Review
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 bg-yellow-600 text-white py-3 px-4 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 font-medium"
            >
              {loading ? 'Adding...' : 'Add Anyway'}
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center mt-3">
            Review the similar expenses above and decide if you want to proceed with adding this new expense.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DuplicateWarning;