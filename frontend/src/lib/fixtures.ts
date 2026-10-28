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
