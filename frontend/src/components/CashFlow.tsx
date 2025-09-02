import React, { useState, useEffect } from 'react';
import { Calendar, TrendingDown, TrendingUp, PieChart, DollarSign, Wallet, CreditCard, Banknote } from 'lucide-react';
import { expenseAPI, incomeAPI, Expense, Income, formatAmount } from '../api/client';
import { getErrorMessage } from '../utils/errorHandler';

type TimeFrame = 'week' | 'current_month' | 'this_year' | 'overall';

interface VendorSummary {
  vendorName: string;
  vendorType: string;
  total: number;
  count: number;
}

interface CategorySummary {
  category: string;
  total: number;
  count: number;
  vendors: VendorSummary[];
}

const CashFlow: React.FC = () => {
  const [allTransactions, setAllTransactions] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('current_month');

  useEffect(() => {
    fetchExpenses();
  }, [selectedTimeFrame]);

  const getDateRangeParams = (timeFrame: TimeFrame): { startDate?: string; endDate?: string } => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (timeFrame) {
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
        return {
          startDate: startOfWeek.toISOString().split('T')[0],
          endDate: endOfWeek.toISOString().split('T')[0]
        };
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
      const { startDate, endDate } = getDateRangeParams(selectedTimeFrame);
      
      // Fetch all data in parallel
      const [allTransactionsResponse, incomesResponse, expensesResponse] = await Promise.all([
        expenseAPI.getExpenses(startDate, endDate),
        incomeAPI.getIncomes(startDate, endDate),
        expenseAPI.getActualExpenses(startDate, endDate)
      ]);
      
      setAllTransactions(allTransactionsResponse.data);
      setIncomes(incomesResponse.data);
      setExpenses(expensesResponse.data);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to fetch cash flow data'));
      console.error('Error fetching cash flow data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTimeFrameLabel = (timeFrame: TimeFrame): string => {
    switch (timeFrame) {
      case 'week': return 'This Week';
      case 'current_month': return 'This Month';
      case 'this_year': return 'This Year';
      case 'overall': return 'Overall';
      default: return 'This Month';
    }
  };

  // Calculate totals from actual data instead of backend summary
  const calculateTotals = () => {
    const totalEarnings = incomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const balance = totalEarnings - totalExpenses;
    
    // Payment method breakdown
    const cardExpenses = expenses.filter(expense => expense.paid_by_card);
    const cashExpenses = expenses.filter(expense => !expense.paid_by_card);
    const cardAmount = cardExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const cashAmount = cashExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Calculate savings rate (percentage of income saved)
    const savingsRate = totalEarnings > 0 ? Math.max(0, (balance / totalEarnings) * 100) : 0;
    
    return {
      totalEarnings,
      totalExpenses,
      balance,
      earningsCount: incomes.length,
      expensesCount: expenses.length,
      cardExpenses: {
        count: cardExpenses.length,
        amount: cardAmount,
        percentage: totalExpenses > 0 ? (cardAmount / totalExpenses) * 100 : 0
      },
      cashExpenses: {
        count: cashExpenses.length,
        amount: cashAmount,
        percentage: totalExpenses > 0 ? (cashAmount / totalExpenses) * 100 : 0
      },
      savingsRate
    };
  };


  const getCategorySummary = (): CategorySummary[] => {
    const categoryMap = new Map<string, CategorySummary>();

    expenses.forEach(expense => {
      const vendorType = expense.vendor?.type || 'unknown';
      const vendorName = expense.vendor?.name || 'Unknown Vendor';
      
      // Format category name for display
      const categoryName = vendorType.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');

      if (!categoryMap.has(vendorType)) {
        categoryMap.set(vendorType, {
          category: categoryName,
          total: 0,
          count: 0,
          vendors: []
        });
      }

      const category = categoryMap.get(vendorType)!;
      category.total += expense.amount;
      category.count += 1;

      // Find or create vendor summary
      let vendorSummary = category.vendors.find(v => v.vendorName === vendorName);
      if (!vendorSummary) {
        vendorSummary = {
          vendorName,
          vendorType,
          total: 0,
          count: 0
        };
        category.vendors.push(vendorSummary);
      }

      vendorSummary.total += expense.amount;
      vendorSummary.count += 1;
    });

    // Sort categories by total amount (descending)
    const categories = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
    
    // Sort vendors within each category by total amount (descending)
    categories.forEach(category => {
      category.vendors.sort((a, b) => b.total - a.total);
    });

    return categories;
  };

  const getTopVendors = (limit: number = 5): VendorSummary[] => {
    const vendorMap = new Map<string, VendorSummary>();

    expenses.forEach(expense => {
      const vendorName = expense.vendor?.name || 'Unknown Vendor';
      const vendorType = expense.vendor?.type || 'unknown';

      if (!vendorMap.has(vendorName)) {
        vendorMap.set(vendorName, {
          vendorName,
          vendorType,
          total: 0,
          count: 0
        });
      }

      const vendor = vendorMap.get(vendorName)!;
      vendor.total += expense.amount;
      vendor.count += 1;
    });

    return Array.from(vendorMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
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

  const categorySummary = getCategorySummary();
  const topVendors = getTopVendors();
  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header with Time Frame Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Cash Flow Analysis: Income vs Expenses</h2>
          
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <select
              value={selectedTimeFrame}
              onChange={(e) => setSelectedTimeFrame(e.target.value as TimeFrame)}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="week">This Week</option>
              <option value="current_month">This Month</option>
              <option value="this_year">This Year</option>
              <option value="overall">Overall</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="w-6 h-6 text-green-600 mr-2" />
              <div>
                <h3 className="text-sm font-semibold text-green-900">Total Earnings</h3>
                <p className="text-xl font-bold text-green-600">
                  {formatAmount(totals.totalEarnings)}
                </p>
                <p className="text-xs text-green-700">
                  {totals.earningsCount} entries
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <TrendingDown className="w-6 h-6 text-red-600 mr-2" />
              <div>
                <h3 className="text-sm font-semibold text-red-900">Total Expenses</h3>
                <p className="text-xl font-bold text-red-600">
                  {formatAmount(totals.totalExpenses)}
                </p>
                <p className="text-xs text-red-700">
                  {totals.expensesCount} entries
                </p>
              </div>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${totals.balance >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center">
              <Wallet className={`w-6 h-6 mr-2 ${totals.balance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <h3 className={`text-sm font-semibold ${totals.balance >= 0 ? 'text-green-900' : 'text-red-900'}`}>Net Cash Flow</h3>
                <p className={`text-xl font-bold ${totals.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatAmount(totals.balance)}
                </p>
                <p className={`text-xs ${totals.balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {totals.balance >= 0 ? 'Surplus' : 'Deficit'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Savings Rate Card */}
          {totals.savingsRate > 0 && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="w-6 h-6 text-yellow-600 mr-2" />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-900">Savings Rate</h3>
                  <p className="text-xl font-bold text-yellow-600">
                    {totals.savingsRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-yellow-700">of income saved</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <PieChart className="w-6 h-6 text-blue-600 mr-2" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900">Categories</h3>
                <p className="text-xl font-bold text-blue-600">{categorySummary.length}</p>
                <p className="text-xs text-blue-700">expense types</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="w-6 h-6 text-purple-600 mr-2" />
              <div>
                <h3 className="text-sm font-semibold text-purple-900">Avg Transaction</h3>
                <p className="text-xl font-bold text-purple-600">
                  {allTransactions.length > 0 
                    ? formatAmount(allTransactions.reduce((sum, t) => sum + t.amount, 0) / allTransactions.length) 
                    : formatAmount(0)
                  }
                </p>
                <p className="text-xs text-purple-700">{allTransactions.length} total</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method Analytics */}
      {expenses.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Method Analytics - {getTimeFrameLabel(selectedTimeFrame)}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Payments */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <CreditCard className="w-6 h-6 text-blue-600 mr-2" />
                  <h4 className="font-semibold text-blue-900">Card Payments</h4>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">
                    {formatAmount(totals.cardExpenses.amount)}
                  </p>
                  <p className="text-sm text-blue-700">
                    {totals.cardExpenses.percentage.toFixed(1)}% of expenses
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-700">Transactions:</span>
                <span className="font-medium text-blue-800">{totals.cardExpenses.count}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-blue-700">Average per transaction:</span>
                <span className="font-medium text-blue-800">
                  {totals.cardExpenses.count > 0 
                    ? formatAmount(totals.cardExpenses.amount / totals.cardExpenses.count)
                    : formatAmount(0)
                  }
                </span>
              </div>
            </div>

            {/* Cash Payments */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Banknote className="w-6 h-6 text-green-600 mr-2" />
                  <h4 className="font-semibold text-green-900">Cash Payments</h4>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">
                    {formatAmount(totals.cashExpenses.amount)}
                  </p>
                  <p className="text-sm text-green-700">
                    {totals.cashExpenses.percentage.toFixed(1)}% of expenses
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-700">Transactions:</span>
                <span className="font-medium text-green-800">{totals.cashExpenses.count}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-green-700">Average per transaction:</span>
                <span className="font-medium text-green-800">
                  {totals.cashExpenses.count > 0 
                    ? formatAmount(totals.cashExpenses.amount / totals.cashExpenses.count)
                    : formatAmount(0)
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Summary */}
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">Payment Preferences:</span>
              <div className="text-right">
                {totals.cardExpenses.amount >= totals.cashExpenses.amount ? (
                  <div className="flex items-center text-blue-600">
                    <CreditCard className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">Primarily Card User</span>
                  </div>
                ) : (
                  <div className="flex items-center text-green-600">
                    <Banknote className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">Primarily Cash User</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow Trends & Insights */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Cash Flow Insights - {getTimeFrameLabel(selectedTimeFrame)}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cash Flow Health */}
          <div className={`p-4 rounded-lg border-2 ${
            totals.balance > 0 
              ? 'bg-green-50 border-green-200' 
              : totals.balance === 0 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <h4 className={`font-semibold mb-2 ${
              totals.balance > 0 ? 'text-green-900' : totals.balance === 0 ? 'text-yellow-900' : 'text-red-900'
            }`}>
              Cash Flow Health
            </h4>
            <div className={`flex items-center ${
              totals.balance > 0 ? 'text-green-600' : totals.balance === 0 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {totals.balance > 0 ? (
                <TrendingUp className="w-5 h-5 mr-2" />
              ) : (
                <TrendingDown className="w-5 h-5 mr-2" />
              )}
              <span className="text-sm font-medium">
                {totals.balance > 0 
                  ? 'Positive - Building Wealth' 
                  : totals.balance === 0 
                  ? 'Balanced - Breaking Even' 
                  : 'Negative - Spending More Than Earning'
                }
              </span>
            </div>
          </div>

          {/* Expense-to-Income Ratio */}
          <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Expense Ratio</h4>
            <div className="flex items-center text-blue-600">
              <PieChart className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">
                {totals.totalEarnings > 0 
                  ? `${((totals.totalExpenses / totals.totalEarnings) * 100).toFixed(1)}% of income spent`
                  : 'No income data'
                }
              </span>
            </div>
            <p className="text-xs text-blue-700 mt-1">
              {totals.totalEarnings > 0 && (totals.totalExpenses / totals.totalEarnings) > 0.8 
                ? 'High spending ratio - consider budgeting'
                : totals.totalEarnings > 0 && (totals.totalExpenses / totals.totalEarnings) < 0.5
                ? 'Conservative spending - great saving potential'
                : 'Moderate spending pattern'
              }
            </p>
          </div>

          {/* Average Transaction Analysis */}
          <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-2">Spending Pattern</h4>
            <div className="flex items-center text-purple-600">
              <DollarSign className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">
                {expenses.length > 0 
                  ? `${formatAmount(totals.totalExpenses / expenses.length)} per transaction`
                  : 'No expense data'
                }
              </span>
            </div>
            <p className="text-xs text-purple-700 mt-1">
              {expenses.length > 0 && (totals.totalExpenses / expenses.length) > 100 
                ? 'High-value transactions - bulk purchases'
                : expenses.length > 0 && (totals.totalExpenses / expenses.length) < 25
                ? 'Small frequent purchases'
                : 'Mixed transaction sizes'
              }
            </p>
          </div>
        </div>

        {/* Financial Health Tips */}
        {totals.totalEarnings > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-gray-200 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Financial Health Tips</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                {totals.savingsRate > 20 ? (
                  <p className="text-green-700">✓ Excellent savings rate! Consider investment opportunities.</p>
                ) : totals.savingsRate > 10 ? (
                  <p className="text-yellow-700">⚠ Good savings rate. Aim for 20% for optimal financial health.</p>
                ) : totals.balance > 0 ? (
                  <p className="text-orange-700">⚠ Low savings rate. Try to reduce expenses or increase income.</p>
                ) : (
                  <p className="text-red-700">🚨 Negative cash flow. Review expenses and create a budget plan.</p>
                )}
              </div>
              <div>
                {totals.cardExpenses.percentage > 70 ? (
                  <p className="text-blue-700">💳 High card usage - great for tracking and rewards!</p>
                ) : totals.cashExpenses.percentage > 70 ? (
                  <p className="text-green-700">💵 High cash usage - harder to track but good budgeting control.</p>
                ) : (
                  <p className="text-gray-700">⚖ Balanced payment methods - good financial flexibility.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Earnings Breakdown */}
      {incomes.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Earnings Breakdown - {getTimeFrameLabel(selectedTimeFrame)}
          </h3>
          
          <div className="space-y-4">
            {(() => {
              // Aggregate incomes by vendor/source
              const incomesMap = new Map<string, { 
                vendorName: string; 
                total: number; 
                count: number;
                entries: typeof incomes;
              }>();
              
              incomes.forEach(income => {
                const vendorName = income.vendor?.name || income.source;
                if (!incomesMap.has(vendorName)) {
                  incomesMap.set(vendorName, {
                    vendorName,
                    total: 0,
                    count: 0,
                    entries: []
                  });
                }
                const vendor = incomesMap.get(vendorName)!;
                vendor.total += income.amount;
                vendor.count += 1;
                vendor.entries.push(income);
              });
              
              // Sort by total incomes (descending)
              const sortedIncomes = Array.from(incomesMap.values()).sort((a, b) => b.total - a.total);
              
              return sortedIncomes.map((vendor, index) => (
                <div key={vendor.vendorName} className="border rounded-lg p-4 bg-green-50 border-green-200">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full mr-3`} 
                           style={{backgroundColor: `hsl(${index * 137.5 % 360}, 50%, 40%)`}}></div>
                      <h4 className="font-semibold text-gray-900">{vendor.vendorName}</h4>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-green-600">{formatAmount(vendor.total)}</p>
                      <p className="text-sm text-green-700">{vendor.count} salary payments</p>
                    </div>
                  </div>
                  
                  {/* Individual income entries for this vendor */}
                  <div className="space-y-2">
                    {vendor.entries.map((income) => (
                      <div key={income.id} className="flex justify-between items-center py-1 px-3 bg-white bg-opacity-60 rounded">
                        <span className="text-sm text-gray-700">{new Date(income.date).toLocaleDateString()}</span>
                        <div className="text-right">
                          <span className="text-sm font-medium text-green-600">{formatAmount(income.amount)}</span>
                          {income.comment && <p className="text-xs text-gray-500">{income.comment}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
          
          <div className="mt-4 p-4 bg-green-100 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-green-900">Total Earnings:</span>
              <span className="text-xl font-bold text-green-600">
                {formatAmount(incomes.reduce((sum, income) => sum + income.amount, 0))}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2 text-sm">
              <span className="text-green-800">Average per payment:</span>
              <span className="font-medium text-green-700">
                {formatAmount(incomes.reduce((sum, income) => sum + income.amount, 0) / incomes.length)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Expenses by Category */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Expenses by Category - {getTimeFrameLabel(selectedTimeFrame)}
        </h3>
        
        <div className="space-y-4">
          {categorySummary.map((category, index) => (
            <div key={category.category} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full mr-3`} 
                       style={{backgroundColor: `hsl(${index * 137.5 % 360}, 70%, 50%)`}}></div>
                  <h4 className="font-semibold text-gray-900">{category.category}</h4>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatAmount(category.total)}</p>
                  <p className="text-sm text-gray-500">{category.count} transactions</p>
                </div>
              </div>
              
              {/* Vendors in this category */}
              <div className="space-y-2">
                {category.vendors.map((vendor, vendorIndex) => (
                  <div key={vendor.vendorName} className="flex justify-between items-center py-1 px-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{vendor.vendorName}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium">{formatAmount(vendor.total)}</span>
                      <span className="text-xs text-gray-500 ml-2">({vendor.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Expense Vendors */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top Expense Vendors - {getTimeFrameLabel(selectedTimeFrame)}
        </h3>
        <p className="text-sm text-gray-600 mb-4">Excluding salary entries, showing actual spending patterns</p>
        
        <div className="space-y-3">
          {topVendors.map((vendor, index) => (
            <div key={vendor.vendorName} className="flex justify-between items-center p-3 border rounded-lg">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full mr-3">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{vendor.vendorName}</p>
                  <p className="text-sm text-gray-500 capitalize">
                    {vendor.vendorType.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatAmount(vendor.total)}</p>
                <p className="text-sm text-gray-500">{vendor.count} transactions</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CashFlow;