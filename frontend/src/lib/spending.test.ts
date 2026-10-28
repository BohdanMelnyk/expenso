import { biggest, yearRows, categoryRows, insights, monthTotals, savedPerMonth, sixMonthAverages, yearProjection } from './spending';
import { exp, inc } from './fixtures';
import { eur } from './format';

const oct = new Date(2026, 9, 1);

describe('sixMonthAverages', () => {
  it('counts months without spending as zero', () => {
    const avg = sixMonthAverages([exp(600, '2026-04-10', 'Food Store'), exp(50, '2026-10-02', 'Food Store')], oct);
    expect(avg.get('Food Store')).toBe(100);
  });

  it('ignores the shown month and anything older than six months', () => {
    const avg = sixMonthAverages([exp(600, '2026-03-31', 'Food Store'), exp(999, '2026-10-02', 'Food Store')], oct);
    expect(avg.get('Food Store') ?? 0).toBe(0);
  });
});

describe('categoryRows', () => {
  const window = [
    exp(607, '2026-10-05', 'Travel'),
    exp(1254, '2026-05-05', 'Travel'),
    exp(1254, '2026-08-05', 'Travel'),
    exp(100, '2026-10-06', 'Food Store'),
  ];

  it('compares the month with its six-month average, biggest first', () => {
    const rows = categoryRows(window, oct);
    expect(rows.map((r) => r.name)).toEqual(['Travel', 'Food Store']);
    expect(rows[0].average).toBe(418);
    expect(rows[0].change).toBeCloseTo(0.4522, 3);
    expect(rows[1].change).toBeNull();
    expect(rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1, 6);
  });
});

describe('insights', () => {
  const window = [
    exp(607, '2026-10-05', 'Travel'),
    exp(2508, '2026-06-05', 'Travel'),
    exp(226, '2026-10-05', 'Dining'),
    ...[4, 5, 6, 7, 8, 9].map((m) => exp(286, `2026-0${m}-10`, 'Dining')),
    exp(304, '2026-10-01', 'Subscriptions & Fees'),
  ];

  it('leads with the biggest change and keeps at most four cards', () => {
    const cards = insights(window, oct, 'Subscriptions & Fees', new Date(2026, 10, 2));
    expect(cards.length).toBeLessThanOrEqual(4);
    expect(cards[0]).toMatchObject({ kind: 'over', category: 'Travel' });
    expect(cards.find((c) => c.kind === 'under')?.category).toBe('Dining');
  });

  it('shows subscriptions as a yearly cost', () => {
    const subs = insights(window, oct).find((c) => c.kind === 'subscriptions');
    expect(subs?.title).toContain(eur(304 * 12).replace(/,00/, ''));
  });

  it('skips "down" cards while the month is still running', () => {
    const cards = insights(window, oct, 'Subscriptions & Fees', new Date(2026, 9, 5));
    expect(cards.some((c) => c.kind === 'under')).toBe(false);
  });

  it('does not flag a recurring payment like rent as unusual', () => {
    const rent = { id: 3, name: 'Flat Rent' } as any;
    const living = [
      ...[4, 5, 6, 7, 8, 9].map((m) => exp(1177, `2026-0${m}-01`, 'Living', rent)),
      ...[4, 5, 6, 7, 8, 9].flatMap((m) => [exp(30, `2026-0${m}-10`, 'Living'), exp(35, `2026-0${m}-12`, 'Living')]),
      exp(1177, '2026-10-01', 'Living', rent),
    ];
    expect(insights(living, oct, 'Subscriptions & Fees', new Date(2026, 10, 2)).some((c) => c.kind === 'large')).toBe(false);
  });

  it('flags one unusually large expense', () => {
    const big = [
      exp(20, '2026-09-01', 'Shopping'),
      exp(25, '2026-08-01', 'Shopping'),
      exp(22, '2026-07-01', 'Shopping'),
      exp(180, '2026-10-03', 'Shopping'),
    ];
    expect(insights(big, oct).some((c) => c.kind === 'large' && c.category === 'Shopping')).toBe(true);
  });
});

describe('saving', () => {
  it('nets income against spending per month', () => {
    const months = [new Date(2026, 8, 1), oct];
    const saved = savedPerMonth([inc(5000, '2026-10-01'), inc(100, '2026-09-15')], [exp(2000, '2026-10-05'), exp(300, '2026-09-02')], months);
    expect(saved).toEqual([-200, 3000]);
    expect(monthTotals([exp(2000, '2026-10-05'), exp(300, '2026-09-02')], months)).toEqual([300, 2000]);
  });

  it('projects the year from the average month so far', () => {
    expect(yearProjection([100, 200], new Date(2026, 1, 15))).toEqual({ soFar: 300, onTrack: 100 + 100 * 11 });
  });

  it('works in January with a single month', () => {
    const saved = savedPerMonth([inc(1000, '2026-01-02')], [exp(400, '2026-01-10')], [new Date(2026, 0, 1)]);
    expect(saved).toEqual([600]);
    expect(yearProjection(saved, new Date(2026, 0, 20))).toEqual({ soFar: 600, onTrack: 600 * 12 });
  });

  it('lists the biggest expenses', () => {
    expect(biggest([exp(5, '2026-10-01'), exp(50, '2026-10-02'), exp(20, '2026-10-03')], 2).map((e) => e.amount)).toEqual([50, 20]);
  });
});

describe('yearRows', () => {
  it('compares this year so far with last year at the same pace', () => {
    // Last year: Travel 1200 over 12 months = 100/month. This year by October (10 months): 1500 vs 1000.
    const rows = yearRows([exp(1200, '2025-06-01', 'Travel'), exp(1500, '2026-03-01', 'Travel')], 2026, new Date(2026, 9, 28));
    expect(rows[0]).toMatchObject({ name: 'Travel', amount: 1500, average: 1000 });
    expect(rows[0].change).toBeCloseTo(0.5, 6);
  });

  it('uses all twelve months for a finished year', () => {
    const rows = yearRows([exp(1200, '2024-06-01', 'Travel'), exp(600, '2025-03-01', 'Travel')], 2025, new Date(2026, 9, 28));
    expect(rows[0]).toMatchObject({ amount: 600, average: 1200 });
  });
});

describe('review fixes', () => {
  it('projects the year from complete months only', () => {
    // Oct 3: Jan..Sep saved 1000 each, October so far −1500 (rent in, salary not yet).
    const saved = [...Array(9).fill(1000), -1500];
    expect(yearProjection(saved, new Date(2026, 9, 3))).toEqual({ soFar: 7500, onTrack: 9000 + 1000 * 3 });
  });

  it('in January falls back to the trailing months it is given', () => {
    expect(yearProjection([-1500], new Date(2026, 0, 3), [1000, 1200, 800])).toEqual({ soFar: -1500, onTrack: 1000 * 12 });
  });

  it('compares a running month with the same days of earlier months', () => {
    const items = [
      exp(100, '2026-10-02', 'Food Store'),
      ...[4, 5, 6, 7, 8, 9].flatMap((m) => [exp(60, `2026-0${m}-02`, 'Food Store'), exp(540, `2026-0${m}-20`, 'Food Store')]),
    ];
    const rows = categoryRows(items, oct, 5);
    expect(rows[0].average).toBe(60);
    expect(rows[0].change).toBeCloseTo(100 / 60 - 1, 6);
    expect(categoryRows(items, oct)[0].average).toBe(600);
  });
});
