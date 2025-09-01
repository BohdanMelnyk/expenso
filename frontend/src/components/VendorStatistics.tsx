import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Calendar, TrendingDown, DollarSign, Store, CreditCard, Banknote } from 'lucide-react';
import { expenseAPI, incomeAPI, Expense, Income, formatAmount } from '../api/client';
import { getErrorMessage } from '../utils/errorHandler';

type TimeFrame = 'week' | 'month' | 'quarter' | 'year' | 'this_month' | 'last_30_days' | 'last_90_days' | 'this_year' | 'custom';
type ViewType = 'daily' | 'weekly' | 'monthly';

interface TimeData {
  date: string;
  amount: number;
  count: number;
}

interface TransactionData {
  id: number;
  date: string;
  amount: number;
  comment: string;
  type: 'expense' | 'income';
  paid_by_card?: boolean;
  added_by?: 'he' | 'she';
}

const VendorStatistics: React.FC = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [vendorName, setVendorName] = useState<string>('');
  const [vendorType, setVendorType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('month');
  const [selectedViewType, setSelectedViewType] = useState<ViewType>('daily');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomRange, setShowCustomRange] = useState<boolean>(false);

  useEffect(() => {
    if (vendorId) {
      fetchVendorData();
    }
  }, [vendorId, selectedTimeFrame, customStartDate, customEndDate]);

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { startDate, endDate } = getDateRangeParams(selectedTimeFrame);
      
      // Fetch both expenses and incomes for this vendor
      const [expensesResponse, incomesResponse] = await Promise.all([
        expenseAPI.getExpenses(startDate, endDate),
        incomeAPI.getIncomes(startDate, endDate)
      ]);
      
      // Filter by vendor ID
      const vendorExpenses = expensesResponse.data.filter(expense => 
        expense.vendor?.id === parseInt(vendorId!)
      );
      const vendorIncomes = incomesResponse.data.filter(income => 
        income.vendor?.id === parseInt(vendorId!)
      );
      
      setExpenses(vendorExpenses);
      setIncomes(vendorIncomes);
      
      // Set vendor info from first transaction
      const firstTransaction = vendorExpenses[0] || vendorIncomes[0];
      if (firstTransaction?.vendor) {
        setVendorName(firstTransaction.vendor.name);
        setVendorType(firstTransaction.vendor.type);
      }
      
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to fetch vendor data'));
      console.error('Error fetching vendor data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeParams = (timeFrame: TimeFrame): { startDate?: string; endDate?: string } => {
    if (timeFrame === 'custom') {
      return {
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined
      };
    }

    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    const startDate = new Date();

    switch (timeFrame) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'this_month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last_30_days':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'last_90_days':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'this_year':
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate
    };
  };

  const getTimeSeriesData = (): TimeData[] => {
    const dataMap = new Map<string, { amount: number; count: number }>();
    
    // Combine expenses and incomes
    const allTransactions: TransactionData[] = [
      ...expenses.map(exp => ({
        id: exp.id,
        date: exp.date,
        amount: exp.amount,
        comment: exp.comment,
        type: 'expense' as const,
        paid_by_card: exp.paid_by_card,
        added_by: exp.added_by
      })),
      ...incomes.map(inc => ({
        id: inc.id,
        date: inc.date,
        amount: inc.amount,
        comment: inc.comment,
        type: 'income' as const,
        added_by: inc.added_by
      }))
    ];
    
    allTransactions.forEach(transaction => {
      let key: string;
      const date = new Date(transaction.date);
      
      switch (selectedViewType) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - date.getDay());
          key = startOfWeek.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!dataMap.has(key)) {
        dataMap.set(key, { amount: 0, count: 0 });
      }
      
      const data = dataMap.get(key)!;
      data.amount += transaction.amount;
      data.count += 1;
    });

    return Array.from(dataMap.entries())
      .map(([date, data]) => ({
        date,
        amount: data.amount,
        count: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const getRecentTransactions = () => {
    const allTransactions: TransactionData[] = [
      ...expenses.map(exp => ({
        id: exp.id,
        date: exp.date,
        amount: exp.amount,
        comment: exp.comment,
        type: 'expense' as const,
        paid_by_card: exp.paid_by_card,
        added_by: exp.added_by
      })),
      ...incomes.map(inc => ({
        id: inc.id,
        date: inc.date,
        amount: inc.amount,
        comment: inc.comment,
        type: 'income' as const,
        added_by: inc.added_by
      }))
    ];

    return allTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);
  };

  const getVendorTypeIcon = (type: string) => {
    switch (type) {
      case 'food_store': return '🛒';
      case 'eating_out': return '🍽️';
      case 'transport': return '🚗';
      case 'household': return '🏠';
      case 'clothing': return '👕';
      case 'care': return '💊';
      case 'living': return '🏡';
      case 'subscriptions': return '📱';
      case 'tourism': return '✈️';
      case 'car': return '🚙';
      case 'salary': return '💰';
      default: return '📦';
    }
  };

  const handleTimeFrameChange = (timeFrame: TimeFrame) => {
    setSelectedTimeFrame(timeFrame);
    if (timeFrame === 'custom') {
      setShowCustomRange(true);
      if (!customStartDate) {
        const now = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        setCustomStartDate(oneMonthAgo.toISOString().split('T')[0]);
        setCustomEndDate(now.toISOString().split('T')[0]);
      }
    } else {
      setShowCustomRange(false);
    }
  };

  const getTimeFrameLabel = (timeFrame: TimeFrame): string => {
    switch (timeFrame) {
      case 'week': return 'Last Week';
      case 'month': return 'Last Month';
      case 'quarter': return 'Last 3 Months';
      case 'year': return 'Last Year';
      case 'this_month': return 'This Month';
      case 'last_30_days': return 'Last 30 Days';
      case 'last_90_days': return 'Last 90 Days';
      case 'this_year': return 'This Year';
      case 'custom': 
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const end = new Date(customEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return `${start} - ${end}`;
        }
        return 'Custom Range';
      default: return 'Last Month';
    }
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

  const timeSeriesData = getTimeSeriesData();
  const recentTransactions = getRecentTransactions();
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalIncomes = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const netAmount = totalIncomes - totalExpenses;
  const avgTransaction = (expenses.length + incomes.length) > 0 ? (totalExpenses + totalIncomes) / (expenses.length + incomes.length) : 0;
  const vendorTypeIcon = getVendorTypeIcon(vendorType);
  const vendorTypeLabel = vendorType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  
  // Payment method analysis
  const cardExpenses = expenses.filter(exp => exp.paid_by_card).length;
  const cashExpenses = expenses.filter(exp => !exp.paid_by_card).length;
  const cardAmount = expenses.filter(exp => exp.paid_by_card).reduce((sum, exp) => sum + exp.amount, 0);
  const cashAmount = expenses.filter(exp => !exp.paid_by_card).reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/balance')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Balance Dashboard
            </button>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="text-2xl mr-3">{vendorTypeIcon}</span>
              {vendorName}
              <span className="text-sm font-normal text-gray-500 ml-2">({vendorTypeLabel})</span>
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Time Range Controls */}
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              
              {/* Quick Preset Buttons */}
              <div className="flex space-x-1">
                {[
                  { value: 'week' as TimeFrame, label: 'Week' },
                  { value: 'month' as TimeFrame, label: 'Month' },
                  { value: 'quarter' as TimeFrame, label: '3M' },
                  { value: 'year' as TimeFrame, label: 'Year' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTimeFrameChange(option.value)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      selectedTimeFrame === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* More Options Dropdown */}
              <select
                value={selectedTimeFrame}
                onChange={(e) => handleTimeFrameChange(e.target.value as TimeFrame)}
                className="border border-gray-300 rounded-md px-3 py-1 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <optgroup label="Quick Options">
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="quarter">Last 3 Months</option>
                  <option value="year">Last Year</option>
                </optgroup>
                <optgroup label="Current Periods">
                  <option value="this_month">This Month</option>
                  <option value="this_year">This Year</option>
                </optgroup>
                <optgroup label="Extended Ranges">
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="last_90_days">Last 90 Days</option>
                </optgroup>
                <optgroup label="Custom">
                  <option value="custom">Custom Range</option>
                </optgroup>
              </select>
            </div>

            {/* Custom Date Range Picker */}
            {showCustomRange && (
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">From</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">To</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <TrendingDown className="w-6 h-6 text-red-600 mr-2" />
              <div>
                <h3 className="text-sm font-semibold text-red-900">Total Expenses</h3>
                <p className="text-xl font-bold text-red-600">{formatAmount(totalExpenses)}</p>
                <p className="text-xs text-red-700">{expenses.length} transactions</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="w-6 h-6 text-green-600 mr-2" />
              <div>
                <h3 className="text-sm font-semibold text-green-900">Total Incomes</h3>
                <p className="text-xl font-bold text-green-600">{formatAmount(totalIncomes)}</p>
                <p className="text-xs text-green-700">{incomes.length} transactions</p>
              </div>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${netAmount >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
            <div className="flex items-center">
              <Store className={`w-6 h-6 mr-2 ${netAmount >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              <div>
                <h3 className={`text-sm font-semibold ${netAmount >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>Net Amount</h3>
                <p className={`text-xl font-bold ${netAmount >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {formatAmount(Math.abs(netAmount))}
                </p>
                <p className={`text-xs ${netAmount >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  {netAmount >= 0 ? 'Net income' : 'Net expense'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-purple-600 rounded-md flex items-center justify-center mr-2">
                <span className="text-white text-xs font-bold">Ø</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-purple-900">Avg Transaction</h3>
                <p className="text-xl font-bold text-purple-600">{formatAmount(avgTransaction)}</p>
                <p className="text-xs text-purple-700">{expenses.length + incomes.length} total</p>
              </div>
            </div>
          </div>

          {expenses.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-gray-600 rounded-md flex items-center justify-center mr-2">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Payment Split</h3>
                  <div className="flex space-x-2">
                    <div className="text-center">
                      <p className="text-sm font-bold text-blue-600">{cardExpenses}</p>
                      <p className="text-xs text-gray-600">Card</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-green-600">{cashExpenses}</p>
                      <p className="text-xs text-gray-600">Cash</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Time Series Chart */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
            <p className="text-sm text-gray-500">{getTimeFrameLabel(selectedTimeFrame)}</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedViewType('daily')}
              className={`px-3 py-1 rounded-md text-sm ${selectedViewType === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Daily
            </button>
            <button
              onClick={() => setSelectedViewType('weekly')}
              className={`px-3 py-1 rounded-md text-sm ${selectedViewType === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setSelectedViewType('monthly')}
              className={`px-3 py-1 rounded-md text-sm ${selectedViewType === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Monthly
            </button>
          </div>
        </div>
        
        {timeSeriesData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => {
                  const date = new Date(value);
                  switch (selectedViewType) {
                    case 'daily':
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    case 'weekly':
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    case 'monthly':
                      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                    default:
                      return value;
                  }
                }}
              />
              <YAxis tickFormatter={(value) => `${formatAmount(value).replace('€', '€')}`} />
              <Tooltip 
                formatter={(value) => [formatAmount(value as number), 'Amount']}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  });
                }}
              />
              <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-12">No transaction data available for this period</p>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {recentTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transactions found for this period</p>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentTransactions.map((transaction) => (
                <button
                  key={`${transaction.type}-${transaction.id}`}
                  onClick={() => navigate(`/${transaction.type}s/${transaction.id}`)}
                  className="w-full px-6 py-4 hover:bg-gray-50 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${transaction.type === 'expense' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{transaction.comment}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{new Date(transaction.date).toLocaleDateString()}</span>
                          <span>{transaction.type === 'expense' ? 'Expense' : 'Income'}</span>
                          {transaction.paid_by_card !== undefined && (
                            <span className="flex items-center">
                              {transaction.paid_by_card ? <CreditCard className="w-3 h-3 mr-1" /> : <Banknote className="w-3 h-3 mr-1" />}
                              {transaction.paid_by_card ? 'Card' : 'Cash'}
                            </span>
                          )}
                          {transaction.added_by && (
                            <span>{transaction.added_by === 'he' ? '👨' : '👩'} {transaction.added_by}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                      {transaction.type === 'expense' ? '-' : '+'}{formatAmount(transaction.amount)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorStatistics;