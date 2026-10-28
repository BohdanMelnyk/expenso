import type { ParsedExpenseResponse } from '../api/client';
import { applyParse, canSave, checkParseInput, editDraft, emptyDraft, parseAmount, saveTitle } from './draft';
import { category, vendor } from './fixtures';

const food = category(1, 'Food Store');
const dining = category(17, 'Dining', '🍽️');
const cats = [food, dining];
const rewe = vendor(7, 'Rewe', 1, 'Food Store');
const edeka = vendor(8, 'Edeka', 1, 'Food Store');
const restaurant = vendor(9, 'Restaurant', 17, 'Dining');
const vendors = [rewe, edeka, restaurant];

const parsed = (p: Partial<ParsedExpenseResponse> = {}): ParsedExpenseResponse => ({
  amount: 23.4, currency: 'EUR', category: 'Food Store', date: '2026-10-27', payment_method: 'card',
  description: 'groceries', confidence_score: 0.9, matched_vendor_id: 7, ...p,
});

const draft = (text = 'rewe 23.40 groceries') => ({ ...emptyDraft('2026-10-28', 'b_haspa_credit'), text });

describe('draft', () => {
  it('fills from a parse of the current text', () => {
    const d = applyParse(draft(), parsed(), 'rewe 23.40 groceries', vendors, cats);
    expect(d).toMatchObject({ amount: 23.4, vendorId: 7, category: 'Food Store', note: 'groceries', date: '2026-10-27', paymentMethod: 'b_haspa_credit' });
    expect(canSave(d)).toBe(true);
    expect(saveTitle(d, vendors)).toContain('Rewe');
  });

  it('reads cash from the parse', () => {
    expect(applyParse(draft('x'), parsed({ payment_method: 'cash' }), 'x', vendors, cats).paymentMethod).toBe('cash');
  });

  it('ignores a parse of older text', () => {
    const d = applyParse(draft('rewe 23.40'), parsed({ amount: 2 }), 'rewe 2', vendors, cats);
    expect(d.amount).toBe(0);
    expect(d.vendorId).toBeUndefined();
  });

  it('keeps fields the user changed', () => {
    const d = applyParse(editDraft(draft('x'), { amount: 50 }, vendors), parsed(), 'x', vendors, cats);
    expect(d.amount).toBe(50);
    expect(d.vendorId).toBe(7);
  });

  it('clears a vendor that does not belong to a new category', () => {
    const d = editDraft(editDraft(draft(), { vendorId: 7 }, vendors), { category: 'Dining' }, vendors);
    expect(d.vendorId).toBeUndefined();
    expect(editDraft(editDraft(draft(), { vendorId: 7 }, vendors), { category: 'Food Store' }, vendors).vendorId).toBe(7);
  });

  it('keeps the category of a vendor the user picked when re-parsing', () => {
    const d = applyParse(editDraft(draft('x'), { vendorId: 8 }, vendors), parsed({ category: 'Dining', matched_vendor_id: 9 }), 'x', vendors, cats);
    expect(d.vendorId).toBe(8);
    expect(d.category).toBe('Food Store');
  });

  it('leaves unknown vendor and category empty', () => {
    const d = applyParse(draft('x'), parsed({ category: 'Investment', matched_vendor_id: 999 }), 'x', vendors, cats);
    expect(d.vendorId).toBeUndefined();
    expect(d.category).toBeUndefined();
    expect(canSave(d)).toBe(false);
    expect(d.amount).toBe(23.4);
  });

  it('reads amounts with comma or dot', () => {
    expect(parseAmount('23,40')).toBe(23.4);
    expect(parseAmount('23.40')).toBe(23.4);
    expect(parseAmount('1.234')).toBe(1234);
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('1,234.56')).toBe(1234.56);
    expect(parseAmount('abc')).toBeNull();
  });

  it('checks the parse length limits', () => {
    expect(checkParseInput('rewe')).toBe('short');
    expect(checkParseInput('rewe 23.40')).toBe('ok');
    expect(checkParseInput('a'.repeat(501))).toBe('long');
  });
});
