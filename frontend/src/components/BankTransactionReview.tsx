import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BankTransaction, CreateExpenseRequest, BankImportPreview } from '../types/bankImport';
import { bankImportAPI, tagAPI, Tag, expenseAPI } from '../api/client';
import { BankTransactionCard } from './BankTransactionCard';
import VendorSelector from './VendorSelector';
import CategorySelector from './CategorySelector';
import { TagInput } from './TagInput';

/**
 * BankTransactionReview Component - Bank Statement Import Review Interface
 *
 * FEATURE: "Added by" field is always set to "He" and hidden from UI
 * - The "Added by" field has been removed from the bank import UI
 * - All bank-imported expenses default to "He" for consistency
 * - This is a deliberate UX decision to simplify the import workflow
 * - The field is still stored in the database but not exposed in bank imports
 * - Users adding expenses manually can still choose "He" or "She" in the regular Add form
 *
 * WORKFLOW:
 * 1. Upload bank CSV file from BankImportScreen
 * 2. Review each transaction one at a time
 * 3. Edit expense details (amount, date, category, description)
 * 4. Click "Add Expense" or "Skip" to process
 * 5. Navigate with Back/Next buttons
 * 6. Progress tracking shows X of Y added
 */

export const BankTransactionReview: React.FC = () => {
  const navigate = useNavigate();
  const [previewData, setPreviewData] = useState<BankImportPreview | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [added, setAdded] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedExpense, setEditedExpense] = useState<CreateExpenseRequest | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [proceedWithDuplicate, setProceedWithDuplicate] = useState(false);

  // Load preview data from session storage and fetch tags
  useEffect(() => {
    const stored = sessionStorage.getItem('bankImportPreview');
    if (!stored) {
      navigate('/import/bank');
      return;
    }

    try {
      const data: BankImportPreview = JSON.parse(stored);
      setPreviewData(data);
      initializeEditedExpense(data.transactions[0]);
      fetchTags();
    } catch (e) {
      setError('Failed to load preview data');
      navigate('/import/bank');
    }
  }, [navigate]);

  const fetchTags = async () => {
    try {
      const response = await tagAPI.getTags();
      setTags(response.data);
    } catch (err: any) {
      console.error('Error fetching tags:', err);
    }
  };

  /**
   * FEATURE: "Added by" defaults to "He" for all bank imports
   * - Field is hidden from UI (not shown to users)
   * - Always defaults to 'he' for consistency
   * - Users cannot change this during bank import
   * - Regular expense additions still allow 'he'/'she' selection
   */
  const initializeEditedExpense = (transaction: BankTransaction) => {
    setEditedExpense({
      amount: transaction.parsed_expense.amount,
      date: transaction.parsed_expense.date,
      type: 'expense',
      category: transaction.parsed_expense.category,
      comment: transaction.parsed_expense.description,
      vendor_id: transaction.parsed_expense.matched_vendor_id,
      payment_method: transaction.parsed_expense.payment_method,
      added_by: 'he', // FEATURE: Always defaults to "he" - hidden from UI
      tag_ids: [],
    });
    setSelectedTags([]);
  };

  if (!previewData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  const currentTransaction = previewData.transactions[currentIndex];
  const totalCount = previewData.total_count;
  const addedCount = Object.keys(added).length;

  const handleSkip = () => {
    goToNext();
  };

  const handleAddExpense = async () => {
    if (!editedExpense) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check for duplicates within 5 days of the transaction date
      const duplicateResponse = await expenseAPI.checkDuplicates(
        Math.abs(editedExpense.amount),
        editedExpense.date,
        5
      );

      // If duplicates found, show warning dialog
      if (duplicateResponse.data && duplicateResponse.data.length > 0) {
        setDuplicates(duplicateResponse.data);
        setShowDuplicateWarning(true);
        setIsLoading(false);
        return;
      }

      // No duplicates, proceed with adding expense
      await proceedAddExpense();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to check duplicates';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const proceedAddExpense = async () => {
    if (!editedExpense) return;

    setIsLoading(true);
    setError(null);

    try {
      const request = {
        transaction_data: currentTransaction,
        expense_data: {
          ...editedExpense,
          // FEATURE: Enforce "he" for bank imports (hidden from UI, always set to "he")
          added_by: 'he',
          tag_ids: selectedTags,
        },
      };

      const response = await bankImportAPI.confirmBankTransaction(request);
      const expenseId = response.data.id;

      setAdded((prev) => ({ ...prev, [currentIndex]: expenseId }));
      setShowDuplicateWarning(false);
      setProceedWithDuplicate(false);
      setDuplicates([]);
      goToNext();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create expense';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const goToNext = () => {
    if (currentIndex < totalCount - 1) {
      setCurrentIndex((prev) => prev + 1);
      initializeEditedExpense(previewData.transactions[currentIndex + 1]);
      setError(null);
    } else {
      // All transactions processed
      navigate('/expenses');
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      initializeEditedExpense(previewData.transactions[currentIndex - 1]);
      setError(null);
    }
  };

  const handleExpenseFieldChange = (field: keyof CreateExpenseRequest, value: any) => {
    setEditedExpense((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleVendorSelect = (vendorId: number) => {
    setEditedExpense((prev) => (prev ? { ...prev, vendor_id: vendorId } : null));
  };

  const handleCategorySelect = (categoryName: string) => {
    setEditedExpense((prev) => (prev ? { ...prev, category: categoryName } : null));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Review Transactions</h1>
            <button
              onClick={() => navigate('/import/bank')}
              className="text-gray-600 hover:text-gray-900 text-sm"
            >
              Start Over
            </button>
          </div>

          {/* Progress */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{currentIndex + 1}</p>
                <p className="text-sm text-gray-600">Current</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{addedCount}</p>
                <p className="text-sm text-gray-600">Added</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">{totalCount}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
            </div>
            <div className="mt-4 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Transaction Details (Left) */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction Details</h2>
            <BankTransactionCard transaction={currentTransaction} />
          </div>

          {/* Expense Form (Right) */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Expense</h2>
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {editedExpense && (
                <>
                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount ({editedExpense.payment_method})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editedExpense.amount}
                      onChange={(e) => handleExpenseFieldChange('amount', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={editedExpense.date}
                      onChange={(e) => handleExpenseFieldChange('date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <CategorySelector
                      selectedCategoryName={editedExpense.category}
                      onCategorySelect={handleCategorySelect}
                    />
                  </div>

                  {/* Vendor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                    <VendorSelector
                      selectedVendorId={editedExpense.vendor_id || 0}
                      onVendorSelect={handleVendorSelect}
                      selectedCategoryName={editedExpense.category}
                    />
                  </div>

                  {/* Tags with Creation Capability */}
                  <TagInput
                    selectedTags={selectedTags}
                    onTagsChange={setSelectedTags}
                    availableTags={tags}
                    onTagsRefresh={fetchTags}
                  />

                  {/* Comment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={editedExpense.comment}
                      maxLength={2000}
                      onChange={(e) => handleExpenseFieldChange('comment', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={handleSkip}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:bg-gray-100"
                >
                  Skip
                </button>
                <button
                  onClick={handleAddExpense}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {isLoading ? 'Adding...' : 'Add Expense'}
                </button>
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  ← Back
                </button>
                <button
                  onClick={goToNext}
                  disabled={currentIndex === totalCount - 1}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Duplicate Warning Dialog */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">⚠️ Possible Duplicate Expense</h2>
              <p className="text-gray-600">
                We found {duplicates.length} similar expense{duplicates.length !== 1 ? 's' : ''} in the last 5 days with the same amount.
                Please verify before adding.
              </p>
            </div>

            {/* Existing Expenses List */}
            <div className="mb-6 bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Existing Similar Expenses:</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {duplicates.map((expense) => (
                  <div key={expense.id} className="flex justify-between items-center p-3 bg-white border border-yellow-200 rounded">
                    <div>
                      <p className="font-medium text-gray-900">{expense.comment}</p>
                      <p className="text-sm text-gray-600">
                        {expense.date} • {expense.category} • {expense.vendor?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">€{Math.abs(expense.amount).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{expense.payment_method}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Transaction Details */}
            <div className="mb-6 bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Transaction to Add:</h3>
              <div className="flex justify-between items-center p-3">
                <div>
                  <p className="font-medium text-gray-900">{editedExpense?.comment}</p>
                  <p className="text-sm text-gray-600">
                    {editedExpense?.date} • {editedExpense?.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">€{Math.abs(editedExpense?.amount || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDuplicateWarning(false);
                  setDuplicates([]);
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={proceedAddExpense}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-400"
              >
                {isLoading ? 'Adding...' : 'Add Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
