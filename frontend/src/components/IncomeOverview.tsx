import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Store, 
  Tag, 
  User, 
  MessageCircle,
  Clock,
  Edit
} from 'lucide-react';
import { incomeAPI, Income, formatAmount } from '../api/client';
import { getErrorMessage } from '../utils/errorHandler';

const IncomeOverview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [income, setIncome] = useState<Income | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchIncome();
    }
  }, [id]);

  const fetchIncome = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await incomeAPI.getIncome(parseInt(id!));
      setIncome(response.data);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to fetch income details'));
      console.error('Error fetching income:', err);
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
            onClick={() => navigate('/balance')}
            className="text-red-600 hover:text-red-800 underline ml-4"
          >
            Back to Balance Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!income) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Income not found</p>
        <button
          onClick={() => navigate('/balance')}
          className="mt-4 text-blue-600 hover:text-blue-800 underline"
        >
          Back to Balance Dashboard
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
              onClick={() => navigate('/balance')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Balance Dashboard
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/add')} // Assuming there's an edit functionality for incomes
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Income</span>
            </button>
          </div>
        </div>

        {/* Income Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {income.comment || income.source || 'Income Details'}
          </h1>
          <div className="text-4xl font-bold text-green-600">
            +{formatAmount(income.amount)}
          </div>
        </div>
      </div>

      {/* Income Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium text-gray-900">{formatDate(income.date)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <DollarSign className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-medium text-gray-900">+{formatAmount(income.amount)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Store className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Source</p>
                <p className="font-medium text-gray-900">{income.source || 'Unknown Source'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <MessageCircle className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="font-medium text-gray-900">{income.comment || 'No description'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor & Additional Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Details</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Store className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Vendor</p>
                {income.vendor ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getVendorTypeIcon(income.vendor.type)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{income.vendor.name}</p>
                      <p className="text-sm text-gray-500 capitalize">
                        {income.vendor.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="font-medium text-gray-500">No vendor specified</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Added By</p>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{income.added_by === 'he' ? '👨' : '👩'}</span>
                  <p className="font-medium text-gray-900 capitalize">{income.added_by}</p>
                </div>
              </div>
            </div>

            {income.vendor_id && (
              <div className="flex items-center space-x-3">
                <Tag className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Vendor ID</p>
                  <p className="font-medium text-gray-900">#{income.vendor_id}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tags */}
      {income.tags && income.tags.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {income.tags.map((tag) => (
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
              <p className="font-medium text-gray-900">{formatDateTime(income.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="font-medium text-gray-900">{formatDateTime(income.updated_at)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Tag className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Income ID</p>
              <p className="font-medium text-gray-900">#{income.id}</p>
            </div>
          </div>

          {income.vendor && (
            <div className="flex items-center space-x-3">
              <Store className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Vendor ID</p>
                <p className="font-medium text-gray-900">#{income.vendor.id}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncomeOverview;