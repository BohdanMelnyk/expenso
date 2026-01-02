import { useMemo } from 'react';
import { Period } from '../contexts/PeriodContext';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export const usePeriodDateRange = (period: Period): DateRange => {
  return useMemo(() => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
      case 'current_month': {
        // Start: first day of current month at 00:00:00
        // End: today at 23:59:59
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
      case 'last_month': {
        // Start: first day of last month at 00:00:00
        // End: last day of last month at 23:59:59
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate.setFullYear(endOfLastMonth.getFullYear());
        endDate.setMonth(endOfLastMonth.getMonth());
        endDate.setDate(endOfLastMonth.getDate());
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'last_3_months': {
        // Start: first day of the month 3 months ago
        // End: today
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        startDate.setDate(1);
        break;
      }
      case 'last_6_months': {
        // Start: first day of the month 6 months ago
        // End: today
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 6);
        startDate.setDate(1);
        break;
      }
      case 'current_year': {
        // Start: January 1st of current year
        // End: today
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      }
      case 'all_time': {
        // Start: Very old date (1970)
        // End: today
        startDate = new Date(1970, 0, 1);
        break;
      }
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    startDate.setHours(0, 0, 0, 0);

    return { startDate, endDate };
  }, [period]);
};
