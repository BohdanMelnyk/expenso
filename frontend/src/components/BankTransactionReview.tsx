import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BankTransaction, CreateExpenseRequest, BankImportPreview } from '../types/bankImport';
import { bankImportAPI } from '../api/client';
import { BankTransactionCard } from './BankTransactionCard';

export const BankTransactionReview: React.FC = () => {
  const navigate = useNavigate();
  const [previewData, setPreviewData] = useState<BankImportPreview | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [skipped, setSkipped] = useState<number[]>([]);
  const [added, setAdded] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedExpense, setEditedExpense] = useState<CreateExpenseRequest | null>(null);

  // Load preview data from session storage
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
    } catch (e) {
      setError('Failed to load preview data');
      navigate('/import/bank');
    }
  }, [navigate]);

  const initializeEditedExpense = (transaction: BankTransaction) => {
    setEditedExpense({
      amount: transaction.parsed_expense.amount,
      date: transaction.parsed_expense.date,
      type: 'expense',
      category: transaction.parsed_expense.category,
      comment: transaction.parsed_expense.description,
      vendor_id: transaction.parsed_expense.matched_vendor_id,
      payment_method: transaction.parsed_expense.payment_method,
      added_by: transaction.parsed_expense.added_by as 'he' | 'she',
    });
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
    setSkipped((prev) => [...prev, currentIndex]);
    goToNext();
  };

  const handleAddExpense = async () => {
    if (!editedExpense) return;

    setIsLoading(true);
    setError(null);

    try {
      const request = {
        transaction_data: currentTransaction,
        expense_data: editedExpense,
      };

      const response = await bankImportAPI.confirmBankTransaction(request);
      const expenseId = response.data.id;

      setAdded((prev) => ({ ...prev, [currentIndex]: expenseId }));
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
                    <input
                      type="text"
                      value={editedExpense.category}
                      onChange={(e) => handleExpenseFieldChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={editedExpense.comment}
                      onChange={(e) => handleExpenseFieldChange('comment', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>

                  {/* Added By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Who</label>
                    <select
                      value={editedExpense.added_by || 'he'}
                      onChange={(e) => handleExpenseFieldChange('added_by', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="he">He</option>
                      <option value="she">She</option>
                    </select>
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
    </div>
  );
};
