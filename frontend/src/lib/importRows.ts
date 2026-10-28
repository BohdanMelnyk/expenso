import type { Category, Expense, Vendor } from '../api/client';
import type { BankTransaction } from '../types/bankImport';
import { applyParse, Draft, emptyDraft } from './draft';

export interface ImportRow {
  index: number;
  tx: BankTransaction;
  ticked: boolean;
  /** Money coming in (refunds, transfers): not an expense. */
  incoming: boolean;
  draft: Draft;
}

export const BANK_PAYMENT_METHOD = 'b_haspa_credit';

/**
 * One editable row per bank line. Purchases have a negative booking amount in the Haspa CSV;
 * positive lines are money coming in and start unticked.
 */
export function toRows(txs: BankTransaction[], vendors: Vendor[], categories: Category[]): ImportRow[] {
  return txs.map((tx, index) => {
    const incoming = tx.booking_amount > 0;
    const base: Draft = { ...emptyDraft(tx.transaction_date.slice(0, 10), BANK_PAYMENT_METHOD), text: tx.merchant };
    const parsed = { ...tx.parsed_expense, amount: Math.abs(tx.booking_amount), payment_method: BANK_PAYMENT_METHOD, date: tx.transaction_date };
    return { index, tx, ticked: !incoming, incoming, draft: applyParse(base, parsed, base.text, vendors, categories) };
  });
}

/** Ticked rows split into those safe to add and those matching an expense already saved. */
export function splitByDuplicates(rows: ImportRow[], found: Map<number, Expense[]>): { clear: ImportRow[]; held: { row: ImportRow; existing: Expense }[] } {
  const clear: ImportRow[] = [];
  const held: { row: ImportRow; existing: Expense }[] = [];
  for (const row of rows.filter((r) => r.ticked)) {
    const existing = (found.get(row.index) ?? []).find((e) => Math.abs(e.amount - row.draft.amount) < 0.01);
    if (existing) held.push({ row, existing });
    else clear.push(row);
  }
  return { clear, held };
}
