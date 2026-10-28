import type { CreateSnapshotRequest, Expense, Income, Snapshot } from '../api/client';
import { parseISODate, toISODate } from './months';

export type GroupName = 'Investments' | 'Banks' | 'Cash & PayPal';

export interface AccountValue {
  name: string;
  value: number;
  /** Against the previous snapshot; null without one or when it didn't move. */
  change: number | null;
  detail?: string;
}

export interface AccountGroup {
  name: GroupName;
  total: number;
  change: number | null;
  /** Largest first. */
  accounts: AccountValue[];
}

interface Account {
  name: string;
  group: GroupName;
  value: (s: Snapshot) => number;
  detail?: (s: Snapshot) => string;
}

const ACCOUNTS: Account[] = [
  { name: 'Scalable Capital', group: 'Investments', value: (s) => s.scalable_capital },
  { name: 'Uber Stocks', group: 'Investments', value: (s) => s.uber_stocks },
  { name: 'Careem RSU', group: 'Investments', value: (s) => s.careem_rsu, detail: (s) => `${s.careem_rsu_shares} shares` },
  { name: 'Haspa', group: 'Banks', value: (s) => s.haspa },
  { name: 'N26 B', group: 'Banks', value: (s) => s.n26_b },
  { name: 'N26 M', group: 'Banks', value: (s) => s.n26_m },
  { name: 'Mono B', group: 'Banks', value: (s) => s.mono_b },
  { name: 'Mono M', group: 'Banks', value: (s) => s.mono_m },
  { name: 'ENBD', group: 'Banks', value: (s) => s.enbd_eur, detail: (s) => `${s.enbd_aed} AED` },
  { name: 'Cash', group: 'Cash & PayPal', value: (s) => s.cash },
  { name: 'Backup Cash', group: 'Cash & PayPal', value: (s) => s.backup_cash },
  { name: 'PayPal B', group: 'Cash & PayPal', value: (s) => s.paypal_b },
  { name: 'PayPal M', group: 'Cash & PayPal', value: (s) => s.paypal_m },
];

const GROUPS: GroupName[] = ['Investments', 'Banks', 'Cash & PayPal'];

/** Fields of the snapshot form, in the order they're shown. */
export const SNAPSHOT_FIELDS: { key: Exclude<keyof CreateSnapshotRequest, 'date'>; label: string; group: GroupName }[] = [
  { key: 'haspa', label: 'Haspa', group: 'Banks' },
  { key: 'n26_b', label: 'N26 B', group: 'Banks' },
  { key: 'n26_m', label: 'N26 M', group: 'Banks' },
  { key: 'mono_b', label: 'Mono B', group: 'Banks' },
  { key: 'mono_m', label: 'Mono M', group: 'Banks' },
  { key: 'enbd_aed', label: 'ENBD (AED)', group: 'Banks' },
  { key: 'scalable_capital', label: 'Scalable Capital', group: 'Investments' },
  { key: 'uber_stocks', label: 'Uber Stocks', group: 'Investments' },
  { key: 'careem_rsu_shares', label: 'Careem RSU (shares)', group: 'Investments' },
  { key: 'cash', label: 'Cash', group: 'Cash & PayPal' },
  { key: 'backup_cash', label: 'Backup Cash', group: 'Cash & PayPal' },
  { key: 'paypal_b', label: 'PayPal B', group: 'Cash & PayPal' },
  { key: 'paypal_m', label: 'PayPal M', group: 'Cash & PayPal' },
];

const delta = (now: number, before?: number) => {
  if (before === undefined) return null;
  const d = now - before;
  return Math.abs(d) < 0.5 ? null : d;
};

const byDateDesc = (s: Snapshot[]) => [...s].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));

export function latestTwo(snapshots: Snapshot[]): { latest?: Snapshot; previous?: Snapshot } {
  const sorted = byDateDesc(snapshots);
  return { latest: sorted[0], previous: sorted[1] };
}

export function groups(latest: Snapshot, previous?: Snapshot): AccountGroup[] {
  return GROUPS.map((name) => {
    const accounts = ACCOUNTS.filter((a) => a.group === name)
      .map((a) => ({
        name: a.name,
        value: a.value(latest),
        change: delta(a.value(latest), previous && a.value(previous)),
        detail: a.detail?.(latest),
      }))
      .sort((a, b) => b.value - a.value);
    const total = accounts.reduce((s, a) => s + a.value, 0);
    const before = previous ? ACCOUNTS.filter((a) => a.group === name).reduce((s, a) => s + a.value(previous), 0) : undefined;
    return { name, total, change: delta(total, before), accounts };
  });
}

/** Latest total minus the last snapshot of last year (or the first of this year). Null with fewer than two. */
export function grownThisYear(snapshots: Snapshot[], now: Date): number | null {
  const sorted = byDateDesc(snapshots);
  if (sorted.length < 2) return null;
  const yearStart = `${now.getFullYear()}-01-01`;
  const base = sorted.find((s) => s.date < yearStart) ?? [...sorted].reverse().find((s) => s.date >= yearStart);
  if (!base || base.id === sorted[0].id) return null;
  return sorted[0].total - base.total;
}

/** This year's income minus this year's spending. */
export function savedThisYear(incomes: Income[], expenses: Expense[], now: Date): number {
  const year = now.getFullYear();
  const thisYear = (date: string) => parseISODate(date).getFullYear() === year;
  return incomes.filter((i) => thisYear(i.date)).reduce((s, i) => s + i.amount, 0) - expenses.filter((e) => thisYear(e.date)).reduce((s, e) => s + e.amount, 0);
}

/** Where net worth lands at the end of next year if the average monthly saving continues and markets stay flat. */
export function projection(latestTotal: number, avgMonthlySaving: number, now: Date): { date: Date; value: number } {
  const date = new Date(now.getFullYear() + 1, 11, 31);
  const months = (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
  return { date, value: latestTotal + avgMonthlySaving * months };
}

export function inRange(snapshots: Snapshot[], range: '6M' | '1Y' | 'All', now: Date): Snapshot[] {
  const sorted = byDateDesc(snapshots).reverse();
  if (range === 'All') return sorted;
  const cutoff = new Date(now.getFullYear(), now.getMonth() - (range === '6M' ? 6 : 12), now.getDate());
  const from = toISODate(cutoff);
  return sorted.filter((s) => s.date.slice(0, 10) >= from);
}
