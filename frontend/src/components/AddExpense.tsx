import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { expenseAPI, tagAPI, Tag, CreateExpenseRequest, Expense } from '../api/client';
import { getErrorMessage } from '../utils/errorHandler';
import { useFormValidation, ValidationRules } from '../hooks/useFormValidation';
import FormField from './FormField';
import VendorSelector from './VendorSelector';
import CategorySelector from './CategorySelector';
import DuplicateWarning from './DuplicateWarning';

const AddExpense: React.FC = () => {
  const navigate = useNavigate();
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Expense[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [pendingExpenseData, setPendingExpenseData] = useState<CreateExpenseRequest | null>(null);

  const initialFormData = {
    comment: '',
    amount: 0,
    vendor_id: 0,
    date: new Date().toISOString().split('T')[0],
    category: '',
    type: 'expense',
    paid_by_card: true,
    added_by: 'he',
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
        const today = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(today.getFullYear() - 1);
        
        if (selectedDate > today) {
          return 'Date cannot be in the future';
        }
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
    isValid,
    setFieldValue,
    validateForm,
    reset
  } = useFormValidation(initialFormData, validationRules);

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
  }, []);

  const handleTagToggle = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const checkForDuplicates = async (amount: number, date: string): Promise<Expense[]> => {
    try {
      const response = await expenseAPI.checkDuplicates(amount, date, 2);
      return response.data;
    } catch (err) {
      console.error('Error checking for duplicates:', err);
      return [];
    }
  };

  const createExpenseDirectly = async (expenseData: CreateExpenseRequest) => {
    try {
      await expenseAPI.createExpense(expenseData);
      setSuccess(`${formData.type === 'income' ? 'Income' : 'Expense'} added successfully!`);

      // Reset form using validation hook
      reset(initialFormData);
      setSelectedTags([]);
      setPendingExpenseData(null);
      setDuplicates([]);
      setShowDuplicateWarning(false);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to add expense'));
      console.error('Error adding expense:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Optional: Run validation to update error states, but don't block submission
    validateForm();

    const expenseData: CreateExpenseRequest = {
      comment: formData.comment,
      amount: formData.amount,
      vendor_id: formData.vendor_id,
      date: formData.date,
      category: formData.category,
      type: formData.type,
      paid_by_card: formData.paid_by_card,
      added_by: formData.added_by,
      tag_ids: selectedTags
    };

    // Only check for duplicates on expenses (not income)
    if (formData.type === 'expense') {
      setCheckingDuplicates(true);
      try {
        const foundDuplicates = await checkForDuplicates(formData.amount, formData.date);

        if (foundDuplicates.length > 0) {
          // Show duplicate warning
          setDuplicates(foundDuplicates);
          setPendingExpenseData(expenseData);
          setShowDuplicateWarning(true);
          setCheckingDuplicates(false);
          return;
        }
      } catch (err) {
        console.error('Error checking duplicates:', err);
        // Continue with creation even if duplicate check fails
      }
      setCheckingDuplicates(false);
    }

    // No duplicates found or this is income, proceed with creation
    setLoading(true);
    try {
      await createExpenseDirectly(expenseData);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateConfirm = async () => {
    if (!pendingExpenseData) return;

    setLoading(true);
    setShowDuplicateWarning(false);

    try {
      await createExpenseDirectly(pendingExpenseData);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateCancel = () => {
    setShowDuplicateWarning(false);
    setPendingExpenseData(null);
    setDuplicates([]);
  };

  const handleVendorSelect = (vendorId: number) => {
    setFieldValue('vendor_id', vendorId);
  };

  const handleCategorySelect = (categoryName: string) => {
    setFieldValue('category', categoryName);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Transaction</h2>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <span className="text-gray-700">💸 Expense</span>
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
                <span className="text-gray-700">💰 Income</span>
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
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
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
              <p className="text-xs text-gray-500 mt-2">
                {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          <div>
            <label htmlFor="vendor_id" className="block text-sm font-medium text-gray-700 mb-2">
              Vendor *
            </label>
            <VendorSelector
              selectedVendorId={formData.vendor_id}
              onVendorSelect={handleVendorSelect}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="paid_by_card"
                  checked={formData.paid_by_card === true}
                  onChange={() => setFieldValue('paid_by_card', true)}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">💳 Card</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="paid_by_card"
                  checked={formData.paid_by_card === false}
                  onChange={() => setFieldValue('paid_by_card', false)}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">💵 Cash</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <span className="text-gray-700">👨 He</span>
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
                <span className="text-gray-700">👩 She</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || checkingDuplicates}
              className={`flex-1 py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed transition-colors ${
                !loading && !checkingDuplicates
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {checkingDuplicates
                ? 'Checking for duplicates...'
                : loading
                ? 'Adding...'
                : `Add ${formData.type === 'income' ? 'Income' : 'Expense'}`}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Duplicate Warning Modal */}
      {showDuplicateWarning && (
        <DuplicateWarning
          duplicates={duplicates}
          newExpense={{
            amount: formData.amount,
            date: formData.date,
            comment: formData.comment
          }}
          onConfirm={handleDuplicateConfirm}
          onCancel={handleDuplicateCancel}
          loading={loading}
        />
      )}
    </div>
  );
};

export default AddExpense;