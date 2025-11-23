import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Trash2, Edit, Download, Upload, FileText } from 'lucide-react';
import { expenseAPI, Expense, formatAmount } from '../api/client';
import { usePeriod } from '../contexts/PeriodContext';
import { usePeriodDateRange } from '../hooks/usePeriodDateRange';
import { getErrorMessage } from '../utils/errorHandler';
import { isCardPayment, getPaymentMethodLabel } from '../utils/paymentMethod';
import { formatDateLocal } from '../utils/dateFormatter';
import EditExpenseModal from './EditExpenseModal';
import ImportExpenseModal from './ImportExpenseModal';
import SkeletonLoader from './SkeletonLoader';
import SearchInput, { SearchFilters } from './SearchInput';
import { exportToPDF } from '../utils/pdfExport';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { period } = usePeriod();
  const { startDate, endDate } = usePeriodDateRange(period);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ paymentMethod: 'all' });
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      // Format dates in local timezone (not UTC) to avoid timezone shifts
      const startDateStr = formatDateLocal(startDate);
      const endDateStr = formatDateLocal(endDate);
      const response = await expenseAPI.getActualExpenses(startDateStr, endDateStr);
      setExpenses(response.data);
      setFilteredExpenses(response.data);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to fetch expenses'));
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // Filter and search functionality
  const handleSearch = useCallback((query: string, filters: SearchFilters) => {
    setSearchQuery(query);
    setSearchFilters(filters);

    let filtered = [...expenses];

    // Text search
    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      filtered = filtered.filter(expense => 
        expense.comment.toLowerCase().includes(searchTerm) ||
        expense.vendor?.name.toLowerCase().includes(searchTerm) ||
        expense.amount.toString().includes(searchTerm)
      );
    }

    // Filter by category (assuming category is stored in comment or tags)
    if (filters.category) {
      const categoryTerm = filters.category.toLowerCase();
      filtered = filtered.filter(expense => 
        expense.comment.toLowerCase().includes(categoryTerm) ||
        expense.tags?.some(tag => tag.name.toLowerCase().includes(categoryTerm))
      );
    }

    // Filter by vendor
    if (filters.vendor) {
      const vendorTerm = filters.vendor.toLowerCase();
      filtered = filtered.filter(expense => 
        expense.vendor?.name.toLowerCase().includes(vendorTerm)
      );
    }

    // Filter by amount range
    if (filters.minAmount !== undefined && filters.minAmount > 0) {
      filtered = filtered.filter(expense => expense.amount >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined && filters.maxAmount > 0) {
      filtered = filtered.filter(expense => expense.amount <= filters.maxAmount!);
    }

    // Filter by payment method
    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      filtered = filtered.filter(expense => {
        const paymentMethod = expense.payment_method || (expense.paid_by_card ? 'card' : 'cash');
        if (filters.paymentMethod === 'card') return isCardPayment(paymentMethod);
        if (filters.paymentMethod === 'cash') return paymentMethod === 'cash';
        return true;
      });
    }

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter(expense => expense.date >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(expense => expense.date <= filters.dateTo!);
    }

    setFilteredExpenses(filtered);
  }, [expenses]);

  // Update filtered expenses when main expenses change
  useEffect(() => {
    handleSearch(searchQuery, searchFilters);
  }, [expenses, handleSearch, searchQuery, searchFilters]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await expenseAPI.deleteExpense(id);
        setExpenses(expenses.filter(expense => expense.id !== id));
        setFilteredExpenses(filteredExpenses.filter(expense => expense.id !== id));
      } catch (err: any) {
        setError(getErrorMessage(err, 'Failed to delete expense'));
        console.error('Error deleting expense:', err);
      }
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsEditModalOpen(true);
  };

  const handleUpdateExpense = (updatedExpense: Expense) => {
    setExpenses(expenses.map(expense => 
      expense.id === updatedExpense.id ? updatedExpense : expense
    ));
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingExpense(null);
  };

  const handleRowClick = (expenseId: number) => {
    navigate(`/expenses/${expenseId}`);
  };

  const handleExportCSV = async () => {
    try {
      const startDateStr = formatDateLocal(startDate);
      const endDateStr = formatDateLocal(endDate);
      const response = await expenseAPI.exportCSV(startDateStr, endDateStr);

      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expenses_${period}_export.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to export expenses'));
      console.error('Error exporting expenses:', err);
    }
  };

  const handleImportComplete = (importedCount: number) => {
    // Refresh expenses after each import (called for each row)
    if (importedCount > 0) {
      fetchExpenses();
    }
    // Don't close modal here - let the ImportExpenseModal handle closing when complete
  };

  const handleImportModalClose = () => {
    setIsImportModalOpen(false);
    // Final refresh when modal closes
    fetchExpenses();
  };

  const handleExportPDF = async () => {
    try {
      // For now, we'll export current expenses and fetch incomes if needed
      // You may need to add an incomes API call here
      const exportData = {
        expenses: expenses.map(expense => ({
          ...expense,
          paid_by_card: expense.paid_by_card ?? false,
          tags: expense.tags?.map(tag => tag.name) || []
        })),
        incomes: [], // Add income data if available
        period: period
      };

      exportToPDF(exportData);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to export PDF'));
      console.error('Error exporting PDF:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };


  const getTotalExpenses = () => {
    return filteredExpenses.reduce((total, expense) => total + expense.amount, 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <div className="animate-pulse bg-gray-200 rounded h-8 w-48"></div>
          <div className="flex gap-2">
            <div className="animate-pulse bg-gray-200 rounded h-10 w-24"></div>
            <div className="animate-pulse bg-gray-200 rounded h-10 w-24"></div>
          </div>
        </div>
        
        {/* Stats skeleton */}
        <SkeletonLoader type="stats" />
        
        {/* Table skeleton */}
        <SkeletonLoader type="table" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Expense Dashboard
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Showing actual expenses (salary income excluded)
            </p>
          </div>

          {/* Controls: Export Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center space-x-2 bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 text-sm"
                title="Import expenses from CSV"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Import CSV</span>
                <span className="sm:hidden">Import</span>
              </button>
              
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-2 bg-green-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-sm"
                title="Export expenses to CSV (Card payments by 'He' only)"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">CSV</span>
              </button>
              
              <button
                onClick={handleExportPDF}
                className="flex items-center space-x-2 bg-red-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-sm"
                title="Export expenses to PDF"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-red-900">Total Actual Expenses</h3>
            <p className="text-2xl font-bold text-red-600">{formatAmount(getTotalExpenses())}</p>
            <p className="text-xs text-red-700 mt-1">Excluding salary income</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900">Number of Expenses</h3>
            <p className="text-2xl font-bold text-blue-600">{filteredExpenses.length}</p>
            <p className="text-xs text-blue-700 mt-1">Spending transactions</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Actual Expenses
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Showing spending transactions only (salary income excluded)
              </p>
            </div>
            <div className="sm:w-96">
              <SearchInput
                onSearch={handleSearch}
                placeholder="Search expenses..."
                className="w-full"
                showFilters={true}
              />
            </div>
          </div>
        </div>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    {expenses.length === 0 ? (
                      <>No expenses found. <a href="/add" className="text-blue-600 hover:text-blue-800">Add your first expense</a></>
                    ) : (
                      'No expenses match your search criteria.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr 
                    key={expense.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRowClick(expense.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.comment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatAmount(expense.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.vendor ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {expense.vendor.name} ({expense.vendor.type.replace('_', ' ')})
                        </span>
                      ) : (
                        'Unknown Vendor'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isCardPayment(expense.payment_method || (expense.paid_by_card ? 'card' : 'cash'))
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {getPaymentMethodLabel(expense.payment_method || (expense.paid_by_card ? 'card' : 'cash'))}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(expense);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                        title="Edit expense"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(expense.id);
                        }}
                        className="text-red-600 hover:text-red-900 mr-2"
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 custom-scroll">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {expenses.length === 0 ? (
                <>
                  <p>No expenses found.</p>
                  <a href="/add" className="text-blue-600 hover:text-blue-800 font-medium">
                    Add your first expense
                  </a>
                </>
              ) : (
                <p>No expenses match your search criteria.</p>
              )}
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer mobile-card"
                onClick={() => handleRowClick(expense.id)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {expense.comment || 'No description'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(expense.date)}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-red-600">
                      {formatAmount(expense.amount)}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {expense.vendor && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                      {expense.vendor.name}
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                    isCardPayment(expense.payment_method || (expense.paid_by_card ? 'card' : 'cash'))
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {getPaymentMethodLabel(expense.payment_method || (expense.paid_by_card ? 'card' : 'cash'))}
                  </span>
                </div>
                
                <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(expense);
                    }}
                    className="text-blue-600 hover:text-blue-800 p-2 -m-2 transition-colors"
                    title="Edit expense"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(expense.id);
                    }}
                    className="text-red-600 hover:text-red-800 p-2 -m-2 transition-colors"
                    title="Delete expense"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onUpdate={handleUpdateExpense}
        />
      )}
      
      <ImportExpenseModal
        isOpen={isImportModalOpen}
        onClose={handleImportModalClose}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};

export default Dashboard;