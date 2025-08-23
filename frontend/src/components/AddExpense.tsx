import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { expenseAPI, vendorAPI, Vendor, CreateExpenseRequest } from '../api/client';

const AddExpense: React.FC = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateExpenseRequest>({
    description: '',
    amount: 0,
    vendor_id: 0,
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await vendorAPI.getVendors();
      setVendors(response.data);
    } catch (err) {
      setError('Failed to fetch vendors');
      console.error('Error fetching vendors:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : name === 'vendor_id' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!formData.description.trim()) {
        throw new Error('Description is required');
      }
      if (formData.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      if (formData.vendor_id === 0) {
        throw new Error('Please select a vendor');
      }

      await expenseAPI.createExpense(formData);
      setSuccess('Expense added successfully!');
      
      // Reset form
      setFormData({
        description: '',
        amount: 0,
        vendor_id: 0,
        date: new Date().toISOString().split('T')[0],
      });

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to add expense');
      console.error('Error adding expense:', err);
    } finally {
      setLoading(false);
    }
  };

  const getVendorsByType = (type: string) => {
    return vendors.filter(vendor => vendor.type === type);
  };

  const vendorTypes = [
    { key: 'food_store', label: 'Food Stores' },
    { key: 'shop', label: 'Shops' },
    { key: 'eating_out', label: 'Eating Out' },
    { key: 'subscriptions', label: 'Subscriptions' },
    { key: 'else', label: 'Other' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Expense</h2>

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
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleInputChange}
              placeholder="What did you spend money on?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount ($) *
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
            <label htmlFor="vendor_id" className="block text-sm font-medium text-gray-700 mb-2">
              Vendor *
            </label>
            <select
              id="vendor_id"
              name="vendor_id"
              value={formData.vendor_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value={0}>Select a vendor</option>
              {vendorTypes.map(type => {
                const typeVendors = getVendorsByType(type.key);
                if (typeVendors.length === 0) return null;
                
                return (
                  <optgroup key={type.key} label={type.label}>
                    {typeVendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
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

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Expense'}
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
    </div>
  );
};

export default AddExpense;