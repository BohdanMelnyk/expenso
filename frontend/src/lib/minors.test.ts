import { clearParsed, emptyDraft, editDraft } from './draft';
import { totalsByVendor } from './spending';
import { grownThisYear } from './wealth';
import { readLastImport, saveLastImport } from './lastImport';
import { exp, snap, vendor } from './fixtures';

describe('small fixes', () => {
  it('forgets parsed values but keeps the user’s own when the text gets too short', () => {
    const parsed = { ...emptyDraft('2026-10-28', 'cash'), text: 're', amount: 23.4, vendorId: 7, category: 'Food Store', note: 'groceries' };
    const withEdit = editDraft(parsed, { note: 'mine' }, []);
    const cleared = clearParsed(withEdit);
    expect(cleared).toMatchObject({ amount: 0, vendorId: undefined, category: undefined, note: 'mine', text: 're' });
  });

  it('also resets a parsed date and payment method to the defaults', () => {
    const parsed = { ...emptyDraft('2026-10-28', 'b_haspa_credit'), text: 're', date: '2026-10-27', paymentMethod: 'cash' };
    expect(clearParsed(parsed, '2026-10-28', 'b_haspa_credit')).toMatchObject({ date: '2026-10-28', paymentMethod: 'b_haspa_credit' });
    const kept = editDraft(parsed, { paymentMethod: 'cash' }, []);
    expect(clearParsed(kept, '2026-10-28', 'b_haspa_credit').paymentMethod).toBe('cash');
  });

  it('keeps vendor ids with vendor totals', () => {
    const rewe = vendor(7, 'Rewe', 1, 'Food Store');
    expect(totalsByVendor([exp(5, '2026-10-01', 'Food Store', rewe)])[0]).toMatchObject({ id: 7, name: 'Rewe', amount: 5, count: 1 });
  });

  it('counts growth as zero when no snapshot was taken this year yet', () => {
    expect(grownThisYear([snap(1, '2025-11-01', { haspa: 100 }), snap(2, '2025-12-20', { haspa: 150 })], new Date(2026, 0, 10))).toBe(0);
  });

  it('counts import age in calendar days', () => {
    saveLastImport({ bank: 'Haspa', at: new Date(2026, 9, 27, 23, 0).toISOString(), coveredUntil: '2026-10-25' });
    expect(readLastImport(new Date(2026, 9, 28, 9, 0))?.ago).toBe('yesterday');
  });
});
