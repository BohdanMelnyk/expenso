import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, Search, Upload } from 'lucide-react';
import { expenseAPI, incomeAPI, type CreateExpenseRequest, type Expense, type Income, type Vendor } from '../api/client';
import { useCatalog } from '../hooks/useCatalog';
import { useLoad } from '../hooks/useLoad';
import { useAddPanel } from '../contexts/AddPanelContext';
import { eur } from '../lib/format';
import { addMonths, apiRange, monthKey, monthName, monthStart, parseISODate, parseMonthKey, sameMonth } from '../lib/months';
import { readLastImport } from '../lib/lastImport';
import { exportToPDF } from '../utils/pdfExport';
import { Button, Card, LoadError, CategoryIcon, PageHeader, Quiet } from '../ui/Card';
import { useToaster } from '../ui/Toaster';

const control = 'rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-800 dark:border-white/10 dark:bg-zinc-900 dark:text-gray-100';
const cell = 'rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm hover:border-gray-200 focus:border-blue-500 focus:outline-none dark:hover:border-white/15 dark:focus:bg-zinc-800';
const day = (iso: string) => parseISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** The vendor to use when an expense moves to another category: that category's "Else", or its first vendor. */
const vendorFor = (category: string, vendors: Vendor[]) => {
  const inCategory = vendors.filter((v) => v.category === category);
  return inCategory.find((v) => v.name === 'Else') ?? inCategory[0];
};

const ExpensesPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const thisMonth = monthStart(new Date());
  const month = params.get('month') ? parseMonthKey(params.get('month')!) : thisMonth;
  const kind = params.get('kind') === 'income' ? 'income' : 'expense';
  const { categories, vendors, categoryByName } = useCatalog();
  const { openEditExpense, openEditIncome, notifyChanged } = useAddPanel();
  const { show } = useToaster();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paidFilter, setPaidFilter] = useState<'' | 'card' | 'cash'>('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const lastImport = readLastImport();

  const range = apiRange(month, month);
  const { data, loading, error, reload } = useLoad<{ expenses: Expense[]; incomes: Income[] }>(async () => {
    const [e, i] = await Promise.all([expenseAPI.getActualExpenses(range.start, range.end), incomeAPI.getIncomes(range.start, range.end)]);
    return { expenses: e.data ?? [], incomes: i.data ?? [] };
  }, monthKey(month));

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    setParams(next);
    setSelected(new Set());
  };

  const expenses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.expenses ?? [])
      .filter((e) => !q || [e.comment, e.vendor?.name, e.category].some((x) => x?.toLowerCase().includes(q)))
      .filter((e) => !categoryFilter || e.category === categoryFilter)
      .filter((e) => !paidFilter || (paidFilter === 'cash') === (e.payment_method === 'cash'))
      .sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));
  }, [data, query, categoryFilter, paidFilter]);

  const incomes = useMemo(() => [...(data?.incomes ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1)), [data]);

  // Edits show at once, before the reload confirms them.
  const [pending, setPending] = useState<Record<number, Partial<Expense>>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => setPending({}), [data]);
  const withPending = (e: Expense): Expense => ({ ...e, ...pending[e.id] });

  const save = (e: Expense, patch: Partial<CreateExpenseRequest>, message: string) => {
    const vendor = patch.vendor_id !== undefined ? vendors.find((v) => v.id === patch.vendor_id) : undefined;
    setPending((p) => ({ ...p, [e.id]: { ...p[e.id], ...(patch.category ? { category: patch.category } : {}), ...(vendor ? { vendor_id: vendor.id, vendor } : {}) } }));
    return expenseAPI
      .patchExpense(e.id, patch)
      .then(() => {
        show(message);
        notifyChanged();
      })
      .catch(() => {
        setPending((p) => {
          const rest = { ...p };
          delete rest[e.id];
          return rest;
        });
        show("Couldn't save the change", 'error');
      });
  };

  const changeCategory = (e: Expense, category: string) => {
    const keep = vendors.find((v) => v.id === (e.vendor?.id ?? e.vendor_id) && v.category === category);
    const vendor = keep ?? vendorFor(category, vendors);
    if (!vendor) return show(`${category} has no vendors yet`, 'error');
    save(e, { category, vendor_id: vendor.id }, keep ? `Moved to ${category}` : `Moved to ${category} · vendor ${vendor.name}`);
  };

  /** Selected rows that are visible under the current search and filters. */
  const selectedRows = () => expenses.filter((e) => selected.has(e.id));

  const bulkCategory = async (category: string) => {
    if (busy) return;
    setBusy(true);
    let moved = 0;
    let failed = 0;
    for (const e of selectedRows()) {
      const vendor = vendors.find((v) => v.id === (e.vendor?.id ?? e.vendor_id) && v.category === category) ?? vendorFor(category, vendors);
      if (!vendor) {
        failed++;
        continue;
      }
      try {
        await expenseAPI.patchExpense(e.id, { category, vendor_id: vendor.id });
        moved++;
      } catch {
        failed++;
      }
    }
    setBusy(false);
    show(failed ? `Moved ${moved} to ${category} · ${failed} failed` : `Moved ${moved} to ${category}`, failed ? 'error' : 'success');
    setSelected(new Set());
    notifyChanged();
  };

  const bulkDelete = async () => {
    if (busy) return;
    setBusy(true);
    let deleted = 0;
    let failed = 0;
    for (const e of selectedRows()) {
      try {
        await expenseAPI.deleteExpense(e.id);
        deleted++;
      } catch {
        failed++;
      }
    }
    setBusy(false);
    show(failed ? `Deleted ${deleted} · ${failed} failed` : `Deleted ${deleted}`, failed ? 'error' : 'success');
    setSelected(new Set());
    setConfirmBulkDelete(false);
    notifyChanged();
  };

  const exportCSV = async () => {
    setExportOpen(false);
    const r = await expenseAPI.exportCSV(range.start, range.end);
    const url = URL.createObjectURL(new Blob([r.data]));
    const a = Object.assign(document.createElement('a'), { href: url, download: `expenses-${monthKey(month)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    setExportOpen(false);
    exportToPDF({ expenses: expenses.map((e) => ({ ...e, tags: e.tags?.map((t) => t.name) })), incomes, period: monthName(month) });
  };

  const allSelected = expenses.length > 0 && expenses.every((e) => selected.has(e.id));
  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const total = kind === 'income' ? incomes.reduce((s, i) => s + i.amount, 0) : expenses.reduce((s, e) => s + e.amount, 0);
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-[1920px]">
      <PageHeader title={kind === 'income' ? 'Income' : 'Expenses'}>
        <div className="flex items-center rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-zinc-900">
          <button className="p-1.5 text-blue-600 dark:text-blue-400" onClick={() => setParam({ month: monthKey(addMonths(month, -1)) })} title="Earlier"><ChevronLeft className="h-4 w-4" /></button>
          <span className="px-1 text-sm font-semibold">{monthName(month)}</span>
          <button className="p-1.5 text-blue-600 disabled:opacity-30 dark:text-blue-400" disabled={sameMonth(month, thisMonth)} onClick={() => setParam({ month: monthKey(addMonths(month, 1)) })} title="Later"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex rounded-lg bg-gray-200/70 p-0.5 text-xs font-semibold dark:bg-white/10">
          {(['expense', 'income'] as const).map((k) => (
            <button key={k} onClick={() => setParam({ kind: k === 'income' ? 'income' : null })} className={`rounded-md px-3 py-1 ${kind === k ? 'bg-white shadow-sm dark:bg-zinc-700' : 'text-gray-600 dark:text-gray-400'}`}>
              {k === 'income' ? 'Income' : 'Expenses'}
            </button>
          ))}
        </div>
        {kind === 'expense' && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className={`${control} flex items-center gap-1.5`}>
              <Search className="h-3.5 w-3.5 text-gray-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-36 bg-transparent focus:outline-none" />
            </label>
            <select className={control} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              {sortedCategories.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
            </select>
            <select className={control} value={paidFilter} onChange={(e) => setPaidFilter(e.target.value as '' | 'card' | 'cash')}>
              <option value="">Card and cash</option>
              <option value="card">Card</option>
              <option value="cash">Cash</option>
            </select>
            <div className="relative">
              <Button variant="ghost" onClick={() => setExportOpen(!exportOpen)} className="flex items-center gap-1.5"><Download className="h-3.5 w-3.5" />Export</Button>
              {exportOpen && (
                <div className="absolute right-0 z-10 mt-1 w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-zinc-900">
                  <button className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5" onClick={exportCSV}>CSV</button>
                  <button className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5" onClick={exportPDF}>PDF</button>
                </div>
              )}
            </div>
          </div>
        )}
      </PageHeader>
      {error && <LoadError onRetry={reload} />}

      {kind === 'expense' && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm dark:border-blue-500/20 dark:bg-blue-500/10">
          <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          {lastImport ? (
            <span><b>Last import: {lastImport.bank}, {lastImport.ago}</b><span className="text-gray-600 dark:text-gray-300"> · statement covered up to {day(lastImport.coveredUntil)}</span></span>
          ) : (
            <span className="text-gray-700 dark:text-gray-300">Import your bank statement to bring in card expenses.</span>
          )}
          <Link to="/expenses/import" className="ml-auto rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700">Import statement</Link>
        </div>
      )}

      {kind === 'expense' && selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-800">
          <b>{selectedRows().length} selected</b>
          <select disabled={busy} className="rounded-md bg-zinc-700 px-2 py-1 text-white" value="" onChange={(e) => e.target.value && bulkCategory(e.target.value)}>
            <option value="">Change category…</option>
            {sortedCategories.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
          </select>
          {confirmBulkDelete ? (
            <span className="flex items-center gap-2">Delete {selectedRows().length} for good?<Button variant="danger" onClick={bulkDelete}>Delete</Button><Button variant="ghost" onClick={() => setConfirmBulkDelete(false)}>Keep</Button></span>
          ) : (
            <button className="text-red-300 hover:underline" onClick={() => setConfirmBulkDelete(true)}>Delete</button>
          )}
          <button className="ml-auto text-gray-300 hover:underline" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      <Card className="overflow-x-auto p-2">
        {kind === 'expense' ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                <th className="w-8 px-2 py-2"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(expenses.map((e) => e.id)))} /></th>
                <th className="px-2 py-2 font-medium">Date</th>
                <th className="px-2 py-2 font-medium">Category</th>
                <th className="px-2 py-2 font-medium">Vendor</th>
                <th className="px-2 py-2 font-medium">Note</th>
                <th className="px-2 py-2 font-medium">Paid</th>
                <th className="px-2 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(withPending).map((e) => {
                const vendorId = e.vendor?.id ?? e.vendor_id;
                const options = vendors.filter((v) => v.category === e.category).sort((a, b) => a.name.localeCompare(b.name));
                return (
                  <tr key={e.id} onClick={() => openEditExpense(e)} className={`cursor-pointer border-t border-gray-100 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5 ${selected.has(e.id) ? 'bg-blue-50/60 dark:bg-blue-500/10' : ''}`}>
                    <td className="px-2 py-1.5" onClick={(ev) => ev.stopPropagation()}><input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} /></td>
                    <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{day(e.date)}</td>
                    <td className="px-2 py-1.5" onClick={(ev) => ev.stopPropagation()}>
                      <span className="flex items-center gap-1.5">
                        <CategoryIcon category={categoryByName(e.category)} size={20} />
                        <select className={cell} value={e.category} onChange={(ev) => changeCategory(e, ev.target.value)}>
                          {!categoryByName(e.category) && <option value={e.category}>{e.category}</option>}
                          {sortedCategories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </span>
                    </td>
                    <td className="px-2 py-1.5" onClick={(ev) => ev.stopPropagation()}>
                      <select className={cell} value={vendorId} onChange={(ev) => save(e, { vendor_id: Number(ev.target.value) }, 'Vendor changed')}>
                        {!options.some((v) => v.id === vendorId) && <option value={vendorId}>{e.vendor?.name ?? '—'}</option>}
                        {options.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </td>
                    <td className="max-w-xs truncate px-2 py-1.5 text-gray-600 dark:text-gray-300">{e.comment}</td>
                    <td className="px-2 py-1.5 text-gray-600 dark:text-gray-300">{e.payment_method === 'cash' ? 'cash' : 'card'}</td>
                    <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{eur(e.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Note</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {incomes.map((i) => (
                <tr key={i.id} onClick={() => openEditIncome(i)} className="cursor-pointer border-t border-gray-100 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5">
                  <td className="px-3 py-2 tabular-nums">{day(i.date)}</td>
                  <td className="px-3 py-2">{i.source}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{i.comment}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{eur(i.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {(kind === 'expense' ? expenses : incomes).length === 0 && !loading && <Quiet>{kind === 'income' ? 'No income this month.' : 'No expenses match.'}</Quiet>}
        <div className="flex justify-between border-t border-gray-100 px-3 pt-2 text-sm text-gray-500 dark:border-white/5 dark:text-gray-400">
          <span>{(kind === 'expense' ? expenses : incomes).length} {kind === 'income' ? 'entries' : 'expenses'}{kind === 'expense' ? ' · tick rows to change or delete several' : ''}</span>
          <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{eur(total)}</span>
        </div>
      </Card>
    </div>
  );
};

export default ExpensesPage;
