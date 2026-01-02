import React from 'react';
import { Period, usePeriod } from '../contexts/PeriodContext';
import { ChevronDown } from 'lucide-react';

const PeriodSelector: React.FC = () => {
  const { period, setPeriod } = usePeriod();

  const periodOptions: { value: Period; label: string }[] = [
    { value: 'current_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'last_3_months', label: 'Last 3 Months' },
    { value: 'last_6_months', label: 'Last 6 Months' },
    { value: 'current_year', label: 'This Year' },
    { value: 'all_time', label: 'All Time' }
  ];

  const currentLabel = periodOptions.find(opt => opt.value === period)?.label || 'This Month';

  return (
    <div className="relative inline-block">
      <select
        value={period}
        onChange={(e) => setPeriod(e.target.value as Period)}
        className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
      >
        {periodOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
    </div>
  );
};

export default PeriodSelector;
