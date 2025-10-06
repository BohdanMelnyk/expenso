import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { Download, Share2, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { expenseAPI, incomeAPI, Expense, Income, formatAmount } from '../api/client';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from './Toast';
import SkeletonLoader from './SkeletonLoader';

const Trends: React.FC = () => {
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expensesResponse, incomesResponse] = await Promise.all([
        expenseAPI.getExpenses(),
        incomeAPI.getIncomes()
      ]);
      setExpenses(expensesResponse.data);
      setIncomes(incomesResponse.data);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter expenses for current year only
  const getCurrentYearExpenses = () => {
    const currentYear = new Date().getFullYear();
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getFullYear() === currentYear;
    });
  };

  // Filter incomes for current year only
  const getCurrentYearIncomes = () => {
    const currentYear = new Date().getFullYear();
    return incomes.filter(income => {
      const incomeDate = new Date(income.date);
      return incomeDate.getFullYear() === currentYear;
    });
  };

  // Monthly spending trend for current year
  const getMonthlyTrend = () => {
    const currentYear = new Date().getFullYear();
    const monthlyData: { [key: string]: number } = {};

    // Initialize all months with 0
    for (let month = 0; month < 12; month++) {
      const monthKey = new Date(currentYear, month).toLocaleDateString('en-US', { month: 'short' });
      monthlyData[monthKey] = 0;
    }

    // Add actual expense data
    getCurrentYearExpenses().forEach(expense => {
      const expenseDate = new Date(expense.date);
      const monthKey = expenseDate.toLocaleDateString('en-US', { month: 'short' });
      monthlyData[monthKey] += expense.amount;
    });

    return Object.entries(monthlyData).map(([month, amount]) => ({
      month,
      amount,
      cumulative: 0 // Will be calculated below
    }));
  };

  // Weekly spending trend for current month
  const getWeeklyTrend = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const weeklyData: { [key: string]: number } = {};

    // Get all weeks in current month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    // Initialize weeks
    for (let day = 1; day <= lastDay.getDate(); day += 7) {
      const weekStart = new Date(currentYear, currentMonth, day);
      const weekEnd = new Date(currentYear, currentMonth, Math.min(day + 6, lastDay.getDate()));
      const weekKey = `Week ${Math.ceil(day / 7)}`;
      weeklyData[weekKey] = 0;
    }

    // Add expense data
    getCurrentYearExpenses().forEach(expense => {
      const expenseDate = new Date(expense.date);
      if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
        const weekNumber = Math.ceil(expenseDate.getDate() / 7);
        const weekKey = `Week ${weekNumber}`;
        if (weeklyData[weekKey] !== undefined) {
          weeklyData[weekKey] += expense.amount;
        }
      }
    });

    return Object.entries(weeklyData).map(([week, amount]) => ({
      week,
      amount
    }));
  };

  // Category spending over time
  const getCategoryTrend = () => {
    const currentYearExpenses = getCurrentYearExpenses();
    const categoryMonthly: { [key: string]: { [key: string]: number } } = {};

    currentYearExpenses.forEach(expense => {
      if (expense.vendor) {
        const category = expense.vendor.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        const month = new Date(expense.date).toLocaleDateString('en-US', { month: 'short' });

        if (!categoryMonthly[category]) {
          categoryMonthly[category] = {};
        }
        if (!categoryMonthly[category][month]) {
          categoryMonthly[category][month] = 0;
        }
        categoryMonthly[category][month] += expense.amount;
      }
    });

    // Get all months for current year
    const currentYear = new Date().getFullYear();
    const months = [];
    for (let month = 0; month < 12; month++) {
      months.push(new Date(currentYear, month).toLocaleDateString('en-US', { month: 'short' }));
    }

    // Transform data for chart
    const chartData = months.map(month => {
      const monthData: any = { month };
      Object.keys(categoryMonthly).forEach(category => {
        monthData[category] = categoryMonthly[category][month] || 0;
      });
      return monthData;
    });

    return {
      data: chartData,
      categories: Object.keys(categoryMonthly)
    };
  };

  // Monthly income vs expenses comparison
  const getIncomeVsExpensesTrend = () => {
    const currentYear = new Date().getFullYear();
    const monthlyData: { [key: string]: { income: number; expenses: number } } = {};

    // Initialize all months with 0
    for (let month = 0; month < 12; month++) {
      const monthKey = new Date(currentYear, month).toLocaleDateString('en-US', { month: 'short' });
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }

    // Add expense data
    getCurrentYearExpenses().forEach(expense => {
      const monthKey = new Date(expense.date).toLocaleDateString('en-US', { month: 'short' });
      monthlyData[monthKey].expenses += expense.amount;
    });

    // Add income data
    getCurrentYearIncomes().forEach(income => {
      const monthKey = new Date(income.date).toLocaleDateString('en-US', { month: 'short' });
      monthlyData[monthKey].income += income.amount;
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      netIncome: data.income - data.expenses
    }));
  };

  // Cumulative income vs expenses
  const getCumulativeIncomeVsExpenses = () => {
    const currentYear = new Date().getFullYear();
    const monthlyData: { [key: string]: { income: number; expenses: number } } = {};

    // Initialize all months with 0
    for (let month = 0; month < 12; month++) {
      const monthKey = new Date(currentYear, month).toLocaleDateString('en-US', { month: 'short' });
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }

    // Add expense data
    getCurrentYearExpenses().forEach(expense => {
      const monthKey = new Date(expense.date).toLocaleDateString('en-US', { month: 'short' });
      monthlyData[monthKey].expenses += expense.amount;
    });

    // Add income data
    getCurrentYearIncomes().forEach(income => {
      const monthKey = new Date(income.date).toLocaleDateString('en-US', { month: 'short' });
      monthlyData[monthKey].income += income.amount;
    });

    // Calculate cumulative values
    let cumulativeIncome = 0;
    let cumulativeExpenses = 0;

    return Object.entries(monthlyData).map(([month, data]) => {
      cumulativeIncome += data.income;
      cumulativeExpenses += data.expenses;
      return {
        month,
        cumulativeIncome,
        cumulativeExpenses,
        cumulativeBalance: cumulativeIncome - cumulativeExpenses
      };
    });
  };

  // Net income by month (income - expenses)
  const getNetIncomeTrend = () => {
    const incomeVsExpenses = getIncomeVsExpensesTrend();
    return incomeVsExpenses.map(item => ({
      month: item.month,
      netIncome: item.netIncome,
      isPositive: item.netIncome > 0
    }));
  };

  // Income breakdown by source
  const getIncomeBySource = () => {
    const currentYearIncomes = getCurrentYearIncomes();
    const sourceData: { [key: string]: number } = {};

    currentYearIncomes.forEach(income => {
      sourceData[income.source] = (sourceData[income.source] || 0) + income.amount;
    });

    return Object.entries(sourceData).map(([source, amount]) => ({
      source,
      amount,
      percentage: currentYearIncomes.length > 0 ?
        ((amount / currentYearIncomes.reduce((sum, inc) => sum + inc.amount, 0)) * 100).toFixed(1) : '0'
    })).sort((a, b) => b.amount - a.amount);
  };

  const monthlyTrend = getMonthlyTrend();
  const categoryTrend = getCategoryTrend();
  const incomeVsExpensesTrend = getIncomeVsExpensesTrend();
  const cumulativeIncomeVsExpenses = getCumulativeIncomeVsExpenses();
  const netIncomeTrend = getNetIncomeTrend();
  const currentYearExpenses = getCurrentYearExpenses();
  const currentYearIncomes = getCurrentYearIncomes();
  const totalExpenses = currentYearExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalIncomes = currentYearIncomes.reduce((sum, inc) => sum + inc.amount, 0);
  const netBalance = totalIncomes - totalExpenses;

  // Calculate cumulative spending
  let cumulative = 0;
  const monthlyWithCumulative = monthlyTrend.map(item => {
    cumulative += item.amount;
    return { ...item, cumulative };
  });

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

  const exportData = (data: any[], filename: string) => {
    const csvContent = "data:text/csv;charset=utf-8," +
      Object.keys(data[0]).join(",") + "\n" +
      data.map(row => Object.values(row).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="animate-pulse bg-gray-200 rounded h-8 w-40"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonLoader type="chart" />
          <SkeletonLoader type="chart" />
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
          <h2 className="text-2xl font-bold text-gray-900">Expense Trends {new Date().getFullYear()}</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Current Year Overview
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-red-900">Total Expenses</h3>
            <p className="text-2xl font-bold text-red-600">{formatAmount(totalExpenses)}</p>
            <p className="text-sm text-red-700">{currentYearExpenses.length} transactions</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900">Total Income</h3>
            <p className="text-2xl font-bold text-green-600">{formatAmount(totalIncomes)}</p>
            <p className="text-sm text-green-700">{currentYearIncomes.length} transactions</p>
          </div>
          <div className={`p-4 rounded-lg ${netBalance >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
            <h3 className={`text-lg font-semibold ${netBalance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>Net Balance</h3>
            <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {formatAmount(netBalance)}
            </p>
            <p className={`text-sm ${netBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              {netBalance >= 0 ? 'Positive' : 'Negative'}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900">Savings Rate</h3>
            <p className="text-2xl font-bold text-purple-600">
              {totalIncomes > 0 ? ((netBalance / totalIncomes) * 100).toFixed(1) : '0'}%
            </p>
            <p className="text-sm text-purple-700">
              {netBalance >= 0 ? 'Saving money' : 'Spending more'}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Spending & Cumulative - Full Width */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Spending & Cumulative</h3>
          <button
            onClick={() => exportData(monthlyWithCumulative, 'monthly-trend')}
            className="text-gray-500 hover:text-green-600 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={monthlyWithCumulative}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value, name) => [formatAmount(Number(value)), name]} />
            <Area type="monotone" dataKey="amount" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
            <Area type="monotone" dataKey="cumulative" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
            <Legend />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative Income vs Expenses - Full Width */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Cumulative Income vs Expenses</h3>
          <button
            onClick={() => exportData(cumulativeIncomeVsExpenses, 'cumulative-comparison')}
            className="text-gray-500 hover:text-green-600 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={cumulativeIncomeVsExpenses}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value, name) => {
              if (name === 'cumulativeIncome') return [formatAmount(Number(value)), 'Cumulative Income'];
              if (name === 'cumulativeExpenses') return [formatAmount(Number(value)), 'Cumulative Expenses'];
              return [formatAmount(Number(value)), 'Cumulative Balance'];
            }} />
            <Line
              type="monotone"
              dataKey="cumulativeIncome"
              stroke="#10B981"
              strokeWidth={3}
              name="Cumulative Income"
            />
            <Line
              type="monotone"
              dataKey="cumulativeExpenses"
              stroke="#EF4444"
              strokeWidth={3}
              name="Cumulative Expenses"
            />
            <Line
              type="monotone"
              dataKey="cumulativeBalance"
              stroke="#3B82F6"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Balance"
            />
            <Legend />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Grid for remaining charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Net Income Trend */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Net Income Trend</h3>
            <button
              onClick={() => exportData(netIncomeTrend, 'net-income-trend')}
              className="text-gray-500 hover:text-green-600 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={netIncomeTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value) => [formatAmount(Number(value)), 'Net Income']}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey="netIncome">
                {netIncomeTrend.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isPositive ? '#10B981' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Income vs Expenses Comparison */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Income vs Expenses</h3>
            <button
              onClick={() => exportData(incomeVsExpensesTrend, 'income-vs-expenses')}
              className="text-gray-500 hover:text-green-600 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={incomeVsExpensesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value, name) => [formatAmount(Number(value)), name === 'income' ? 'Income' : 'Expenses']} />
              <Bar dataKey="income" fill="#10B981" name="Income" />
              <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Category Trends Row */}
      <div className="grid grid-cols-1 gap-6">



        {/* Category Trends */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Category Spending Trends</h3>
            <button
              onClick={() => exportData(categoryTrend.data, 'category-trends')}
              className="text-gray-500 hover:text-green-600 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={categoryTrend.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value, name) => [formatAmount(Number(value)), name]} />
              {categoryTrend.categories.slice(0, 5).map((category, index) => (
                <Line
                  key={category}
                  type="monotone"
                  dataKey={category}
                  stroke={colors[index]}
                  strokeWidth={2}
                  dot={{ fill: colors[index], strokeWidth: 2, r: 4 }}
                />
              ))}
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
};

// Extend Date prototype to get day of year
declare global {
  interface Date {
    getDayOfYear(): number;
  }
}

Date.prototype.getDayOfYear = function() {
  const start = new Date(this.getFullYear(), 0, 0);
  const diff = Number(this) - Number(start);
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

export default Trends;