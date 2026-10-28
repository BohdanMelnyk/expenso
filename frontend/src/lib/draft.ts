import type { Category, CreateExpenseRequest, ParsedExpenseResponse, Vendor } from '../api/client';
import { eur } from './format';

export type DraftField = 'amount' | 'vendorId' | 'category' | 'note' | 'paymentMethod' | 'date';

/** An expense being added or edited. Parses fill it in, but never over a field the user changed. */
export interface Draft {
  text: string;
  amount: number;
  vendorId?: number;
  category?: string;
  note: string;
  paymentMethod: string;
  /** yyyy-MM-dd */
  date: string;
  edited: DraftField[];
}

export const PAYMENT_METHODS = ['cash', 'b_haspa_credit', 'b_haspa_debit', 'b_dkb_credit', 'b_dkb_debit', 's_haspa_credit', 's_haspa_debit', 's_dkb_credit', 's_dkb_debit'];

export const emptyDraft = (today: string, defaultPayment: string): Draft => ({
  text: '',
  amount: 0,
  note: '',
  paymentMethod: defaultPayment,
  date: today,
  edited: [],
});

const sameName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;

const vendorCategory = (v: Vendor | undefined) => v?.category;

/** Apply user changes, marking each field as edited. A new category drops a vendor that isn't in it. */
export function editDraft(d: Draft, patch: Partial<Omit<Draft, 'text' | 'edited'>>, vendors: Vendor[]): Draft {
  const next: Draft = { ...d, ...patch, edited: Array.from(new Set([...d.edited, ...(Object.keys(patch) as DraftField[])])) };
  if ('category' in patch && next.vendorId !== undefined) {
    const v = vendors.find((x) => x.id === next.vendorId);
    if (!v || !next.category || !sameName(v.category, next.category)) next.vendorId = undefined;
  }
  return next;
}

/** Fill unedited fields from a parse of `forText`; ignored if the text has changed since. */
export function applyParse(d: Draft, parsed: ParsedExpenseResponse, forText: string, vendors: Vendor[], categories: Category[]): Draft {
  if (forText !== d.text) return d;
  const has = (f: DraftField) => d.edited.includes(f);
  const matched = vendors.find((v) => v.id === parsed.matched_vendor_id);
  const next = { ...d };

  if (!has('amount')) next.amount = parsed.amount;
  if (!has('category')) {
    if (has('vendorId') && next.vendorId !== undefined) {
      // The user picked the vendor, so its category stands.
      next.category = vendorCategory(vendors.find((v) => v.id === next.vendorId)) ?? next.category;
    } else {
      next.category = categories.find((c) => sameName(c.name, parsed.category))?.name ?? vendorCategory(matched);
    }
  }
  if (!has('vendorId')) {
    next.vendorId = matched && next.category && sameName(matched.category, next.category) ? matched.id : undefined;
  }
  if (!has('note')) next.note = parsed.description ?? '';
  if (!has('paymentMethod')) {
    const method = (parsed.payment_method ?? '').toLowerCase();
    if (method === 'cash') next.paymentMethod = 'cash';
    else if (PAYMENT_METHODS.includes(method)) next.paymentMethod = method;
  }
  if (!has('date') && /^\d{4}-\d{2}-\d{2}/.test(parsed.date ?? '')) next.date = parsed.date.slice(0, 10);
  return next;
}

/** Drop what a parse filled in (for text too short to parse); the user's own edits stay. */
export function clearParsed(d: Draft): Draft {
  const has = (f: DraftField) => d.edited.includes(f);
  return {
    ...d,
    amount: has('amount') ? d.amount : 0,
    vendorId: has('vendorId') ? d.vendorId : undefined,
    category: has('category') ? d.category : undefined,
    note: has('note') ? d.note : '',
  };
}

export const canSave = (d: Draft) => d.amount > 0 && !!d.category && d.vendorId !== undefined;

export function saveTitle(d: Draft, vendors: Vendor[]): string {
  const v = vendors.find((x) => x.id === d.vendorId);
  return canSave(d) && v ? `Save ${eur(d.amount)} at ${v.name}` : 'Save';
}

export function toRequest(d: Draft): CreateExpenseRequest {
  return {
    comment: d.note.trim(),
    amount: d.amount,
    vendor_id: d.vendorId ?? 0,
    date: d.date,
    category: d.category ?? '',
    type: 'expense',
    payment_method: d.paymentMethod,
  };
}

/** "23,40", "23.40", "1.234,56", "1,234.56"; one separator before exactly three digits means thousands. */
export function parseAmount(input: string): number | null {
  const s = input.replace(/[^\d.,]/g, '');
  if (!/\d/.test(s)) return null;
  const last = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
  if (last < 0) return Number(s);
  const separators = (s.match(/[.,]/g) ?? []).length;
  const decimals = s.slice(last + 1);
  if (separators === 1 && decimals.length === 3) return Number(s.replace(/[.,]/g, ''));
  const value = Number(`${s.slice(0, last).replace(/[.,]/g, '')}.${decimals}`);
  return Number.isFinite(value) ? value : null;
}

/** The parse endpoint accepts 5 to 500 characters. */
export function checkParseInput(text: string): 'ok' | 'short' | 'long' {
  const n = text.trim().length;
  return n < 5 ? 'short' : n > 500 ? 'long' : 'ok';
}
