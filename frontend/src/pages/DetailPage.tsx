import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BarChart, Bar, Cell, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { expenseAPI, type Expense } from '../api/client';
import { useCatalog } from '../hooks/useCatalog';
import { useLoad } from '../hooks/useLoad';
import { useAddPanel } from '../contexts/AddPanelContext';
import { monthTotals, ofMonth, totalsByVendor } from '../lib/spending';
import { eur, eurShort } from '../lib/format';
import { addMonths, apiRange, monthKey, monthName, monthsBetween, monthStart, parseISODate, parseMonthKey, sameMonth, shortMonth } from '../lib/months';
import { Card, CardTitle, CategoryIcon, ChangeBadge, PageHeader, Quiet, StatCard } from '../ui/Card';

/** One category or one vendor: this month against usual, the last 12 months, and its expenses. */
const DetailPage: React.FC = () => {
  const { name, id } = useParams();
  const [params] = useSearchParams();
  const now = new Date();
  const month = params.get('month') ? parseMonthKey(params.get('month')!) : monthStart(now);
  const { categoryByName, vendors } = useCatalog();
  const { openEditExpense } = useAddPanel();

  const vendor = id ? vendors.find((v) => v.id === Number(id)) : undefined;
  const title = vendor?.name ?? (name ? decodeURIComponent(name) : '');
  const category = categoryByName(vendor?.category ?? title);
  const matches = (e: Expense) => (id ? e.vendor_id === Number(id) || e.vendor?.id === Number(id) : e.category.toLowerCase() === title.toLowerCase());

  const months = monthsBetween(addMonths(month, -11), month);
  const yearStart = new Date(month.getFullYear(), 0, 1);
  const from = yearStart < months[0] ? yearStart : months[0];
  const { data, loading } = useLoad<Expense[]>(async () => {
    const range = apiRange(from, month);
    return (await expenseAPI.getActualExpenses(range.start, range.end)).data ?? [];
  }, `${monthKey(from)}:${monthKey(month)}`);

  const all = data ?? [];
  const mine = all.filter(matches);
  const totals = monthTotals(mine, months);
  const current = totals[totals.length - 1];
  const average = totals.slice(-7, -1).reduce((s, x) => s + x, 0) / 6;
  const inMonthExpenses = ofMonth(mine, month).sort((a, b) => (a.date < b.date ? 1 : -1));
  const yearTotal = mine.filter((e) => parseISODate(e.date).getFullYear() === month.getFullYear()).reduce((s, e) => s + e.amount, 0);
  const yearAll = all.filter((e) => parseISODate(e.date).getFullYear() === month.getFullYear()).reduce((s, e) => s + e.amount, 0);
  const color = category?.color ?? '#0a84ff';

  return (
    <div className="mx-auto max-w-[1920px]">
      <Link to={`/?month=${monthKey(month)}`} className="text-sm text-blue-600 dark:text-blue-400">‹ Overview · {monthName(month)}</Link>
      <PageHeader title={<span className="flex items-center gap-3"><CategoryIcon category={category} size={36} />{title}</span>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={monthName(month)} value={eurShort(current ?? 0)} sub={<ChangeBadge change={average > 0 ? (current - average) / average : null} />} />
        <StatCard label="6-month average" value={eurShort(average)} sub="per month" />
        <StatCard label={`${month.getFullYear()} so far`} value={eurShort(yearTotal)} sub={yearAll > 0 ? `${Math.round((yearTotal / yearAll) * 100)}% of all spending` : undefined} />
        <StatCard label="Expenses" value={String(inMonthExpenses.length)} sub={inMonthExpenses.length ? `avg ${eur((current ?? 0) / inMonthExpenses.length)} each` : undefined} />
      </div>

      <div className={`mt-3 grid gap-3 ${vendor ? '' : 'lg:grid-cols-[1.4fr_1fr]'}`}>
        <Card>
          <CardTitle>Last 12 months</CardTitle>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months.map((m, i) => ({ name: shortMonth(m), value: totals[i] }))}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} stroke="#8e8e93" />
                <Tooltip cursor={{ fill: 'rgba(142,142,147,.12)' }} formatter={(v: number) => eur(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {months.map((m, i) => <Cell key={i} fill={sameMonth(m, month) ? color : '#c7c7cc'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        {!vendor && (
          <Card>
            <CardTitle>Vendors in {monthName(month)}</CardTitle>
            {totalsByVendor(inMonthExpenses).map((v) => (
              <div key={v.name} className="flex items-center gap-2 border-b border-gray-100 py-1.5 text-sm last:border-0 dark:border-white/5">
                <span>{v.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{v.count}×</span>
                <span className="ml-auto font-semibold tabular-nums">{eur(v.amount)}</span>
              </div>
            ))}
            {inMonthExpenses.length === 0 && !loading && <Quiet>Nothing this month.</Quiet>}
          </Card>
        )}
      </div>

      <Card className="mt-3 p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">{vendor ? 'Category' : 'Vendor'}</th>
              <th className="px-3 py-2 font-medium">Note</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inMonthExpenses.map((e) => (
              <tr key={e.id} onClick={() => openEditExpense(e)} className="cursor-pointer border-t border-gray-100 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5">
                <td className="px-3 py-2 tabular-nums">{parseISODate(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                <td className="px-3 py-2">{vendor ? e.category : e.vendor?.name ?? '—'}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{e.comment}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{eur(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {inMonthExpenses.length === 0 && !loading && <Quiet>No expenses in {monthName(month)}.</Quiet>}
      </Card>
    </div>
  );
};

export default DetailPage;
