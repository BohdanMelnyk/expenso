import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Store, 
  CreditCard, 
  Banknote, 
  Tag, 
  User, 
  MessageCircle,
  Clock,
  Edit
} from 'lucide-react';
import { expenseAPI, Expense, formatAmount } from '../api/client';
import { getErrorMessage } from '../utils/errorHandler';

const ExpenseOverview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchExpense();
    }
  }, [id]);

  const fetchExpense = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await expenseAPI.getExpense(parseInt(id!));
      setExpense(response.data);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to fetch expense details'));
      console.error('Error fetching expense:', err);
    } finally {
      setLoading(false);
    }
  };

  const getVendorTypeIcon = (type: string) => {
    switch (type) {
      case 'food_store': return '🛒';
      case 'eating_out': return '🍽️';
      case 'transport': return '🚗';
      case 'household': return '🏠';
      case 'clothing': return '👕';
      case 'care': return '💊';
      case 'living': return '🏡';
      case 'subscriptions': return '📱';
      case 'tourism': return '✈️';
      case 'car': return '🚙';
      case 'salary': return '💰';
      default: return '📦';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
        <div className="flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => navigate('/')}
            className="text-red-600 hover:text-red-800 underline ml-4"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Expense not found</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-blue-600 hover:text-blue-800 underline"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/add')} // Assuming there's an edit functionality
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Expense</span>
            </button>
          </div>
        </div>

        {/* Expense Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {expense.comment || 'Expense Details'}
          </h1>
          <div className="text-4xl font-bold text-red-600">
            {formatAmount(expense.amount)}
          </div>
        </div>
      </div>

      {/* Expense Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium text-gray-900">{formatDate(expense.date)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <DollarSign className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-medium text-gray-900">{formatAmount(expense.amount)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <MessageCircle className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="font-medium text-gray-900">{expense.comment || 'No description'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Tag className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium text-gray-900">{expense.category || 'Uncategorized'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor & Payment Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Vendor & Payment</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Store className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Vendor</p>
                {expense.vendor ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getVendorTypeIcon(expense.vendor.type)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{expense.vendor.name}</p>
                      <p className="text-sm text-gray-500 capitalize">
                        {expense.vendor.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="font-medium text-gray-500">Unknown Vendor</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {expense.paid_by_card ? (
                <CreditCard className="w-5 h-5 text-blue-500" />
              ) : (
                <Banknote className="w-5 h-5 text-green-500" />
              )}
              <div>
                <p className="text-sm text-gray-500">Payment Method</p>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    expense.paid_by_card 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {expense.paid_by_card ? '💳 Card Payment' : '💵 Cash Payment'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Added By</p>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{expense.added_by === 'he' ? '👨' : '👩'}</span>
                  <p className="font-medium text-gray-900 capitalize">{expense.added_by}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Tag className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium text-gray-900 capitalize">{expense.type || 'Standard'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      {expense.tags && expense.tags.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {expense.tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                style={{ 
                  backgroundColor: tag.color + '20', 
                  color: tag.color,
                  border: `1px solid ${tag.color}`
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Metadata</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Created At</p>
              <p className="font-medium text-gray-900">{formatDateTime(expense.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="font-medium text-gray-900">{formatDateTime(expense.updated_at)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Tag className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Expense ID</p>
              <p className="font-medium text-gray-900">#{expense.id}</p>
            </div>
          </div>

          {expense.vendor && (
            <div className="flex items-center space-x-3">
              <Store className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Vendor ID</p>
                <p className="font-medium text-gray-900">#{expense.vendor.id}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseOverview;