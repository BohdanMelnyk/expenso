import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { expenseAPI, tagAPI, Expense, CreateExpenseRequest, Tag } from '../api/client';
import { getErrorMessage } from '../utils/errorHandler';
import VendorSelector from './VendorSelector';
import CategorySelector from './CategorySelector';

interface EditExpenseModalProps {
  expense: Expense;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedExpense: Expense) => void;
}

const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  expense,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  const [formData, setFormData] = useState<CreateExpenseRequest>({
    comment: expense.comment,
    amount: expense.amount,
    vendor_id: expense.vendor_id,
    date: expense.date,
    category: expense.category,
    type: expense.type,
    paid_by_card: expense.paid_by_card,
    added_by: expense.added_by,
  });

  useEffect(() => {
    if (isOpen) {
      fetchTags();
      // Reset form data when opening with new expense
      setFormData({
        comment: expense.comment,
        amount: expense.amount,
        vendor_id: expense.vendor_id,
        date: expense.date,
        category: expense.category,
        type: expense.type,
        paid_by_card: expense.paid_by_card,
        added_by: expense.added_by,
      });
      // Initialize selected tags with existing expense tags
      setSelectedTags(expense.tags?.map(tag => tag.id) || []);
      setError(null);
    }
  }, [isOpen, expense]);

  const fetchTags = async () => {
    try {
      const response = await tagAPI.getTags();
      setTags(response.data);
    } catch (err: any) {
      console.error('Error fetching tags:', err);
    }
  };



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleVendorSelect = (vendorId: number) => {
    setFormData(prev => ({ ...prev, vendor_id: vendorId }));
  };

  const handleCategorySelect = (categoryName: string) => {
    setFormData(prev => ({ ...prev, category: categoryName }));
  };

  const handleTagToggle = (tagId: number) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.comment.trim()) {
        throw new Error('Description is required');
      }
      if (formData.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      if (formData.vendor_id === 0) {
        throw new Error('Please select a vendor');
      }
      if (!formData.category.trim()) {
        throw new Error('Category is required');
      }

      const expenseData = {
        ...formData,
        tag_ids: selectedTags
      };
      const response = await expenseAPI.updateExpense(expense.id, expenseData);
      onUpdate(response.data);
      onClose();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to update expense'));
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Edit Expense</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="comment"
              name="comment"
              rows={3}
              value={formData.comment}
              onChange={handleInputChange}
              placeholder="What is this transaction for?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount (€) *
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              step="0.01"
              min="0.01"
              value={formData.amount || ''}
              onChange={handleInputChange}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
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
              required
              error={formData.vendor_id === 0 && error !== null}
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
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

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
                  onChange={() => setFormData(prev => ({ ...prev, paid_by_card: true }))}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">💳 Card</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="paid_by_card"
                  checked={formData.paid_by_card === false}
                  onChange={() => setFormData(prev => ({ ...prev, paid_by_card: false }))}
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
                  onChange={() => setFormData(prev => ({ ...prev, added_by: 'he' }))}
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
                  onChange={() => setFormData(prev => ({ ...prev, added_by: 'she' }))}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">👩 She</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Expense'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditExpenseModal;