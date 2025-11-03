import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, Share2 } from 'lucide-react';
import { expenseAPI, Expense, formatAmount } from '../api/client';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './Toast';
import SkeletonLoader from './SkeletonLoader';

const Statistics: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Initialize from URL params or default to 'this_month'
  const initialPeriod = (searchParams.get('period') as 'month' | 'quarter' | 'year' | 'current_year' | 'this_month') || 'this_month';
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year' | 'current_year' | 'this_month'>(initialPeriod);
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const pieChartRef = useRef<any>(null);
  const barChartRef = useRef<any>(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await expenseAPI.getExpenses();
      setExpenses(response.data);
    } catch (err) {
      setError('Failed to fetch expenses');
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };


  // Filter expenses by period
  const getFilteredExpenses = () => {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (selectedPeriod) {
      case 'month':
        // Start of previous month
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        // End of previous month
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'this_month':
        // Start of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        // End of current month
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'quarter':
        startDate = new Date();
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'current_year':
        // Start of current year
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        // End of current year
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
    }

    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      const afterStart = !startDate || expenseDate >= startDate;
      const beforeEnd = !endDate || expenseDate <= endDate;
      return afterStart && beforeEnd;
    });
  };

  // Group expenses by vendor type for pie chart
  const getExpensesByVendorType = () => {
    const filteredExpenses = getFilteredExpenses();
    const groupedData: { [key: string]: number } = {};

    filteredExpenses.forEach(expense => {
      if (expense.vendor) {
        const type = expense.vendor.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        groupedData[type] = (groupedData[type] || 0) + expense.amount;
      }
    });

    return Object.entries(groupedData).map(([name, value]) => ({
      name,
      value,
      originalName: name.toLowerCase().replace(' ', '_'), // Keep original format for navigation
      percentage: ((value / filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)) * 100).toFixed(1)
    }));
  };

  // Group expenses by month for bar chart - show 3 last months, current month, and next month
  const getMonthlyExpenses = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Create array of months to display (3 last months, current month, next month)
    const monthsToShow = [];
    for (let i = -3; i <= 1; i++) {
      const targetDate = new Date(currentYear, currentMonth + i, 1);
      const monthKey = targetDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      monthsToShow.push({
        key: monthKey,
        date: targetDate,
        year: targetDate.getFullYear(),
        month: targetDate.getMonth()
      });
    }

    // Get all expenses (not filtered by period for this specific chart)
    const monthlyData: { [key: string]: number } = {};

    // Initialize all months with 0
    monthsToShow.forEach(({ key }) => {
      monthlyData[key] = 0;
    });

    // Add actual expense data
    expenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      const expenseMonthKey = expenseDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      // Only include if it's one of our target months
      if (monthlyData.hasOwnProperty(expenseMonthKey)) {
        monthlyData[expenseMonthKey] += expense.amount;
      }
    });

    return monthsToShow.map(({ key }) => ({
      month: key,
      amount: monthlyData[key]
    }));
  };

  // Get top vendors
  const getTopVendors = () => {
    const filteredExpenses = getFilteredExpenses();
    const vendorData: { [key: string]: { name: string; amount: number; count: number } } = {};

    filteredExpenses.forEach(expense => {
      if (expense.vendor) {
        const vendorId = expense.vendor.id.toString();
        if (!vendorData[vendorId]) {
          vendorData[vendorId] = {
            name: expense.vendor.name,
            amount: 0,
            count: 0
          };
        }
        vendorData[vendorId].amount += expense.amount;
        vendorData[vendorId].count += 1;
      }
    });

    return Object.values(vendorData)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  };

  // Get vendor type statistics
  const getVendorTypeStatistics = () => {
    const filteredExpenses = getFilteredExpenses();
    const vendorTypeData: { [key: string]: { name: string; amount: number; count: number; vendors: Set<string> } } = {};

    filteredExpenses.forEach(expense => {
      if (expense.vendor) {
        const type = expense.vendor.type;
        const typeName = type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        if (!vendorTypeData[type]) {
          vendorTypeData[type] = {
            name: typeName,
            amount: 0,
            count: 0,
            vendors: new Set()
          };
        }
        
        vendorTypeData[type].amount += expense.amount;
        vendorTypeData[type].count += 1;
        vendorTypeData[type].vendors.add(expense.vendor.name);
      }
    });

    return Object.entries(vendorTypeData).map(([type, data]) => ({
      type,
      name: data.name,
      amount: data.amount,
      count: data.count,
      vendorCount: data.vendors.size,
      percentage: filteredExpenses.length > 0 ? (data.count / filteredExpenses.length * 100).toFixed(1) : '0'
    })).sort((a, b) => b.amount - a.amount);
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

  const pieColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  const pieData = getExpensesByVendorType();
  const monthlyData = getMonthlyExpenses();
  const topVendors = getTopVendors();
  const vendorTypeStats = getVendorTypeStatistics();
  const filteredExpenses = getFilteredExpenses();
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  // Payment method statistics
  const cardExpenses = filteredExpenses.filter(exp => exp.paid_by_card);
  const cashExpenses = filteredExpenses.filter(exp => !exp.paid_by_card);
  const cardAmount = cardExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const cashAmount = cashExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Handle pie chart click
  const handlePieClick = (data: any) => {
    if (data && data.originalName) {
      navigate(`/statistics/category/${data.originalName}`);
    }
  };

  // Handle pie chart hover
  const handlePieMouseEnter = (_: any, index: number) => {
    setActivePieIndex(index);
  };

  const handlePieMouseLeave = () => {
    setActivePieIndex(null);
  };

  // Handle bar chart interactions
  const handleBarClick = (data: any) => {
    if (data && data.month) {
      // Parse the month data to get year and month
      const monthData = data.month; // Format: "2024 Jan", "2024 Feb", etc.
      const [year, monthName] = monthData.split(' ');
      
      // Convert month name to number
      const monthMap = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const monthNum = monthMap[monthName as keyof typeof monthMap];
      
      if (monthNum !== undefined && year) {
        // Calculate start and end dates for the clicked month
        const startDate = new Date(parseInt(year), monthNum, 1);
        const endDate = new Date(parseInt(year), monthNum + 1, 0);
        
        // Format dates for URL parameters
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // Navigate to dashboard with month filter
        navigate(`/dashboard?month=${monthName}&year=${year}&start=${startDateStr}&end=${endDateStr}`);
      }
    }
  };


  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-blue-600">
            <span className="font-medium">Amount: </span>
            {formatAmount(payload[0].value)}
          </p>
          {payload[0].payload.count && (
            <p className="text-gray-600 text-sm">
              {payload[0].payload.count} transactions
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom pie tooltip
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-blue-600">
            <span className="font-medium">Amount: </span>
            {formatAmount(data.value)}
          </p>
          <p className="text-gray-600 text-sm">
            {data.percentage}% of total
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Click to view details
          </p>
        </div>
      );
    }
    return null;
  };

  // Enhanced chart export functionality
  const exportChartAsCSV = async (chartType: 'pie' | 'bar', filename: string) => {
    try {
      let csvContent = '';
      let data: any[] = [];
      
      if (chartType === 'pie') {
        csvContent = 'Category,Amount,Percentage,Period\n';
        data = pieData;
        data.forEach(item => {
          csvContent += `"${item.name}",${item.value},"${item.percentage}%","${selectedPeriod}"\n`;
        });
      } else if (chartType === 'bar') {
        csvContent = 'Month,Amount,Period\n';
        data = monthlyData;
        data.forEach(item => {
          csvContent += `"${item.month}",${item.amount},"${selectedPeriod}"\n`;
        });
      }
      
      // Add summary information
      csvContent += '\n';
      csvContent += `Summary\n`;
      csvContent += `Total Amount,${totalAmount}\n`;
      csvContent += `Number of Transactions,${filteredExpenses.length}\n`;
      csvContent += `Export Date,"${new Date().toISOString().split('T')[0]}"\n`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expenso-${filename}-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Show success feedback
      const exportButton = document.activeElement as HTMLElement;
      if (exportButton) {
        const originalContent = exportButton.innerHTML;
        exportButton.innerHTML = '✓ Exported!';
        exportButton.style.backgroundColor = '#10B981';
        setTimeout(() => {
          exportButton.innerHTML = originalContent;
          exportButton.style.backgroundColor = '';
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to export chart:', error);
      showError('Failed to export chart data. Please try again.');
    }
  };

  const shareChart = async (chartData: any[], chartType: string) => {
    // Generate summary text based on chart data
    let summaryText = '';
    if (chartType.includes('Category')) {
      const topCategory = pieData.length > 0 ? pieData[0] : null;
      summaryText = topCategory 
        ? `My top expense category is ${topCategory.name} (${topCategory.percentage}% of expenses)`
        : 'Expense breakdown by category';
    } else if (chartType.includes('Monthly')) {
      const totalExpenses = monthlyData.reduce((sum, item) => sum + item.amount, 0);
      const avgMonthly = monthlyData.length > 0 ? totalExpenses / monthlyData.length : 0;
      summaryText = `Average monthly expenses: ${formatAmount(avgMonthly)}`;
    }
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Expenso - ${chartType}`,
          text: `${summaryText}\n\nTotal spent (${selectedPeriod}): ${formatAmount(totalAmount)}\nTransactions: ${filteredExpenses.length}`,
          url: window.location.href
        });
        
        // Show success feedback
        const shareButton = document.activeElement as HTMLElement;
        if (shareButton) {
          const originalContent = shareButton.innerHTML;
          shareButton.innerHTML = '✓ Shared!';
          shareButton.style.backgroundColor = '#3B82F6';
          setTimeout(() => {
            shareButton.innerHTML = originalContent;
            shareButton.style.backgroundColor = '';
          }, 2000);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      // Fallback: copy comprehensive data to clipboard
      const text = `Expenso - ${chartType}\n\n${summaryText}\n\nTotal spent (${selectedPeriod}): ${formatAmount(totalAmount)}\nTransactions: ${filteredExpenses.length}\n\n${window.location.href}`;
      
      try {
        await navigator.clipboard.writeText(text);
        showSuccess('Expense summary copied to clipboard!');
      } catch (error: any) {
        // Even older fallback
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showSuccess('Expense summary copied to clipboard!');
      }
    }
  };

  // Handle vendor type click
  const handleVendorTypeClick = (vendorType: string) => {
    navigate(`/statistics/vendor-type/${vendorType}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center">
          <div className="animate-pulse bg-gray-200 rounded h-8 w-40"></div>
          <div className="animate-pulse bg-gray-200 rounded h-10 w-32"></div>
        </div>
        
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonLoader type="chart" />
          <SkeletonLoader type="chart" />
        </div>
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
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Expense Statistics</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setSelectedPeriod('current_year');
                setSearchParams({ period: 'current_year' });
              }}
              className={`px-3 py-1 rounded-md text-sm ${selectedPeriod === 'current_year' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Current Year
            </button>
            <button
              onClick={() => {
                setSelectedPeriod('this_month');
                setSearchParams({ period: 'this_month' });
              }}
              className={`px-3 py-1 rounded-md text-sm ${selectedPeriod === 'this_month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              This Month
            </button>
            <button
              onClick={() => {
                setSelectedPeriod('month');
                setSearchParams({ period: 'month' });
              }}
              className={`px-3 py-1 rounded-md text-sm ${selectedPeriod === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Previous Month
            </button>
            <button
              onClick={() => {
                setSelectedPeriod('quarter');
                setSearchParams({ period: 'quarter' });
              }}
              className={`px-3 py-1 rounded-md text-sm ${selectedPeriod === 'quarter' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Last 3 Months
            </button>
            <button
              onClick={() => {
                setSelectedPeriod('year');
                setSearchParams({ period: 'year' });
              }}
              className={`px-3 py-1 rounded-md text-sm ${selectedPeriod === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Last Year
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900">Total Spent</h3>
            <p className="text-2xl font-bold text-blue-600">{formatAmount(totalAmount)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900">Total Expenses</h3>
            <p className="text-2xl font-bold text-green-600">{filteredExpenses.length}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900">💳 Card vs 💵 Cash</h3>
            <div className="space-y-1">
              <p className="text-sm text-blue-600">
                Card: {cardExpenses.length} ({totalAmount > 0 ? ((cardAmount/totalAmount)*100).toFixed(1) : 0}%)
              </p>
              <p className="text-sm text-green-600">
                Cash: {cashExpenses.length} ({totalAmount > 0 ? ((cashAmount/totalAmount)*100).toFixed(1) : 0}%)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Expenses by Category */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Expenses by Category
              <span className="text-sm text-gray-500 ml-2">(Click to drill down)</span>
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => shareChart(pieData, 'Category Breakdown')}
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors p-2 rounded-md hover:bg-blue-50"
                title="Share chart"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => exportChartAsCSV('pie', 'category-breakdown')}
                className="flex items-center space-x-1 text-gray-500 hover:text-green-600 transition-colors p-2 rounded-md hover:bg-green-50"
                title="Export as CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart ref={pieChartRef}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={activePieIndex !== null ? 85 : 80}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={handlePieClick}
                  onMouseEnter={handlePieMouseEnter}
                  onMouseLeave={handlePieMouseLeave}
                  style={{ cursor: 'pointer' }}
                  animationBegin={0}
                  animationDuration={800}
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={pieColors[index % pieColors.length]}
                      stroke={activePieIndex === index ? '#fff' : 'none'}
                      strokeWidth={activePieIndex === index ? 3 : 0}
                      style={{ 
                        cursor: 'pointer',
                        filter: activePieIndex !== null && activePieIndex !== index ? 'brightness(0.7)' : 'brightness(1)',
                        transition: 'all 0.2s ease-in-out'
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value, entry: any) => (
                    <span 
                      style={{ 
                        color: entry.color,
                        cursor: 'pointer',
                        fontWeight: activePieIndex === pieData.findIndex(item => item.name === value) ? 'bold' : 'normal'
                      }}
                      onClick={() => handlePieClick(pieData.find(item => item.name === value))}
                    >
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available for this period</p>
          )}
          
          {/* Category Legend with Click Indicators */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {pieData.map((entry, index) => (
              <button
                key={entry.name}
                onClick={() => handlePieClick(entry)}
                className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer border border-gray-200"
              >
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  ></div>
                  <span className="text-sm font-medium text-gray-700">{entry.name}</span>
                </div>
                <span className="text-sm text-gray-500">{entry.percentage}%</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bar Chart - Monthly Expenses */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Monthly Expenses Trend
              <span className="text-sm text-gray-500 ml-2">(Last 3 months, current, next month - Click to filter dashboard by month)</span>
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => shareChart(monthlyData, 'Monthly Trend')}
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors p-2 rounded-md hover:bg-blue-50"
                title="Share chart"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => exportChartAsCSV('bar', 'monthly-trend')}
                className="flex items-center space-x-1 text-gray-500 hover:text-green-600 transition-colors p-2 rounded-md hover:bg-green-50"
                title="Export as CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                ref={barChartRef}
                data={monthlyData}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#e0e0e0' }}
                />
                <YAxis 
                  tickFormatter={(value) => `${formatAmount(value).replace(/[€$]/, '')}${formatAmount(1).match(/[€$]/)?.[0] || '$'}`}
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#e0e0e0' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="amount"
                  onClick={handleBarClick}
                  style={{ cursor: 'pointer' }}
                  animationDuration={600}
                >
                  {monthlyData.map((entry, index) => {
                    const now = new Date();
                    const currentMonthKey = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                    const entryDate = new Date(entry.month + ' 1, 2000'); // Parse month name to date
                    const currentDate = new Date(currentMonthKey + ' 1, 2000');

                    let fillColor = '#3B82F6'; // Default blue for past months
                    if (entry.month === currentMonthKey) {
                      fillColor = '#10B981'; // Green for current month
                    } else if (entryDate > currentDate) {
                      fillColor = '#F59E0B'; // Orange for future months
                    }

                    return <Cell key={`cell-${index}`} fill={fillColor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available for this period</p>
          )}

          {/* Color Legend */}
          <div className="mt-4 flex justify-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
              <span className="text-gray-600">Past months</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span className="text-gray-600">Current month</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
              <span className="text-gray-600">Future month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Type Statistics */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Expenses by Vendor Type
            <span className="text-sm text-gray-500 ml-2">(Click to drill down)</span>
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendorTypeStats.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-8">
                No vendor type data available for this period
              </div>
            ) : (
              vendorTypeStats.map((vendorType, index) => (
                <button
                  key={vendorType.type}
                  onClick={() => handleVendorTypeClick(vendorType.type)}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getVendorTypeIcon(vendorType.type)}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{vendorType.name}</p>
                      <p className="text-sm text-gray-500">
                        {vendorType.count} transactions • {vendorType.vendorCount} vendors
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">{formatAmount(vendorType.amount)}</p>
                    <p className="text-sm text-gray-500">{vendorType.percentage}% of transactions</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top Vendors Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Top Vendors</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Number of Expenses
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topVendors.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    No vendor data available for this period
                  </td>
                </tr>
              ) : (
                topVendors.map((vendor, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {vendor.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatAmount(vendor.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vendor.count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

export default Statistics;