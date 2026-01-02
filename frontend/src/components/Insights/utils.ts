import { Expense as APIExpense, Income } from '../../api/client';

export interface WeekData {
  week: number;
  year: number;
  spend: number;
  variance: number;
}

export interface PersonData {
  person: string;
  amount: number;
  count: number;
}

export interface CategorySpend {
  category: string;
  amount: number;
  variance: number;
  percentOfTotal: number;
}

export interface PaymentMethodData {
  method: string;
  amount: number;
  trend: number[];
}

export interface WaterfallData {
  label: string;
  value: number;
  cumulative: number;
}

// Calculate variance between actual and expected spending
export const calculateVariance = (
  expenses: APIExpense[],
  period: 'week' | 'month' | 'year'
): number => {
  if (expenses.length === 0) return 0;

  // Group by period
  const groups: { [key: string]: number } = {};
  expenses.forEach(exp => {
    const date = new Date(exp.date);
    let key: string;

    if (period === 'week') {
      const weekNum = getWeekNumber(date);
      key = `${date.getFullYear()}-W${weekNum}`;
    } else if (period === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else {
      key = `${date.getFullYear()}`;
    }

    groups[key] = (groups[key] || 0) + exp.amount;
  });

  const values = Object.values(groups);
  if (values.length < 2) return 0;

  // Calculate coefficient of variation
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return mean > 0 ? (stdDev / mean) * 100 : 0;
};

// Aggregate expenses by week
export const aggregateByWeek = (expenses: APIExpense[]): WeekData[] => {
  const weekMap: { [key: string]: number[] } = {};

  expenses.forEach(exp => {
    const date = new Date(exp.date);
    const weekNum = getWeekNumber(date);
    const year = date.getFullYear();
    const key = `${year}-W${weekNum}`;

    if (!weekMap[key]) {
      weekMap[key] = [];
    }
    weekMap[key].push(exp.amount);
  });

  // Calculate average for variance
  const allWeekAverages = Object.values(weekMap).map(
    amounts => amounts.reduce((a, b) => a + b, 0) / amounts.length
  );
  const overallAverage = allWeekAverages.length > 0
    ? allWeekAverages.reduce((a, b) => a + b, 0) / allWeekAverages.length
    : 0;

  return Object.entries(weekMap)
    .map(([key, amounts]) => {
      const [year, week] = key.split('-W').map(v => parseInt(v));
      const total = amounts.reduce((a, b) => a + b, 0);
      const weekAverage = total / amounts.length;
      const variance = overallAverage > 0
        ? ((weekAverage - overallAverage) / overallAverage) * 100
        : 0;

      return {
        week,
        year,
        spend: Math.round(total * 100) / 100,
        variance: Math.round(variance * 10) / 10
      };
    })
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.week - b.week;
    });
};

// Group expenses by person (via comment pattern matching)
export const groupByPerson = (expenses: APIExpense[]): PersonData[] => {
  const personMap: { [key: string]: { amount: number; count: number } } = {};

  const personPatterns = {
    'He': /\b(he|him|his|male|man|boy)\b/i,
    'She': /\b(she|her|hers|female|woman|girl)\b/i
  };

  expenses.forEach(exp => {
    let person = 'Other';

    if (exp.comment) {
      for (const [name, pattern] of Object.entries(personPatterns)) {
        if (pattern.test(exp.comment)) {
          person = name;
          break;
        }
      }
    }

    if (!personMap[person]) {
      personMap[person] = { amount: 0, count: 0 };
    }
    personMap[person].amount += exp.amount;
    personMap[person].count += 1;
  });

  return Object.entries(personMap)
    .map(([person, data]) => ({
      person,
      amount: Math.round(data.amount * 100) / 100,
      count: data.count
    }))
    .sort((a, b) => b.amount - a.amount);
};

// Calculate payment method trends
export const calculatePaymentMethodTrends = (expenses: APIExpense[]): PaymentMethodData[] => {
  const methodMap: { [key: string]: number[] } = {};
  const weekMap: { [key: string]: boolean } = {};

  expenses.forEach(exp => {
    const date = new Date(exp.date);
    const weekNum = getWeekNumber(date);
    const weekKey = `${date.getFullYear()}-W${weekNum}`;
    weekMap[weekKey] = true;

    const method = exp.payment_method || 'Unknown';
    if (!methodMap[method]) {
      methodMap[method] = [];
    }
  });

  // Initialize all weeks for all methods
  const allWeeks = Object.keys(weekMap).sort();
  Object.keys(methodMap).forEach(method => {
    methodMap[method] = new Array(allWeeks.length).fill(0);
  });

  // Populate data
  expenses.forEach(exp => {
    const date = new Date(exp.date);
    const weekNum = getWeekNumber(date);
    const weekKey = `${date.getFullYear()}-W${weekNum}`;
    const weekIndex = allWeeks.indexOf(weekKey);
    const method = exp.payment_method || 'Unknown';

    if (weekIndex >= 0) {
      methodMap[method][weekIndex] += exp.amount;
    }
  });

  return Object.entries(methodMap)
    .map(([method, trend]) => ({
      method,
      amount: trend.reduce((a, b) => a + b, 0),
      trend
    }))
    .sort((a, b) => b.amount - a.amount);
};

// Get top spending categories
export const getTopCategories = (
  expenses: APIExpense[],
  limit: number = 10
): CategorySpend[] => {
  const categoryMap: { [key: string]: number[] } = {};

  expenses.forEach(exp => {
    const category = exp.category || 'Other';
    if (!categoryMap[category]) {
      categoryMap[category] = [];
    }
    categoryMap[category].push(exp.amount);
  });

  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return Object.entries(categoryMap)
    .map(([category, amounts]) => {
      const categoryTotal = amounts.reduce((a, b) => a + b, 0);
      const average = categoryTotal / amounts.length;

      // Calculate variance
      const variance = amounts.length > 1
        ? Math.sqrt(
            amounts.reduce((sum, amount) => sum + Math.pow(amount - average, 2), 0) /
            amounts.length
          )
        : 0;

      return {
        category,
        amount: Math.round(categoryTotal * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        percentOfTotal: Math.round((categoryTotal / total) * 100 * 10) / 10
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
};

// Calculate savings rate
export const calculateSavingsRate = (
  incomes: Income[],
  expenses: APIExpense[]
): { rate: number; savings: number; income: number; expenses: number } => {
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const savings = totalIncome - totalExpenses;
  const rate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  return {
    rate: Math.round(rate * 10) / 10,
    savings: Math.round(savings * 100) / 100,
    income: Math.round(totalIncome * 100) / 100,
    expenses: Math.round(totalExpenses * 100) / 100
  };
};

// Helper: Get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Format amount for display
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};
