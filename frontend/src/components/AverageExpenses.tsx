import React, { useState, useEffect } from 'react';
import { expenseAPI, formatAmount } from '../api/client';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import SkeletonLoader from './SkeletonLoader';
import ErrorMessage from './ErrorMessage';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface CategoryAverage {
  category: string;
  total: number;
  average_per_month: number;
}

interface VendorTypeAverage {
  vendor_type: string;
  total: number;
  average_per_month: number;
}

interface AverageData {
  category_averages: CategoryAverage[];
  vendor_type_averages: VendorTypeAverage[];
  total_months: number;
  date_range: {
    start: string;
    end: string;
  };
}

const AverageExpenses: React.FC = () => {
  const [averageData, setAverageData] = useState<AverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'3months' | '6months' | '1year' | 'all'>('1year');

  const getDateRange = (range: typeof timeRange) => {
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
      case '3months':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
        return { startDate: undefined, endDate: undefined };
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const fetchAverages = async () => {
    try {
      setLoading(true);
      setError(null);

      const { startDate, endDate } = getDateRange(timeRange);
      const response = await expenseAPI.getAverageExpenses(startDate, endDate);

      setAverageData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch average expenses');
      console.error('Error fetching averages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAverages();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader type="stats" />
        <SkeletonLoader type="chart" />
        <SkeletonLoader type="chart" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage error={error} onRetry={fetchAverages} />;
  }

  if (!averageData) {
    return <ErrorMessage error="No data available" />;
  }

  // Sort by average per month (highest first)
  const sortedCategories = [...averageData.category_averages].sort(
    (a, b) => b.average_per_month - a.average_per_month
  );

  const sortedVendorTypes = [...averageData.vendor_type_averages].sort(
    (a, b) => b.average_per_month - a.average_per_month
  );

  // Chart data for categories
  const categoryChartData = {
    labels: sortedCategories.map((item) => item.category),
    datasets: [
      {
        label: 'Average per Month',
        data: sortedCategories.map((item) => item.average_per_month),
        backgroundColor: 'rgba(147, 51, 234, 0.7)',
        borderColor: 'rgba(147, 51, 234, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Chart data for vendor types
  const vendorTypeChartData = {
    labels: sortedVendorTypes.map((item) => {
      // Format vendor type display name
      return item.vendor_type
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }),
    datasets: [
      {
        label: 'Average per Month',
        data: sortedVendorTypes.map((item) => item.average_per_month),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return formatAmount(context.parsed.y);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return formatAmount(value);
          },
        },
      },
    },
  };

  const getVendorTypeIcon = (type: string): string => {
    const typeMap: { [key: string]: string } = {
      food_store: '🛒',
      shop: '🏪',
      eating_out: '🍽️',
      else: '📦',
      subscriptions: '📱',
      household: '🏠',
      transport: '🚗',
      tourism: '✈️',
      car: '🚙',
      clothing: '👕',
      living: '🏡',
      care: '💊',
      salary: '💰',
    };
    return typeMap[type] || '📦';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Average Expenses
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Monthly averages over {averageData.total_months} months
            {averageData.date_range.start && (
              <span>
                {' '}
                ({averageData.date_range.start} to {averageData.date_range.end})
              </span>
            )}
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('3months')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === '3months'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            3 Months
          </button>
          <button
            onClick={() => setTimeRange('6months')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === '6months'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            6 Months
          </button>
          <button
            onClick={() => setTimeRange('1year')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === '1year'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            1 Year
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Category Averages */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-colors">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Average by Category
        </h2>

        {/* Chart */}
        <div style={{ height: '300px' }} className="mb-6">
          <Bar data={categoryChartData} options={chartOptions} />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-4 text-gray-700 dark:text-gray-300">Category</th>
                <th className="text-right py-2 px-4 text-gray-700 dark:text-gray-300">
                  Total ({averageData.total_months}m)
                </th>
                <th className="text-right py-2 px-4 text-gray-700 dark:text-gray-300">
                  Avg/Month
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedCategories.map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{item.category}</td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                    {formatAmount(item.total)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-purple-600 dark:text-purple-400">
                    {formatAmount(item.average_per_month)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor Type Averages */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-colors">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Average by Vendor Type
        </h2>

        {/* Chart */}
        <div style={{ height: '300px' }} className="mb-6">
          <Bar data={vendorTypeChartData} options={chartOptions} />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-4 text-gray-700 dark:text-gray-300">
                  Vendor Type
                </th>
                <th className="text-right py-2 px-4 text-gray-700 dark:text-gray-300">
                  Total ({averageData.total_months}m)
                </th>
                <th className="text-right py-2 px-4 text-gray-700 dark:text-gray-300">
                  Avg/Month
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedVendorTypes.map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="py-3 px-4 text-gray-900 dark:text-gray-100">
                    <span className="mr-2">{getVendorTypeIcon(item.vendor_type)}</span>
                    {item.vendor_type
                      .split('_')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                    {formatAmount(item.total)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-blue-600 dark:text-blue-400">
                    {formatAmount(item.average_per_month)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AverageExpenses;
