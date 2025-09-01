import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Trash2, Calendar, Edit, Download, Upload } from 'lucide-react';
import { expenseAPI, Expense, formatAmount } from '../api/client';
import { getErrorMessage } from '../utils/errorHandler';
import EditExpenseModal from './EditExpenseModal';
import ImportExpenseModal from './ImportExpenseModal';

type DateRange = 'current_month' | 'this_year' | 'overall';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<DateRange>('current_month');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Check for URL parameters for month filtering
  const urlMonth = searchParams.get('month');
  const urlYear = searchParams.get('year');
  const urlStart = searchParams.get('start');
  const urlEnd = searchParams.get('end');

  useEffect(() => {
    fetchExpenses();
  }, [selectedRange, urlStart, urlEnd]);

  const getDateRangeParams = (range: DateRange): { startDate?: string; endDate?: string } => {
    // Check if URL parameters override the range selection
    if (urlStart && urlEnd) {
      return {
        startDate: urlStart,
        endDate: urlEnd
      };
    }
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (range) {
      case 'current_month':
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        return {
          startDate: firstDayOfMonth.toISOString().split('T')[0],
          endDate: lastDayOfMonth.toISOString().split('T')[0]
        };
      case 'this_year':
        return {
          startDate: `${currentYear}-01-01`,
          endDate: `${currentYear}-12-31`
        };
      case 'overall':
      default:
        return {};
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRangeParams(selectedRange);
      const response = await expenseAPI.getActualExpenses(startDate, endDate);
      setExpenses(response.data);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to fetch expenses'));
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await expenseAPI.deleteExpense(id);
        setExpenses(expenses.filter(expense => expense.id !== id));
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
      const { startDate, endDate } = getDateRangeParams(selectedRange);
      const response = await expenseAPI.exportCSV(startDate, endDate);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expenses_${selectedRange}_export.csv`;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };


  const getTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
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
        {error}
      </div>
    );
  }

  const getRangeLabel = (range: DateRange): string => {
    switch (range) {
      case 'current_month': return 'This Month';
      case 'this_year': return 'This Year';
      case 'overall': return 'Overall';
      default: return 'This Month';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Expense Dashboard
              {urlMonth && urlYear && (
                <span className="text-lg text-blue-600 ml-2">- {urlMonth} {urlYear}</span>
              )}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {urlMonth && urlYear ? `Showing expenses for ${urlMonth} ${urlYear}` : 'Showing actual expenses (salary income excluded)'}
              {urlMonth && urlYear && (
                <button
                  onClick={() => {
                    setSearchParams({});
                    navigate('/');
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-800 text-xs underline"
                >
                  Clear filter
                </button>
              )}
            </p>
          </div>
          
          {/* Controls: Date Range Filter and Export Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <select
                value={selectedRange}
                onChange={(e) => setSelectedRange(e.target.value as DateRange)}
                className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="current_month">This Month</option>
                <option value="this_year">This Year</option>
                <option value="overall">Overall</option>
              </select>
            </div>
            
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
                <span className="sm:hidden">Export</span>
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-red-900">Total Actual Expenses</h3>
            <p className="text-2xl font-bold text-red-600">{formatAmount(getTotalExpenses())}</p>
            <p className="text-xs text-red-700 mt-1">Excluding salary income</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900">Number of Expenses</h3>
            <p className="text-2xl font-bold text-blue-600">{expenses.length}</p>
            <p className="text-xs text-blue-700 mt-1">Spending transactions</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900">Average Expense</h3>
            <p className="text-2xl font-bold text-purple-600">
              {expenses.length > 0 ? formatAmount(getTotalExpenses() / expenses.length) : '$0.00'}
            </p>
            <p className="text-xs text-purple-700 mt-1">Per transaction</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Actual Expenses - {getRangeLabel(selectedRange)}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Showing spending transactions only (salary income excluded)
          </p>
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
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No expenses found. <a href="/add" className="text-blue-600 hover:text-blue-800">Add your first expense</a>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
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
                        expense.paid_by_card 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {expense.paid_by_card ? '💳 Card' : '💵 Cash'}
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
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No expenses found.</p>
              <a href="/add" className="text-blue-600 hover:text-blue-800 font-medium">
                Add your first expense
              </a>
            </div>
          ) : (
            expenses.map((expense) => (
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
                    expense.paid_by_card 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {expense.paid_by_card ? '💳 Card' : '💵 Cash'}
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