import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { expenseAPI, fetchSnapshots, incomeAPI, type Expense, type Income, type Snapshot } from '../api/client';
import { useLoad } from '../hooks/useLoad';
import { useAddPanel } from '../contexts/AddPanelContext';
import { savedPerMonth } from '../lib/spending';
import { grownThisYear, groups, inRange, latestTwo, projection, savedThisYear } from '../lib/wealth';
import { eur, eurShort, signedEur } from '../lib/format';
import { addMonths, apiRange, monthsBetween, monthStart, parseISODate } from '../lib/months';
import { Button, Card, CardTitle, PageHeader, Quiet, StatCard } from '../ui/Card';
import { useToaster } from '../ui/Toaster';
import SnapshotPanel from './wealth/SnapshotPanel';

interface Data {
  snapshots: Snapshot[];
  incomes: Income[];
  expenses: Expense[];
}

const groupColor: Record<string, string> = { Investments: '#5856d6', Banks: '#0a84ff', 'Cash & PayPal': '#34c759' };
const day = (iso: string) => parseISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Net worth over time, where it sits, how it grows, and snapshot entry. */
const WealthPage: React.FC = () => {
  const now = new Date();
  const thisMonth = monthStart(now);
  const { notifyChanged } = useAddPanel();
  const { show } = useToaster();
  const [range, setRange] = useState<'6M' | '1Y' | 'All'>('1Y');
  const [panel, setPanel] = useState<{ editing?: Snapshot } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAllSnapshots, setShowAllSnapshots] = useState(false);

  // This year for "saved", the last twelve full months for the saving pace.
  const from = new Date(Math.min(new Date(now.getFullYear(), 0, 1).getTime(), addMonths(thisMonth, -12).getTime()));
  const { data, loading } = useLoad<Data>(async () => {
    const r = apiRange(from, thisMonth);
    const [s, i, e] = await Promise.all([fetchSnapshots(), incomeAPI.getIncomes(r.start, r.end), expenseAPI.getActualExpenses(r.start, r.end)]);
    return { snapshots: s, incomes: i.data ?? [], expenses: e.data ?? [] };
  }, 'wealth');

  const snapshots = data?.snapshots ?? [];
  const { latest, previous } = latestTwo(snapshots);
  const grown = grownThisYear(snapshots, now);
  const saved = savedThisYear(data?.incomes ?? [], data?.expenses ?? [], now);
  const lastTwelve = monthsBetween(addMonths(thisMonth, -12), addMonths(thisMonth, -1));
  const monthly = savedPerMonth(data?.incomes ?? [], data?.expenses ?? [], lastTwelve);
  const avgSaving = monthly.length ? monthly.reduce((s, x) => s + x, 0) / monthly.length : 0;
  const pace = latest ? projection(latest.total, avgSaving, now) : null;

  const points = inRange(snapshots, range, now);
  const chart = [
    ...points.map((s) => ({ t: parseISODate(s.date).getTime(), total: s.total, pace: s.id === latest?.id ? s.total : undefined })),
    ...(pace ? [{ t: pace.date.getTime(), total: undefined, pace: pace.value }] : []),
  ];

  const saveDone = () => {
    setPanel(null);
    show('Snapshot saved');
    notifyChanged();
  };

  const listed = showAllSnapshots ? [...snapshots].sort((a, b) => (a.date < b.date ? 1 : -1)) : [latest, previous].filter((s): s is Snapshot => !!s);

  return (
    <div className="mx-auto max-w-[1920px]">
      <PageHeader title="Wealth">
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg bg-gray-200/70 p-0.5 text-xs font-semibold dark:bg-white/10">
            {(['6M', '1Y', 'All'] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)} className={`rounded-md px-3 py-1 ${range === r ? 'bg-white shadow-sm dark:bg-zinc-700' : 'text-gray-600 dark:text-gray-400'}`}>{r}</button>
            ))}
          </div>
          <Button onClick={() => setPanel({})} className="flex items-center gap-1.5"><Plus className="h-4 w-4" />New snapshot</Button>
        </div>
      </PageHeader>

      {!latest && !loading ? (
        <Card><Quiet>No snapshots yet. Add one to start tracking your net worth.</Quiet></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label={latest ? `Net worth · ${day(latest.date)}` : 'Net worth'}
              value={latest ? eurShort(latest.total) : '—'}
              sub={latest && previous ? <span className={latest.total >= previous.total ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{latest.total >= previous.total ? '▲' : '▼'} {eurShort(Math.abs(latest.total - previous.total))} since {day(previous.date)}</span> : undefined}
            />
            <StatCard label="Grown this year" value={grown === null ? '—' : signedEur(grown)} tone={grown === null ? undefined : grown >= 0 ? 'good' : 'bad'} sub={grown === null ? 'needs two snapshots' : `since ${now.getFullYear()} began`} />
            <StatCard
              label="Saved from income"
              value={signedEur(saved)}
              tone={saved >= 0 ? 'good' : 'bad'}
              sub={grown === null ? `this year` : `the markets moved the rest (${signedEur(grown - saved)})`}
            />
            <StatCard
              label={`At this pace, end of ${now.getFullYear() + 1}`}
              value={pace ? eurShort(pace.value) : '—'}
              sub={`${eurShort(avgSaving)}/month saved, no market growth`}
            />
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
            <Card>
              <CardTitle right="dashed = at this pace">Net worth over time</CardTitle>
              {points.length < 2 ? (
                <Quiet>Only one snapshot in this range.</Quiet>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chart}>
                      <defs>
                        <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a84ff" stopOpacity={0.25} /><stop offset="1" stopColor="#0a84ff" stopOpacity={0} /></linearGradient>
                      </defs>
                      <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(t) => new Date(t).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })} fontSize={11} stroke="#8e8e93" tickLine={false} axisLine={false} />
                      <YAxis orientation="right" tickFormatter={(v) => `${Math.round(v / 1000)}k`} fontSize={11} stroke="#8e8e93" tickLine={false} axisLine={false} domain={['auto', 'auto']} width={40} />
                      <Tooltip labelFormatter={(t) => new Date(t as number).toLocaleDateString('en-GB')} formatter={(v: number) => eur(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="total" stroke="#0a84ff" strokeWidth={2.5} fill="url(#nw)" connectNulls />
                      <Line type="linear" dataKey="pace" stroke="#0a84ff" strokeOpacity={0.6} strokeDasharray="5 4" dot={false} connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card>
              <CardTitle>Where it sits</CardTitle>
              {latest && (
                <>
                  <div className="mb-3 flex h-2.5 overflow-hidden rounded-full">
                    {groups(latest).map((g) => <span key={g.name} style={{ flex: Math.max(g.total, 0), background: groupColor[g.name] }} />)}
                  </div>
                  {groups(latest, previous).map((g) => (
                    <div key={g.name} className="border-b border-gray-100 py-1.5 last:border-0 dark:border-white/5">
                      <button className="flex w-full items-center gap-2 text-left text-sm" onClick={() => setExpanded((s) => { const n = new Set(s); if (n.has(g.name)) n.delete(g.name); else n.add(g.name); return n; })}>
                        <span className="h-2 w-2 rounded-full" style={{ background: groupColor[g.name] }} />
                        <b>{g.name}</b>
                        <span className="ml-auto font-semibold tabular-nums">{eurShort(g.total)}</span>
                        <span className={`w-16 text-right text-xs font-semibold tabular-nums ${g.change === null ? 'text-gray-400' : g.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{g.change === null ? '' : signedEur(g.change)}</span>
                      </button>
                      {expanded.has(g.name) && g.accounts.map((a) => (
                        <div key={a.name} className="flex items-center gap-2 py-1 pl-4 text-sm text-gray-600 dark:text-gray-300">
                          {a.name}{a.detail && <span className="text-xs text-gray-400">· {a.detail}</span>}
                          <span className="ml-auto tabular-nums">{eur(a.value)}</span>
                          <span className={`w-16 text-right text-xs tabular-nums ${a.change === null ? '' : a.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{a.change === null ? '' : signedEur(a.change)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
              <div className="mt-4">
                <CardTitle right={snapshots.length > 2 ? <button className="text-blue-600 dark:text-blue-400" onClick={() => setShowAllSnapshots(!showAllSnapshots)}>{showAllSnapshots ? 'Fewer' : `All ${snapshots.length}`}</button> : undefined}>Snapshots</CardTitle>
                {listed.map((s) => (
                  <button key={s.id} onClick={() => setPanel({ editing: s })} className="flex w-full items-center border-b border-gray-100 py-1.5 text-sm last:border-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5">
                    {day(s.date)}
                    <span className="ml-auto font-semibold tabular-nums">{eur(s.total)}</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {panel && <SnapshotPanel editing={panel.editing} latest={latest} onClose={() => setPanel(null)} onSaved={saveDone} />}
    </div>
  );
};

export default WealthPage;
