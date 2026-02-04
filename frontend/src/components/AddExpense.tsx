import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { expenseAPI, tagAPI, Tag, CreateExpenseRequest, Expense, ParsedExpenseResponse } from '../api/client';
import { getErrorMessage } from '../utils/errorHandler';
import { useFormValidation, ValidationRules } from '../hooks/useFormValidation';
import FormField from './FormField';
import VendorSelector from './VendorSelector';
import CategorySelector from './CategorySelector';
import DuplicateWarning from './DuplicateWarning';
import AIExpenseParser from './AIExpenseParser';
import { TagInput } from './TagInput';

/**
 * AddExpense Component - Add New Transaction Form
 *
 * UPDATED FEATURES:
 * 1. TAGS: Auto-addable with space-based creation
 *    - NEW: TagInput component replaces simple button selection
 *    - Type a tag name and press SPACE or ENTER to create/select
 *    - Async tag creation with random colors
 *    - Duplicate tag detection
 *    - Existing tag suggestions for quick selection
 *    - Click X to remove tags
 *    - Positioned at the end of the form (after Date field)
 *
 * 2. ADDED_BY: Always defaults to "He" for bank imports
 *    - Regular expense form still allows "He"/"She" selection
 *    - Bank import transactions always use "He" (hidden in BankTransactionReview)
 *    - See BankTransactionReview component for bank import UI
 *
 * 3. DATE FIELD: Supports future dates for pre-booked transactions
 *    - Users can add transactions with future dates
 *    - Perfect for pre-booked items like flights, hotels, events
 *    - Past dates limited to 1 year ago
 *    - Future dates have no limit
 */

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

        // FEATURE: Allow future dates for pre-booked transactions (e.g., flight tickets)
        // Only restrict past dates to within 1 year
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
      payment_method: formData.payment_method,
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

  const handleParsedExpense = (parsed: ParsedExpenseResponse) => {
    // Pre-fill form with parsed data
    setFieldValue('amount', parsed.amount);
    setFieldValue('comment', parsed.description || '');
    setFieldValue('category', parsed.category);
    setFieldValue('date', parsed.date);
    setFieldValue('payment_method', parsed.payment_method || 'b_haspa_credit');
    setFieldValue('added_by', parsed.added_by || 'he');

    // If vendor was matched, set it
    if (parsed.matched_vendor_id) {
      setFieldValue('vendor_id', parsed.matched_vendor_id);
    }

    // Show success notification with confidence
    setError(null);
    setSuccess(
      `Parsed with ${(parsed.confidence_score * 100).toFixed(0)}% confidence. Please review and submit.`
    );

    // Clear success message after 5 seconds
    setTimeout(() => setSuccess(null), 5000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add New Transaction</h2>
          <button
            type="button"
            onClick={() => navigate('/import/bank')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Import Bank Statement
          </button>
        </div>

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

        <AIExpenseParser onParsed={handleParsedExpense} />

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
            <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <select
              id="payment_method"
              name="payment_method"
              value={formData.payment_method}
              onChange={(e) => setFieldValue('payment_method', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
            <label htmlFor="vendor_id" className="block text-sm font-medium text-gray-700 mb-2">
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

          {/* FEATURE: Date field supports future dates for pre-booked items (flights, hotels, etc) */}
          <FormField
            label="Date"
            name="date"
            type="date"
            value={formData.date}
            onChange={(value) => setFieldValue('date', value)}
            error={errors.date}
            required
          />
          <p className="text-xs text-gray-500 -mt-4">
            📅 You can add transactions with past (within 1 year) or future dates
          </p>

          {/* FEATURE: New TagInput component with space-based auto-addition - moved to end */}
          <TagInput
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            availableTags={tags}
            onTagsRefresh={fetchTags}
          />

          {/* FEATURE: "Added By" field is hidden from UI - always defaults to 'he' */}
          {/* Users cannot change this field - it's set programmatically */}

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