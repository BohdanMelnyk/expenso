import type { BankTransaction } from '../types/bankImport';
import { splitByDuplicates, toRows } from './importRows';
import { category, exp, vendor } from './fixtures';

const cats = [category(1, 'Food Store')];
const kaufland = vendor(5, 'Kaufland', 1, 'Food Store');

const tx = (booking: number, date = '2026-10-24', vendorId: number | undefined = 5): BankTransaction => ({
  raw_data: {},
  parsed_expense: { amount: Math.abs(booking), currency: 'EUR', category: 'Food Store', date, payment_method: 'card', description: 'groceries', confidence_score: 0.9, matched_vendor_id: vendorId },
  original_amount: booking, original_currency: 'EUR', booking_amount: booking, booking_currency: 'EUR',
  transaction_date: date, merchant: 'KAUFLAND', location: 'HAMBURG', confidence_score: 0.9, booking_reference: 'r',
});

describe('import rows', () => {
  it('ticks purchases (negative booking amounts) and leaves incoming money unticked', () => {
    const rows = toRows([tx(-52.14), tx(4100)], [kaufland], cats);
    expect(rows[0]).toMatchObject({ ticked: true, incoming: false });
    expect(rows[0].draft).toMatchObject({ amount: 52.14, vendorId: 5, category: 'Food Store', date: '2026-10-24' });
    expect(rows[1]).toMatchObject({ ticked: false, incoming: true });
  });

  it('holds rows that match an existing expense and clears the rest', () => {
    const rows = toRows([tx(-52.14), tx(-23.4, '2026-10-26')], [kaufland], cats);
    const existing = exp(52.14, '2026-10-24', 'Food Store', kaufland);
    const { clear, held } = splitByDuplicates(rows, new Map([[0, [existing]], [1, []]]));
    expect(clear.map((r) => r.index)).toEqual([1]);
    expect(held).toEqual([{ row: rows[0], existing }]);
  });

  it('holds every row when all are duplicates', () => {
    const rows = toRows([tx(-52.14)], [kaufland], cats);
    const { clear, held } = splitByDuplicates(rows, new Map([[0, [exp(52.14, '2026-10-25')]]]));
    expect(clear).toEqual([]);
    expect(held).toHaveLength(1);
  });

  it('does nothing with no ticked rows', () => {
    const rows = toRows([tx(4100)], [kaufland], cats);
    expect(splitByDuplicates(rows, new Map())).toEqual({ clear: [], held: [] });
  });
});
