import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { expenseAPI, fetchSnapshots, incomeAPI, type Expense, type Income, type Snapshot } from '../api/client';
import { useCatalog } from '../hooks/useCatalog';
import { useLoad } from '../hooks/useLoad';
import { useAddPanel } from '../contexts/AddPanelContext';
import { biggest, categoryRows, insights, ofMonth, savedPerMonth, sixMonthAverages, yearProjection, yearRows, type CategoryRow, type Insight } from '../lib/spending';
import { latestTwo } from '../lib/wealth';
import { eur, eurShort, signedEur } from '../lib/format';
import { addMonths, apiRange, monthKey, monthName, monthsBetween, monthStart, parseISODate, parseMonthKey, sameMonth, shortMonth } from '../lib/months';
import { Card, CardTitle, CategoryIcon, ChangeBadge, PageHeader, Quiet, StatCard } from '../ui/Card';

interface Data {
  expenses: Expense[];
  incomes: Income[];
  snapshots: Snapshot[];
}

const insightStyle: Record<Insight['kind'], string> = {
  over: 'bg-red-50 dark:bg-red-500/10',
  under: 'bg-emerald-50 dark:bg-emerald-500/10',
  subscriptions: 'bg-amber-50 dark:bg-amber-500/10',
  large: 'bg-amber-50 dark:bg-amber-500/10',
};

const OverviewPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const now = new Date();
  const thisMonth = monthStart(now);
  const isYear = params.get('period') === 'year';
  const requested = params.get('month') ? parseMonthKey(params.get('month')!) : thisMonth;
  const month = requested > thisMonth ? thisMonth : requested;
  const year = month.getFullYear();
  const { categoryByName } = useCatalog();
  const { openEditExpense } = useAddPanel();
  const [showAll, setShowAll] = React.useState(false);

  // Enough history for the six-month comparison, last year's pace and this year's savings.
  const from = isYear ? new Date(year - 1, 0, 1) : new Date(Math.min(addMonths(month, -6).getTime(), new Date(year, 0, 1).getTime()));
  const to = year < now.getFullYear() ? new Date(year, 11, 1) : thisMonth;
  const { data, loading } = useLoad<Data>(async () => {
    const range = apiRange(from, to);
    const [e, i, s] = await Promise.all([
      expenseAPI.getActualExpenses(range.start, range.end),
      incomeAPI.getIncomes(range.start, range.end),
      fetchSnapshots(),
    ]);
    return { expenses: e.data ?? [], incomes: i.data ?? [], snapshots: s };
  }, `${monthKey(from)}:${monthKey(to)}`);

  const go = (m: Date) => setParams({ ...(isYear ? { period: 'year' } : {}), month: monthKey(m) });
  const setYear = (y: boolean) => setParams({ ...(y ? { period: 'year' } : {}), month: monthKey(month) });

  const expenses = data?.expenses ?? [];
  const incomes = data?.incomes ?? [];
  const yearMonths = monthsBetween(new Date(year, 0, 1), to);
  const shownExpenses = isYear ? expenses.filter((e) => parseISODate(e.date).getFullYear() === year) : ofMonth(expenses, month);
  const shownIncomes = isYear ? incomes.filter((i) => parseISODate(i.date).getFullYear() === year) : incomes.filter((i) => sameMonth(parseISODate(i.date), month));
  const spent = shownExpenses.reduce((s, e) => s + e.amount, 0);
  const earned = shownIncomes.reduce((s, i) => s + i.amount, 0);
  const saved = earned - spent;
  const rows: CategoryRow[] = isYear ? yearRows(expenses, year, now) : categoryRows(expenses, month);
  const usual = isYear ? rows.reduce((s, r) => s + r.average, 0) : Array.from(sixMonthAverages(expenses, month).values()).reduce((s, x) => s + x, 0);
  const vsUsual = spent - usual;
  const cards = isYear ? [] : insights(expenses, month);
  const savedBars = savedPerMonth(incomes, expenses, yearMonths);
  const projection = yearProjection(savedBars, now);
  const { latest, previous } = latestTwo(data?.snapshots ?? []);
  const shownRows = showAll ? rows : rows.slice(0, 6);
  const maxRow = Math.max(1, ...rows.map((r) => Math.max(r.amount, r.average)));

  return (
    <div className="mx-auto max-w-screen-2xl">
      <PageHeader title={isYear ? String(year) : monthName(month)}>
        <div className="flex items-center rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-zinc-900">
          <button className="p-1.5 text-blue-600 dark:text-blue-400" onClick={() => go(isYear ? new Date(year - 1, 0, 1) : addMonths(month, -1))} title="Earlier"><ChevronLeft className="h-4 w-4" /></button>
          <button className="p-1.5 text-blue-600 disabled:opacity-30 dark:text-blue-400" disabled={isYear ? year >= now.getFullYear() : sameMonth(month, thisMonth)} onClick={() => go(isYear ? new Date(year + 1, 0, 1) : addMonths(month, 1))} title="Later"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="ml-auto flex rounded-lg bg-gray-200/70 p-0.5 text-xs font-semibold dark:bg-white/10">
          {[false, true].map((y) => (
            <button key={String(y)} onClick={() => setYear(y)} className={`rounded-md px-3 py-1 ${isYear === y ? 'bg-white shadow-sm dark:bg-zinc-700' : 'text-gray-600 dark:text-gray-400'}`}>{y ? 'Year' : 'Month'}</button>
          ))}
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Spent"
          value={eurShort(spent)}
          sub={usual > 0 ? <span className={vsUsual <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{eurShort(Math.abs(vsUsual))} {vsUsual <= 0 ? 'under' : 'over'} {isYear ? 'last year’s pace' : 'your 6-month average'}</span> : `${shownExpenses.length} expenses`}
        />
        <StatCard label="Income" value={eurShort(earned)} sub={`${shownIncomes.length} ${shownIncomes.length === 1 ? 'entry' : 'entries'}`} />
        <StatCard label="Saved" value={signedEur(saved)} tone={saved >= 0 ? 'good' : 'bad'} sub={earned > 0 ? `${Math.round((saved / earned) * 100)}% of income` : 'no income yet'} />
        <StatCard
          label="Net worth"
          value={latest ? eurShort(latest.total) : '—'}
          sub={latest && previous ? <span className={latest.total >= previous.total ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{latest.total >= previous.total ? '▲' : '▼'} {eurShort(Math.abs(latest.total - previous.total))} since last snapshot</span> : latest ? 'first snapshot' : 'no snapshots yet'}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardTitle right={rows.some((r) => r.average > 0) ? (isYear ? '┃ = last year’s pace' : '┃ = your 6-month average') : undefined}>Where it went</CardTitle>
          {rows.length === 0 && !loading && <Quiet>Nothing spent {isYear ? 'this year' : 'this month'} yet.</Quiet>}
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {shownRows.map((r) => {
              const category = categoryByName(r.name);
              return (
                <Link key={r.name} to={`/category/${encodeURIComponent(r.name)}?month=${monthKey(month)}`} className="flex items-center gap-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5">
                  <CategoryIcon category={category} />
                  <span className="w-36 truncate text-sm">{r.name}</span>
                  <div className="relative h-1.5 flex-1 rounded-full bg-gray-100 dark:bg-white/10">
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(r.amount / maxRow) * 100}%`, background: category?.color ?? '#8e8e93' }} />
                    {r.average > 0 && <div className="absolute -top-1 -bottom-1 w-0.5 bg-gray-900/50 dark:bg-white/60" style={{ left: `${(r.average / maxRow) * 100}%` }} />}
                  </div>
                  <span className="w-20 text-right text-sm font-semibold tabular-nums">{eurShort(r.amount)}</span>
                  <ChangeBadge change={r.change} className="w-12 text-right" />
                </Link>
              );
            })}
          </div>
          {rows.length > 6 && (
            <button className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show fewer' : `+ ${rows.length - 6} more`}</button>
          )}
        </Card>

        <Card>
          {!isYear && (
            <>
              <CardTitle>Worth talking about</CardTitle>
              {cards.length === 0 && !loading && <Quiet>Nothing unusual {sameMonth(month, thisMonth) ? 'so far' : 'this month'}.</Quiet>}
              <div className="flex flex-col gap-2">
                {cards.map((c, i) => (
                  <div key={i} className={`rounded-lg p-3 ${insightStyle[c.kind]}`}>
                    <div className="text-sm font-semibold">{categoryByName(c.category)?.icon} {c.title}</div>
                    <div className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">{c.detail}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className={isYear ? '' : 'mt-4'}>
            <CardTitle>Biggest single expenses</CardTitle>
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {biggest(shownExpenses).map((e) => (
                <button key={e.id} onClick={() => openEditExpense(e)} className="flex w-full items-center gap-2 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5">
                  <CategoryIcon category={categoryByName(e.category)} size={20} />
                  <span className="truncate">{e.vendor?.name ?? e.category}{e.comment ? <span className="text-gray-500 dark:text-gray-400"> · {e.comment}</span> : null}</span>
                  <span className="ml-auto font-semibold tabular-nums">{eur(e.amount)}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-3">
        <CardTitle right={`${year}: ${signedEur(projection.soFar)} so far${year === now.getFullYear() && savedBars.length < 12 ? ` · on track for ${signedEur(projection.onTrack)}` : ''}`}>Saved per month</CardTitle>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearMonths.map((m, i) => ({ name: shortMonth(m), value: savedBars[i], current: sameMonth(m, month) }))}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} stroke="#8e8e93" />
              <Tooltip cursor={{ fill: 'rgba(142,142,147,.12)' }} formatter={(v: number) => signedEur(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {yearMonths.map((m, i) => (
                  <Cell key={i} fill={savedBars[i] >= 0 ? (sameMonth(m, month) && !isYear ? '#34c759' : '#a7dfb8') : '#f5a19a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

    </div>
  );
};

export default OverviewPage;
