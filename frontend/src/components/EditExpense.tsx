import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { expenseAPI, tagAPI, Tag, CreateExpenseRequest, Expense } from '../api/client';
import { getErrorMessage } from '../utils/errorHandler';
import { useFormValidation, ValidationRules } from '../hooks/useFormValidation';
import FormField from './FormField';
import VendorSelector from './VendorSelector';
import CategorySelector from './CategorySelector';

const EditExpense: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expense, setExpense] = useState<Expense | null>(null);

  const initialFormData = {
    comment: '',
    amount: 0,
    vendor_id: 0,
    date: new Date().toISOString().split('T')[0],
    category: '',
    type: 'expense',
    added_by: 'he',
    payment_method: 'b_haspa_credit',
  };

  const validationRules: ValidationRules = {
    comment: {
      required: true,
      minLength: 3,
      maxLength: 100,
    },
    amount: {
      required: true,
      min: 0.01,
      max: 999999,
      custom: (value) => {
        if (isNaN(value) || value <= 0) {
          return 'Amount must be a positive number';
        }
        return null;
      }
    },
    vendor_id: {
      required: true,
      custom: (value) => {
        if (!value || value <= 0) {
          return 'Please select a vendor';
        }
        return null;
      }
    },
    date: {
      required: true,
      custom: (value) => {
        if (!value) return 'Date is required';
        const selectedDate = new Date(value);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(new Date().getFullYear() - 1);

        if (selectedDate < oneYearAgo) {
          return 'Date cannot be more than a year ago';
        }
        return null;
      }
    },
    category: {
      required: true,
      minLength: 2,
    },
  };

  const {
    values: formData,
    errors,
    setFieldValue,
    validateForm,
  } = useFormValidation(initialFormData, validationRules);

  const fetchExpense = async () => {
    if (!id) {
      setError('Expense ID is required');
      setLoading(false);
      return;
    }

    try {
      const response = await expenseAPI.getExpense(parseInt(id));
      const expenseData = response.data;
      setExpense(expenseData);

      // Pre-fill form with expense data
      setFieldValue('comment', expenseData.comment);
      setFieldValue('amount', expenseData.amount);
      setFieldValue('vendor_id', expenseData.vendor_id);
      setFieldValue('date', expenseData.date);
      setFieldValue('category', expenseData.category);
      setFieldValue('type', expenseData.type);
      setFieldValue('added_by', expenseData.added_by);
      setFieldValue('payment_method', expenseData.payment_method);

      // Set tags if they exist
      if (expenseData.tags && expenseData.tags.length > 0) {
        setSelectedTags(expenseData.tags.map(tag => tag.id));
      }
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to load expense'));
      console.error('Error fetching expense:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await tagAPI.getTags();
      setTags(response.data);
    } catch (err: any) {
      console.error('Error fetching tags:', err);
    }
  };

  useEffect(() => {
    fetchTags();
    fetchExpense();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleTagToggle = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate form
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }

    if (!id) {
      setError('Expense ID is required');
      return;
    }

    const expenseData: CreateExpenseRequest = {
      comment: formData.comment,
      amount: formData.amount,
      vendor_id: formData.vendor_id,
      date: formData.date,
      category: formData.category,
      type: formData.type,
      payment_method: formData.payment_method,
      added_by: formData.added_by,
      tag_ids: selectedTags
    };

    setSaving(true);
    try {
      await expenseAPI.updateExpense(parseInt(id), expenseData);
      setSuccess(`${formData.type === 'income' ? 'Income' : 'Expense'} updated successfully!`);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to update expense'));
      console.error('Error updating expense:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleVendorSelect = (vendorId: number) => {
    setFieldValue('vendor_id', vendorId);
  };

  const handleCategorySelect = (categoryName: string) => {
    setFieldValue('category', categoryName);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
          <p className="text-gray-700 dark:text-gray-300">Loading expense...</p>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <p className="text-red-600 dark:text-red-400">Expense not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Edit Transaction</h2>

        {error && (
          <div className="mb-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormField
            label="Description"
            name="comment"
            type="textarea"
            value={formData.comment}
            onChange={(value) => setFieldValue('comment', value)}
            error={errors.comment}
            placeholder="What is this transaction for?"
            required
            rows={3}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type *
            </label>
            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="expense"
                  checked={formData.type === 'expense'}
                  onChange={() => setFieldValue('type', 'expense')}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-300">💸 Expense</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="income"
                  checked={formData.type === 'income'}
                  onChange={() => setFieldValue('type', 'income')}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-300">💰 Income</span>
              </label>
            </div>
          </div>

          <FormField
            label="Amount (€)"
            name="amount"
            type="number"
            value={formData.amount}
            onChange={(value) => setFieldValue('amount', value)}
            error={errors.amount}
            placeholder="0.00"
            required
          />

          <div>
            <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Method
            </label>
            <select
              id="payment_method"
              name="payment_method"
              value={formData.payment_method}
              onChange={(e) => setFieldValue('payment_method', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="cash">💵 Cash</option>
              <option value="b_haspa_credit">🏦 B Haspa Credit</option>
              <option value="b_n26">🏦 B N26</option>
              <option value="m_n26">📱 M N26</option>
              <option value="m_haspa_credit">📱 M Haspa Credit</option>
              <option value="paypal">🅿️ PayPal</option>
              <option value="debit">💳 Debit Card</option>
              <option value="m_monobank">📱 M Monobank</option>
              <option value="b_monobank">🏦 B Monobank</option>
            </select>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category *
            </label>
            <CategorySelector
              selectedCategoryName={formData.category}
              onCategorySelect={handleCategorySelect}
              required
              error={!formData.category.trim() && error !== null}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagToggle(tag.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                    selectedTags.includes(tag.id)
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  style={{
                    backgroundColor: selectedTags.includes(tag.id) ? `${tag.color}20` : undefined,
                    borderColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                    color: selectedTags.includes(tag.id) ? tag.color : undefined
                  }}
                >
                  {tag.name.replace('_', ' ')}
                </button>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          <div>
            <label htmlFor="vendor_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Vendor *
            </label>
            <VendorSelector
              selectedVendorId={formData.vendor_id}
              onVendorSelect={handleVendorSelect}
              selectedCategoryName={formData.category}
              required
              error={formData.vendor_id === 0 && error !== null}
            />
          </div>

          <FormField
            label="Date"
            name="date"
            type="date"
            value={formData.date}
            onChange={(value) => setFieldValue('date', value)}
            error={errors.date}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Added By
            </label>
            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="added_by"
                  value="he"
                  checked={formData.added_by === 'he'}
                  onChange={() => setFieldValue('added_by', 'he')}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-300">👨 He</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="added_by"
                  value="she"
                  checked={formData.added_by === 'she'}
                  onChange={() => setFieldValue('added_by', 'she')}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-300">👩 She</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed transition-colors ${
                !saving
                  ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800 focus:ring-blue-500'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-md hover:bg-gray-400 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditExpense;
