import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, Loader } from 'lucide-react';
import { bankImportAPI, expenseAPI, type Expense } from '../api/client';
import type { BankImportPreview } from '../types/bankImport';
import { useCatalog } from '../hooks/useCatalog';
import { useAddPanel } from '../contexts/AddPanelContext';
import { canSave, editDraft, toRequest, type Draft } from '../lib/draft';
import { splitByDuplicates, toRows, type ImportRow } from '../lib/importRows';
import { saveLastImport } from '../lib/lastImport';
import { eur } from '../lib/format';
import { monthKey, parseISODate } from '../lib/months';
import { Button, Card, PageHeader, Quiet } from '../ui/Card';
import AmountInput from '../ui/AmountInput';
import DuplicateDialog from '../ui/DuplicateDialog';
import { useToaster } from '../ui/Toaster';

const cell = 'rounded-md border border-gray-200 bg-white px-1.5 py-1 text-sm dark:border-white/10 dark:bg-zinc-800';
const day = (iso: string) => parseISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** Bank statement → one editable table → add, with the duplicate check at the moment of adding. */
const ImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { vendors, categories } = useCatalog();
  const { notifyChanged } = useAddPanel();
  const { show } = useToaster();
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [reading, setReading] = useState(false);
  const [adding, setAdding] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState<{ row: ImportRow; existing: Expense }[]>([]);
  const [decision, setDecision] = useState<Record<number, 'skip' | 'add'>>({});
  const [result, setResult] = useState({ added: 0, skipped: 0, failed: 0 });
  const [deciding, setDeciding] = useState(false);
  /** Set by Cancel; running loops stop at the next row. */
  const cancelled = useRef(false);
  const [dragging, setDragging] = useState(false);
  /** Latest transaction date in the statement, for "covered up to". */
  const [coveredUntil, setCoveredUntil] = useState('');

  const ticked = rows.filter((r) => r.ticked);
  const incomplete = ticked.filter((r) => !canSave(r.draft)).length;
  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.name.localeCompare(b.name)), [categories]);

  const read = async (file: File) => {
    setFileName(file.name);
    setReading(true);
    setError(null);
    setRows([]);
    setHeld([]);
    setDecision({});
    setResult({ added: 0, skipped: 0, failed: 0 });
    try {
      const r = await bankImportAPI.uploadBankCSV(file);
      const txs = (r.data as BankImportPreview).transactions ?? [];
      setRows(toRows(txs, vendors, categories));
      setCoveredUntil(txs.map((t) => t.transaction_date.slice(0, 10)).sort().pop() ?? '');
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Couldn't read that file. Is it a Haspa credit card CSV?");
    } finally {
      setReading(false);
    }
  };

  const update = (index: number, patch: Partial<Omit<Draft, 'text' | 'edited'>>) =>
    setRows((rs) => rs.map((r) => (r.index === index ? { ...r, draft: editDraft(r.draft, patch, vendors) } : r)));
  const tick = (index: number, value: boolean) => setRows((rs) => rs.map((r) => (r.index === index ? { ...r, ticked: value } : r)));

  const post = (row: ImportRow) => bankImportAPI.confirmBankTransaction({ transaction_data: row.tx, expense_data: toRequest(row.draft) });

  const finish = (added: number, skipped: number) => {
    const covered = coveredUntil;
    saveLastImport({ bank: 'Haspa', at: new Date().toISOString(), coveredUntil: covered });
    notifyChanged();
    show(`Added ${added}${skipped ? ` · skipped ${skipped}` : ''}`);
    navigate(`/expenses?month=${covered ? monthKey(parseISODate(covered)) : ''}`);
  };

  const add = async () => {
    setError(null);
    cancelled.current = false;
    setAdding({ done: 0, total: ticked.length });
    const found = new Map<number, Expense[]>();
    for (const row of ticked) {
      if (cancelled.current) return;
      try {
        found.set(row.index, (await expenseAPI.checkDuplicates(row.draft.amount, row.draft.date, 2)).data ?? []);
      } catch {
        // Without the check we can't promise no duplicates, so nothing is added.
        setAdding(null);
        setError("Couldn't check for duplicates, so nothing was added. Try again in a moment.");
        return;
      }
    }
    const split = splitByDuplicates(rows, found);
    let added = 0;
    const posted = new Set<number>();
    for (const row of split.clear) {
      if (cancelled.current) return;
      try {
        await post(row);
        posted.add(row.index);
        added++;
      } catch {
        // Not added; the row stays ticked for another try.
      }
      setAdding({ done: added, total: ticked.length });
    }
    setAdding(null);
    const failed = split.clear.length - added;
    if (failed > 0) setError(`${failed} couldn't be added. They're still ticked below.`);
    // Only rows that were saved leave the table.
    setRows((rs) => rs.filter((r) => !posted.has(r.index)));
    setResult({ added, skipped: 0, failed });
    if (split.held.length > 0) {
      setHeld(split.held);
      setDecision({});
    } else if (failed === 0) {
      finish(added, 0);
    }
  };

  const decide = async () => {
    if (deciding) return;
    setDeciding(true);
    const decided = held;
    setHeld([]);
    let added = result.added;
    let failed = result.failed;
    const posted = new Set<number>();
    const skipped = new Set<number>();
    for (let i = 0; i < decided.length; i++) {
      const { row } = decided[i];
      if (decision[i] !== 'add') {
        skipped.add(row.index);
        continue;
      }
      try {
        await post(row);
        posted.add(row.index);
        added++;
      } catch {
        failed++;
      }
    }
    setDeciding(false);
    if (failed > 0) {
      // Stay so the failed rows can be tried again; skipped and saved ones leave the table.
      setRows((rs) => rs.filter((r) => !posted.has(r.index) && !skipped.has(r.index)));
      setResult({ added, skipped: 0, failed: 0 });
      setError(`Added ${added}. ${failed} couldn't be added and are still ticked below.`);
      notifyChanged();
      return;
    }
    finish(added, skipped.size);
  };

  return (
    <div className="mx-auto max-w-[1920px]">
      <PageHeader title="Import statement">
        {fileName && <span className="text-sm text-gray-500 dark:text-gray-400">{fileName} · {rows.length} lines</span>}
        {rows.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            {incomplete > 0 && <span className="text-xs text-amber-600 dark:text-amber-400">{incomplete} ticked without vendor or category</span>}
            <Button
              variant="ghost"
              onClick={() => {
                cancelled.current = true;
                if (adding) notifyChanged();
                navigate('/expenses');
              }}
            >
              {adding ? 'Stop' : 'Cancel'}
            </Button>
            <Button disabled={ticked.length === 0 || incomplete > 0 || !!adding} onClick={add}>
              {adding ? `Adding ${adding.done}/${adding.total}…` : `Add ${ticked.length} expense${ticked.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        )}
      </PageHeader>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

      {rows.length === 0 && (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) read(f); }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-16 text-center ${dragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-gray-300 bg-white dark:border-white/15 dark:bg-zinc-900'}`}
        >
          {reading ? <Loader className="h-8 w-8 animate-spin text-blue-600" /> : <FileUp className="h-8 w-8 text-blue-600" />}
          <div className="font-semibold">{reading ? 'Reading the statement… each line is matched to a vendor, this can take a minute.' : 'Drop the Haspa credit card CSV here, or click to choose it'}</div>
          <input type="file" accept=".csv,text/csv" className="hidden" disabled={reading} onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
        </label>
      )}

      {rows.length > 0 && (
        <Card className="overflow-x-auto p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                <th className="w-8 px-2 py-2"><input type="checkbox" checked={rows.filter((r) => !r.incoming).every((r) => r.ticked)} onChange={(e) => setRows((rs) => rs.map((r) => (r.incoming ? r : { ...r, ticked: e.target.checked })))} /></th>
                <th className="px-2 py-2 font-medium">Date</th>
                <th className="px-2 py-2 font-medium">Bank text</th>
                <th className="px-2 py-2 font-medium">Category</th>
                <th className="px-2 py-2 font-medium">Vendor</th>
                <th className="px-2 py-2 font-medium">Note</th>
                <th className="px-2 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.index} className={`border-t border-gray-100 dark:border-white/5 ${r.ticked ? '' : 'opacity-50'}`}>
                  <td className="px-2 py-1.5"><input type="checkbox" checked={r.ticked} disabled={r.incoming} title={r.incoming ? 'Incoming money isn’t an expense' : undefined} onChange={(e) => tick(r.index, e.target.checked)} /></td>
                  <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{day(r.draft.date)}</td>
                  <td className="max-w-[16rem] truncate px-2 py-1.5 text-gray-500 dark:text-gray-400" title={r.tx.merchant}>{r.tx.merchant}{r.tx.location ? ` · ${r.tx.location}` : ''}</td>
                  {r.incoming ? (
                    <td colSpan={3} className="px-2 py-1.5 text-gray-500 dark:text-gray-400">Incoming money, not an expense</td>
                  ) : (
                    <>
                      <td className="px-2 py-1.5">
                        <select className={cell} value={r.draft.category ?? ''} onChange={(e) => update(r.index, { category: e.target.value || undefined })}>
                          <option value="">Choose…</option>
                          {sortedCategories.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select className={cell} value={r.draft.vendorId ?? ''} onChange={(e) => update(r.index, { vendorId: e.target.value ? Number(e.target.value) : undefined })}>
                          <option value="">Choose…</option>
                          {vendors.filter((v) => v.category === r.draft.category).sort((a, b) => a.name.localeCompare(b.name)).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5"><input className={`${cell} w-full min-w-[8rem]`} value={r.draft.note} onChange={(e) => update(r.index, { note: e.target.value })} /></td>
                    </>
                  )}
                  <td className="px-2 py-1.5 text-right">
                    {r.incoming ? (
                      <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">+{eur(r.tx.booking_amount)}</span>
                    ) : (
                      <AmountInput className={`${cell} w-24 text-right font-semibold tabular-nums`} value={r.draft.amount} onChange={(amount) => update(r.index, { amount })} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <Quiet>Nothing to import.</Quiet>}
        </Card>
      )}

      {held.length > 0 && (
        <DuplicateDialog
          pairs={held.map(({ row, existing }) => ({
            incoming: { vendor: vendors.find((v) => v.id === row.draft.vendorId)?.name ?? row.tx.merchant, amount: row.draft.amount, date: row.draft.date, note: row.draft.note },
            existing,
          }))}
          decided={decision}
          onDecide={(i, c) => setDecision((d) => ({ ...d, [i]: c }))}
          onDone={decide}
          totalAdded={result.added}
        />
      )}
    </div>
  );
};

export default ImportPage;
