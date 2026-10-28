import { addMonths, apiRange, monthKey, monthsBetween, parseISODate, parseMonthKey, toISODate } from './months';
import { changeLabel, eur, signedEur } from './format';

describe('months', () => {
  it('gives the API range from the first of one month to the last of another', () => {
    expect(apiRange(new Date(2026, 9, 15), new Date(2026, 9, 15))).toEqual({ start: '2026-10-01', end: '2026-10-31' });
    expect(apiRange(new Date(2026, 7, 3), new Date(2026, 9, 1))).toEqual({ start: '2026-08-01', end: '2026-10-31' });
  });

  it('lists months inclusive, oldest first', () => {
    const m = monthsBetween(new Date(2026, 7, 20), new Date(2026, 9, 1));
    expect(m.map(monthKey)).toEqual(['2026-08', '2026-09', '2026-10']);
  });

  it('adds months from the first of the month', () => {
    expect(toISODate(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-01');
    expect(monthKey(addMonths(new Date(2026, 0, 15), -1))).toBe('2025-12');
  });

  it('round-trips month keys and ISO dates in local time', () => {
    expect(toISODate(parseMonthKey('2026-10'))).toBe('2026-10-01');
    expect(toISODate(parseISODate('2026-10-28'))).toBe('2026-10-28');
    expect(toISODate(parseISODate('2026-10-28T00:00:00Z'))).toBe('2026-10-28');
  });
});

describe('format', () => {
  it('formats euros like the rest of the app', () => {
    // Intl puts a non-breaking space before the euro sign.
    const nb = (s: string) => s.replace(/\u00a0/g, ' ');
    expect(nb(eur(4768.91))).toBe('4.768,91 €');
    expect(nb(signedEur(3081))).toBe('+3.081 €');
    expect(nb(signedEur(-410))).toBe('−410 €');
  });

  it('labels spending changes', () => {
    expect(changeLabel(0.006)).toEqual({ text: '0%', tone: 'neutral' });
    expect(changeLabel(0.08)).toEqual({ text: '+8%', tone: 'bad' });
    expect(changeLabel(-0.21)).toEqual({ text: '−21%', tone: 'good' });
    expect(changeLabel(null)).toBeNull();
  });
});
