import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import { expenseAPI, tagAPI, CSVImportPreview, CSVRowPreview, CreateExpenseRequest, Tag } from '../api/client';
import { getErrorMessage } from '../utils/errorHandler';
import VendorSelector from './VendorSelector';
import CategorySelector from './CategorySelector';

interface ImportExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (importedCount: number) => void;
}

const ImportExpenseModal: React.FC<ImportExpenseModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [csvData, setCsvData] = useState<string>('');
  const [preview, setPreview] = useState<CSVImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [allExpenses, setAllExpenses] = useState<CreateExpenseRequest[]>([]);
  const [expenseSelectedTags, setExpenseSelectedTags] = useState<number[][]>([]);

  React.useEffect(() => {
    if (isOpen) {
      fetchTags();
      // Reset state
      setCsvData('');
      setPreview(null);
      setError(null);
      setSuccess(null);
      setAllExpenses([]);
      setExpenseSelectedTags([]);
    }
  }, [isOpen]);


  const fetchTags = async () => {
    try {
      const response = await tagAPI.getTags();
      setTags(response.data);
    } catch (err: any) {
      console.error('Error fetching tags:', err);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvData(content);
        setPreview(null);
        setAllExpenses([]);
        setExpenseSelectedTags([]);
      };
      reader.readAsText(file);
    }
  };

  const handlePreviewCSV = async () => {
    if (!csvData.trim()) {
      setError('Please select a CSV file first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await expenseAPI.importCSVPreview(csvData);
      setPreview(response.data);
      
      // Check row limit
      if (response.data.rows.length > 100) {
        setError('CSV file contains more than 100 rows. Please reduce the number of rows and try again.');
        setLoading(false);
        return;
      }
      
      // Initialize all expenses from all rows
      if (response.data.rows && response.data.rows.length > 0) {
        initializeAllExpenses(response.data.rows);
      } else {
        setError('No valid expenses found in the CSV file');
      }
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to preview CSV'));
    } finally {
      setLoading(false);
    }
  };

  const initializeAllExpenses = (rows: CSVRowPreview[]) => {
    const allExpenses: CreateExpenseRequest[] = [];
    
    // Process all rows and collect all expenses
    rows.forEach((row, rowIndex) => {
      // Check if parsed_expenses exists and is an array
      if (row.parsed_expenses && Array.isArray(row.parsed_expenses)) {
        row.parsed_expenses.forEach(parsedExpense => {
          // User will need to manually select vendor with the new selector
          allExpenses.push({
            comment: `Row ${row.row_number}: ${parsedExpense.comment}`,
            amount: parsedExpense.amount,
            vendor_id: 0, // Will be selected manually using VendorSelector
            date: parsedExpense.date,
            category: parsedExpense.category,
            type: 'expense',
            paid_by_card: true,
            added_by: 'he' as const,
          });
        });
      }
    });
    
    setAllExpenses(allExpenses);
    setExpenseSelectedTags(allExpenses.map(() => []));
  };

  const handleBulkImport = async () => {
    if (!preview || allExpenses.length === 0) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let importedCount = 0;
      
      // Import all expenses one by one
      for (let i = 0; i < allExpenses.length; i++) {
        const expense = allExpenses[i];
        const expenseWithTags = {
          ...expense,
          tag_ids: expenseSelectedTags[i] || []
        };
        
        // Create each expense individually
        await expenseAPI.createExpense(expenseWithTags);
        importedCount++;
      }
      
      // Show success message
      setSuccess(`✅ Successfully imported ${importedCount} expense${importedCount > 1 ? 's' : ''}!`);
      
      // Notify parent to refresh expenses list
      onImportComplete(importedCount);
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to import expenses'));
    } finally {
      setLoading(false);
    }
  };

  const updateExpense = (index: number, field: string, value: any) => {
    setAllExpenses(prev => prev.map((expense, i) => 
      i === index ? { ...expense, [field]: value } : expense
    ));
  };

  const handleExpenseTagToggle = (expenseIndex: number, tagId: number) => {
    setExpenseSelectedTags(prev => 
      prev.map((tags, i) => 
        i === expenseIndex
          ? tags.includes(tagId) 
            ? tags.filter(id => id !== tagId)
            : [...tags, tagId]
          : tags
      )
    );
  };

  const handleVendorSelect = (index: number, vendorId: number) => {
    updateExpense(index, 'vendor_id', vendorId);
  };

  const handleCategorySelect = (index: number, categoryName: string) => {
    updateExpense(index, 'category', categoryName);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Import Expenses from CSV</h2>
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

        {success && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {!preview && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md border border-gray-300"
              >
                <Upload className="w-4 h-4" />
                <span>Choose CSV File</span>
              </button>
              {csvData && (
                <p className="text-sm text-green-600 mt-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  CSV file loaded ({csvData.split('\n').length - 1} rows)
                </p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-medium text-gray-900 mb-2">Expected CSV Format:</h3>
              <p className="text-sm text-gray-600">
                date, food, eating out, else, fees, household, car, clothing, living, transport, turismo
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Date format: "01/01/2025" (MM/DD/YYYY)
              </p>
            </div>

            <button
              onClick={handlePreviewCSV}
              disabled={loading || !csvData}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Preview Import'}
            </button>
          </div>
        )}

        {preview && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Found {allExpenses.length} expense{allExpenses.length > 1 ? 's' : ''} from {preview.rows.length} row{preview.rows.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              {preview.rows.some(row => row.issues && row.issues.length > 0) && (
                <div className="mt-2 p-3 bg-yellow-100 border border-yellow-400 rounded">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Some rows have issues - please review carefully</span>
                  </div>
                </div>
              )}
            </div>

            {allExpenses.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">
                    Review and Edit All Expenses ({allExpenses.length} found):
                  </h4>
                  <span className="text-sm text-gray-500">
                    Max 100 expenses allowed
                  </span>
                </div>
                
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {allExpenses.map((expense, index) => (
                    <div key={index} className="bg-white border border-gray-300 p-4 rounded-md space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <input
                            type="text"
                            value={expense.comment}
                            onChange={(e) => updateExpense(index, 'comment', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Amount (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={expense.amount}
                            onChange={(e) => updateExpense(index, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                          <CategorySelector
                            selectedCategoryName={expense.category}
                            onCategorySelect={(categoryName) => handleCategorySelect(index, categoryName)}
                            required
                            className="text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                          <VendorSelector
                            selectedVendorId={expense.vendor_id}
                            onVendorSelect={(vendorId) => handleVendorSelect(index, vendorId)}
                            required
                            className="text-sm"
                          />
                        </div>
                      </div>
                      
                      {/* Tags section */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                        <div className="flex flex-wrap gap-1">
                          {tags.map(tag => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleExpenseTagToggle(index, tag.id)}
                              className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                                expenseSelectedTags[index]?.includes(tag.id)
                                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                              }`}
                              style={{
                                backgroundColor: expenseSelectedTags[index]?.includes(tag.id) ? `${tag.color}20` : undefined,
                                borderColor: expenseSelectedTags[index]?.includes(tag.id) ? tag.color : undefined,
                                color: expenseSelectedTags[index]?.includes(tag.id) ? tag.color : undefined
                              }}
                            >
                              {tag.name.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleBulkImport}
                    disabled={loading || allExpenses.length === 0}
                    className="flex-1 bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Importing {allExpenses.length} expense{allExpenses.length > 1 ? 's' : ''}...
                      </>
                    ) : (
                      `Import All ${allExpenses.length} Expense${allExpenses.length > 1 ? 's' : ''}`
                    )}
                  </button>
                  
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="px-6 py-3 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No valid expenses found in the CSV file.</p>
                <p className="text-sm text-gray-500">
                  Make sure your CSV has the correct format with valid amounts greater than 0.
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportExpenseModal;