import { grownThisYear, groups, inRange, latestTwo, projection, savedThisYear } from './wealth';
import { exp, inc, snap } from './fixtures';

describe('wealth', () => {
  it('groups accounts into investments, banks, cash', () => {
    const g = groups(snap(2, '2026-10-25', { haspa: 100, n26_b: 20, scalable_capital: 50, cash: 5 }));
    expect(g.map((x) => x.name)).toEqual(['Investments', 'Banks', 'Cash & PayPal']);
    expect(g.map((x) => x.total)).toEqual([50, 120, 5]);
    expect(g[1].accounts[0].name).toBe('Haspa');
    expect(g.every((x) => x.change === null)).toBe(true);
  });

  it('shows changes against the previous snapshot', () => {
    const g = groups(snap(2, '2026-10-25', { haspa: 110 }), snap(1, '2026-09-28', { haspa: 100 }));
    expect(g[1].change).toBe(10);
    expect(g[1].accounts.find((a) => a.name === 'Haspa')?.change).toBe(10);
    expect(g[1].accounts.find((a) => a.name === 'N26 B')?.change).toBeNull();
  });

  it('finds the latest two by date', () => {
    const { latest, previous } = latestTwo([snap(1, '2026-09-28'), snap(3, '2026-08-30'), snap(2, '2026-10-25')]);
    expect(latest?.id).toBe(2);
    expect(previous?.id).toBe(1);
    expect(latestTwo([]).latest).toBeUndefined();
  });

  it('measures growth this year from the last snapshot of last year', () => {
    const now = new Date(2026, 9, 28);
    expect(grownThisYear([snap(1, '2025-12-30', { haspa: 100 }), snap(2, '2026-03-01', { haspa: 150 }), snap(3, '2026-10-25', { haspa: 180 })], now)).toBe(80);
    expect(grownThisYear([snap(2, '2026-03-01', { haspa: 150 }), snap(3, '2026-10-25', { haspa: 180 })], now)).toBe(30);
    expect(grownThisYear([snap(3, '2026-10-25', { haspa: 180 })], now)).toBeNull();
    expect(grownThisYear([], now)).toBeNull();
  });

  it('nets this year income against spending', () => {
    expect(savedThisYear([inc(5000, '2026-01-02'), inc(10, '2025-12-30')], [exp(2000, '2026-02-02')], new Date(2026, 9, 1))).toBe(3000);
  });

  it('projects to the end of next year without market growth', () => {
    const p = projection(160000, 2500, new Date(2026, 9, 28));
    expect(p.value).toBe(160000 + 2500 * 14);
    expect(p.date.getFullYear()).toBe(2027);
    expect(p.date.getMonth()).toBe(11);
  });

  it('filters by range, oldest first', () => {
    const all = [snap(1, '2026-10-25'), snap(2, '2026-01-10'), snap(3, '2025-06-01'), snap(4, '2026-06-01')];
    const now = new Date(2026, 9, 28);
    expect(inRange(all, '6M', now).map((s) => s.id)).toEqual([4, 1]);
    expect(inRange(all, '1Y', now).map((s) => s.id)).toEqual([2, 4, 1]);
    expect(inRange(all, 'All', now).map((s) => s.id)).toEqual([3, 2, 4, 1]);
  });
});
