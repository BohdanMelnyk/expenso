import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowLeft, Calendar, TrendingDown, DollarSign, Store } from 'lucide-react';
import { expenseAPI, Expense, formatAmount } from '../api/client';
import { getErrorMessage } from '../utils/errorHandler';

type TimeFrame = 'week' | 'month' | 'quarter' | 'year' | 'this_month' | 'last_30_days' | 'last_90_days' | 'this_year' | 'custom';
type ViewType = 'daily' | 'weekly' | 'monthly';

interface DayData {
  date: string;
  amount: number;
  count: number;
}

interface VendorData {
  name: string;
  amount: number;
  count: number;
  percentage: number;
}

const VendorTypeStatistics: React.FC = () => {
  const { vendorType } = useParams<{ vendorType: string }>();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('month');
  const [selectedViewType, setSelectedViewType] = useState<ViewType>('daily');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomRange, setShowCustomRange] = useState<boolean>(false);

  useEffect(() => {
    if (vendorType) {
      fetchExpenses();
    }
  }, [vendorType, selectedTimeFrame, customStartDate, customEndDate]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { startDate, endDate } = getDateRangeParams(selectedTimeFrame);
      const response = await expenseAPI.getExpenses(startDate, endDate);
      
      // Filter expenses by vendor type
      const filteredExpenses = response.data.filter(expense => 
        expense.vendor?.type === vendorType
      );
      
      setExpenses(filteredExpenses);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to fetch vendor type expenses'));
      console.error('Error fetching vendor type expenses:', err);
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

  const getTimeSeriesData = (): DayData[] => {
    const dataMap = new Map<string, { amount: number; count: number }>();
    
    expenses.forEach(expense => {
      let key: string;
      const date = new Date(expense.date);
      
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
      data.amount += expense.amount;
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

  const getVendorData = (): VendorData[] => {
    const vendorMap = new Map<string, { amount: number; count: number }>();
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    expenses.forEach(expense => {
      const vendorName = expense.vendor?.name || 'Unknown';
      if (!vendorMap.has(vendorName)) {
        vendorMap.set(vendorName, { amount: 0, count: 0 });
      }
      const vendor = vendorMap.get(vendorName)!;
      vendor.amount += expense.amount;
      vendor.count += 1;
    });

    return Array.from(vendorMap.entries())
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const formatVendorTypeName = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
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
  const vendorData = getVendorData();
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgExpense = expenses.length > 0 ? totalAmount / expenses.length : 0;
  const vendorTypeName = vendorType ? formatVendorTypeName(vendorType) : 'Unknown Vendor Type';
  const vendorTypeIcon = vendorType ? getVendorTypeIcon(vendorType) : '📦';

  const pieColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/statistics')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Statistics
            </button>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="text-2xl mr-3">{vendorTypeIcon}</span>
              {vendorTypeName} Statistics
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="w-6 h-6 text-blue-600 mr-2" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900">Total Spent</h3>
                <p className="text-xl font-bold text-blue-600">{formatAmount(totalAmount)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <TrendingDown className="w-6 h-6 text-green-600 mr-2" />
              <div>
                <h3 className="text-sm font-semibold text-green-900">Total Transactions</h3>
                <p className="text-xl font-bold text-green-600">{expenses.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-purple-600 rounded-md flex items-center justify-center mr-2">
                <span className="text-white text-xs font-bold">Ø</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-purple-900">Average Expense</h3>
                <p className="text-xl font-bold text-purple-600">{formatAmount(avgExpense)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Store className="w-6 h-6 text-orange-600 mr-2" />
              <div>
                <h3 className="text-sm font-semibold text-orange-900">Unique Vendors</h3>
                <p className="text-xl font-bold text-orange-600">{vendorData.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Time Series Chart */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Spending Over Time</h3>
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
          <p className="text-gray-500 text-center py-12">No data available for this period</p>
        )}
      </div>

      {/* Vendor Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Vendor</h3>
          {vendorData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={vendorData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {vendorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatAmount(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No vendor data available</p>
          )}
        </div>

        {/* Vendor List */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Breakdown</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {vendorData.map((vendor, index) => (
              <div key={vendor.name} className="flex justify-between items-center p-3 border rounded-lg">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3"
                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  ></div>
                  <div>
                    <p className="font-medium text-gray-900">{vendor.name}</p>
                    <p className="text-sm text-gray-500">{vendor.count} transactions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatAmount(vendor.amount)}</p>
                  <p className="text-sm text-gray-500">{vendor.percentage.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorTypeStatistics;