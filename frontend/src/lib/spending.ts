import type { Expense, Income } from '../api/client';
import { addMonths, inMonth, monthsBetween, sameMonth, parseISODate } from './months';
import { eurShort } from './format';

export interface CategoryRow {
  name: string;
  amount: number;
  /** Mean per month over the six months before. */
  average: number;
  /** Against the average; null when the average is 0. */
  change: number | null;
  share: number;
}

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

export function totalsByCategory(expenses: Expense[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const e of expenses) totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
  return totals;
}

export function totalsByVendor(expenses: Expense[]): { id: number; name: string; amount: number; count: number }[] {
  const totals = new Map<number, { name: string; amount: number; count: number }>();
  for (const e of expenses) {
    if (!e.vendor) continue;
    const t = totals.get(e.vendor.id) ?? { name: e.vendor.name, amount: 0, count: 0 };
    totals.set(e.vendor.id, { ...t, amount: t.amount + e.amount, count: t.count + 1 });
  }
  return Array.from(totals, ([id, t]) => ({ id, ...t })).sort((a, b) => b.amount - a.amount);
}

export function monthTotals(expenses: Expense[], months: Date[]): number[] {
  return months.map((m) => sum(expenses.filter((e) => inMonth(e.date, m)).map((e) => e.amount)));
}

/** The six full months before `month`, oldest first. */
export const previousSix = (month: Date) => monthsBetween(addMonths(month, -6), addMonths(month, -1));

/**
 * Average per month for each category over the six months before `month`; months without spending count as 0.
 * With `upToDay`, only the first days of each month count, to compare a month still running.
 */
export function sixMonthAverages(expenses: Expense[], month: Date, upToDay?: number): Map<string, number> {
  const window = previousSix(month);
  const inWindow = expenses.filter((e) => window.some((m) => inMonth(e.date, m)) && (upToDay === undefined || parseISODate(e.date).getDate() <= upToDay));
  const averages = new Map<string, number>();
  totalsByCategory(inWindow).forEach((total, name) => averages.set(name, total / window.length));
  return averages;
}

/** The shown month by category against the six months before; `upToDay` compares only the same first days. */
export function categoryRows(expenses: Expense[], month: Date, upToDay?: number): CategoryRow[] {
  const current = totalsByCategory(expenses.filter((e) => inMonth(e.date, month)));
  const averages = sixMonthAverages(expenses, month, upToDay);
  const total = sum(Array.from(current.values()));
  return Array.from(current, ([name, amount]) => {
    const average = averages.get(name) ?? 0;
    return { name, amount, average, change: average > 0 ? (amount - average) / average : null, share: total > 0 ? amount / total : 0 };
  }).sort((a, b) => b.amount - a.amount);
}

export interface Insight {
  kind: 'over' | 'under' | 'subscriptions' | 'large';
  title: string;
  detail: string;
  /** Size of the difference in euros; bigger shows first. */
  weight: number;
  category?: string;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * Observations worth discussing for `month`, biggest first, at most four.
 * While the month is still running, "down" cards are skipped: most categories simply haven't been paid yet.
 */
export function insights(expenses: Expense[], month: Date, subscriptionsCategory = 'Subscriptions & Fees', now: Date = new Date()): Insight[] {
  const running = sameMonth(month, now);
  const inShown = expenses.filter((e) => inMonth(e.date, month));
  const window = previousSix(month);
  const inWindow = expenses.filter((e) => window.some((m) => inMonth(e.date, m)));
  const cards: Insight[] = [];

  for (const row of categoryRows(expenses, month)) {
    if (row.name === subscriptionsCategory || row.average <= 0) continue;
    const diff = row.amount - row.average;
    const count = inShown.filter((e) => e.category === row.name).length;
    if (diff >= 50 && diff / row.average >= 0.25) {
      cards.push({ kind: 'over', category: row.name, weight: diff, title: `${row.name} is ${eurShort(diff)} above usual`, detail: `${count} expense${count === 1 ? '' : 's'} this month against an average of ${eurShort(row.average)}.` });
    } else if (!running && -diff >= 30 && -diff / row.average >= 0.2) {
      cards.push({ kind: 'under', category: row.name, weight: -diff, title: `${row.name} is down ${Math.round((-diff / row.average) * 100)}%`, detail: `${eurShort(-diff)} less than your average.` });
    }
  }

  // Categories with no spend this month but a usual one also count as "under".
  sixMonthAverages(expenses, month).forEach((average, name) => {
    if (running || name === subscriptionsCategory || inShown.some((e) => e.category === name)) return;
    if (average >= 30) cards.push({ kind: 'under', category: name, weight: average, title: `Nothing spent on ${name}`, detail: `Usually ${eurShort(average)} a month.` });
  });

  for (const e of inShown) {
    const history = inWindow.filter((h) => h.category === e.category).map((h) => h.amount);
    if (history.length < 3) continue;
    const m = median(history);
    // A vendor that charged about this much before (rent, insurance) is a regular payment, not a surprise.
    const recurring = !!e.vendor && inWindow.some((h) => h.vendor?.id === e.vendor?.id && h.amount >= e.amount * 0.5);
    if (m > 0 && e.amount >= 3 * m && !recurring) {
      const name = e.vendor?.name ?? e.category;
      cards.push({ kind: 'large', category: e.category, weight: e.amount - m, title: `${eurShort(e.amount)} at ${name}`, detail: `${e.category} expenses are usually around ${eurShort(m)}.` });
    }
  }

  const ranked = cards.sort((a, b) => b.weight - a.weight);
  const subs = inShown.filter((e) => e.category === subscriptionsCategory);
  if (subs.length === 0) return ranked.slice(0, 4);

  const monthly = sum(subs.map((e) => e.amount));
  const byVendor = new Map<string, number>();
  subs.forEach((e) => byVendor.set(e.vendor?.name ?? e.comment ?? 'Other', (byVendor.get(e.vendor?.name ?? e.comment ?? 'Other') ?? 0) + e.amount));
  const top = Array.from(byVendor).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topShare = Math.round((sum(top.map(([, v]) => v)) / monthly) * 100);
  const subscriptions: Insight = {
    kind: 'subscriptions',
    category: subscriptionsCategory,
    weight: 0,
    title: `Subscriptions: ${eurShort(monthly)}/month = ${eurShort(monthly * 12)}/year`,
    detail: `${subs.length} payment${subs.length === 1 ? '' : 's'}. ${top.map(([n]) => n).join(', ')} make up ${topShare}%.`,
  };
  return [...ranked.slice(0, 3), subscriptions];
}

/** Income minus spending for each month. */
export function savedPerMonth(incomes: Income[], expenses: Expense[], months: Date[]): number[] {
  return months.map(
    (m) => sum(incomes.filter((i) => inMonth(i.date, m)).map((i) => i.amount)) - sum(expenses.filter((e) => inMonth(e.date, m)).map((e) => e.amount))
  );
}

/**
 * Saved so far this year, and where the year ends: the complete months so far plus their average
 * for every month left (the running month included). With no complete month yet (January),
 * the average comes from `trailing` (e.g. the last 12 full months), else from the running month.
 * `savedSoFar` holds January … the current month.
 */
export function yearProjection(savedSoFar: number[], now: Date, trailing: number[] = []): { soFar: number; onTrack: number } {
  const soFar = sum(savedSoFar);
  const complete = savedSoFar.slice(0, Math.min(now.getMonth(), savedSoFar.length));
  const basis = complete.length ? complete : trailing.length ? trailing : savedSoFar;
  if (basis.length === 0) return { soFar, onTrack: soFar };
  const average = sum(basis) / basis.length;
  return { soFar, onTrack: sum(complete) + average * (12 - complete.length) };
}

export function biggest(expenses: Expense[], n = 5): Expense[] {
  return [...expenses].sort((a, b) => b.amount - a.amount).slice(0, n);
}

/** Expenses of one calendar month. */
export const ofMonth = (expenses: Expense[], month: Date) => expenses.filter((e) => sameMonth(parseISODate(e.date), month));

/**
 * Categories for a whole year: so far this year against last year's monthly average
 * times the months elapsed (12 for a finished year).
 */
export function yearRows(expenses: Expense[], year: number, now: Date): CategoryRow[] {
  const yearOf = (e: Expense) => parseISODate(e.date).getFullYear();
  const elapsed = year < now.getFullYear() ? 12 : now.getMonth() + 1;
  const current = totalsByCategory(expenses.filter((e) => yearOf(e) === year));
  const previous = totalsByCategory(expenses.filter((e) => yearOf(e) === year - 1));
  const total = sum(Array.from(current.values()));
  return Array.from(current, ([name, amount]) => {
    const average = ((previous.get(name) ?? 0) / 12) * elapsed;
    return { name, amount, average, change: average > 0 ? (amount - average) / average : null, share: total > 0 ? amount / total : 0 };
  }).sort((a, b) => b.amount - a.amount);
}
