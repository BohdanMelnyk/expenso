// Month arithmetic in local time. A "month" is the Date of its first day.

const pad = (n: number) => String(n).padStart(2, '0');

export const monthStart = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);

export const addMonths = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth() + n, 1);

export const monthEnd = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 1, 0);

export const monthKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export const parseMonthKey = (k: string): Date => {
  const [y, m] = k.split('-').map(Number);
  return new Date(y, m - 1, 1);
};

export const toISODate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Reads the 'yyyy-MM-dd' prefix of an API date as a local calendar day. */
export const parseISODate = (s: string): Date => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** First day of `from` to the last day of `to`, as API query dates. */
export const apiRange = (from: Date, to: Date) => ({
  start: toISODate(monthStart(from)),
  end: toISODate(monthEnd(to)),
});

/** Every month from `from` to `to`, inclusive, oldest first. */
export const monthsBetween = (from: Date, to: Date): Date[] => {
  const result: Date[] = [];
  for (let m = monthStart(from); m <= monthStart(to); m = addMonths(m, 1)) result.push(m);
  return result;
};

export const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export const inMonth = (isoDate: string, month: Date) => sameMonth(parseISODate(isoDate), month);

export const monthName = (d: Date) => d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

export const shortMonth = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' });
