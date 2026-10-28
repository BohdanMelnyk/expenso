// Test fixtures. Imported only by *.test.ts files.
import type { Expense, Income, Vendor, Category } from '../api/client';

let nextId = 1;

export const vendor = (id: number, name: string, categoryId: number, category: string): Vendor =>
  ({ id, name, type: 'else', category_id: categoryId, category, created_at: '', updated_at: '' } as unknown as Vendor);

export const category = (id: number, name: string, icon = '🛒', color = '#34C759'): Category =>
  ({ id, name, icon, color, created_at: '', updated_at: '' });

export const exp = (amount: number, date: string, cat = 'Food Store', v?: Vendor, comment = ''): Expense =>
  ({
    id: nextId++,
    comment,
    amount,
    vendor_id: v?.id ?? 0,
    vendor: v,
    date,
    type: 'expense',
    category: cat,
    payment_method: 'card',
    user_id: 1,
    created_at: '',
    updated_at: '',
  } as Expense);

export const inc = (amount: number, date: string, source = 'Salary'): Income =>
  ({ id: nextId++, amount, date, source, comment: '', user_id: 1, created_at: '', updated_at: '' } as Income);

export const snap = (id: number, date: string, values: Partial<Record<'haspa' | 'n26_b' | 'scalable_capital' | 'cash' | 'careem_rsu' | 'enbd_eur', number>> = {}): import('../api/client').Snapshot => {
  const v = { haspa: 0, n26_b: 0, scalable_capital: 0, cash: 0, careem_rsu: 0, enbd_eur: 0, ...values };
  return {
    id, date,
    total: v.haspa + v.n26_b + v.scalable_capital + v.cash + v.careem_rsu + v.enbd_eur,
    haspa: v.haspa, n26_b: v.n26_b, n26_m: 0, cash: v.cash, uber_stocks: 0, scalable_capital: v.scalable_capital,
    mono_b: 0, mono_m: 0, paypal_b: 0, paypal_m: 0, backup_cash: 0,
    careem_rsu_shares: 0, careem_rsu: v.careem_rsu, enbd_aed: 0, enbd_eur: v.enbd_eur, created_at: '',
  };
};
