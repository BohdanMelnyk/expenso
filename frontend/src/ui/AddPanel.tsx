import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { expenseAPI, incomeAPI, type Expense, type Income } from '../api/client';
import { useAddPanel } from '../contexts/AddPanelContext';
import { useCatalog } from '../hooks/useCatalog';
import { applyParse, canSave, clearParsed, checkParseInput, Draft, editDraft, emptyDraft, parseAmount, PAYMENT_METHODS, saveTitle, toRequest } from '../lib/draft';
import { eur } from '../lib/format';
import { toISODate } from '../lib/months';
import { getPaymentMethodLabel } from '../utils/paymentMethod';
import { Button } from './Card';
import AmountInput from './AmountInput';
import DuplicateDialog from './DuplicateDialog';
import { useToaster } from './Toaster';

const field = 'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-zinc-800 dark:text-gray-100';
const today = () => toISODate(new Date());

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="grid grid-cols-[90px_1fr] items-center gap-3 border-b border-gray-100 py-2 last:border-0 dark:border-white/5">
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    {children}
  </label>
);

/** Right-hand panel to add an expense or income from one line, or edit one. */
const AddPanel: React.FC = () => {
  const { panel, close, notifyChanged } = useAddPanel();
  const { vendors, categories } = useCatalog();
  const { show } = useToaster();

  const editingExpense = panel.mode === 'editExpense' ? panel.expense : undefined;
  const editingIncome = panel.mode === 'editIncome' ? panel.income : undefined;
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [draft, setDraft] = useState<Draft>(emptyDraft(today(), 'b_haspa_credit'));
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [duplicates, setDuplicates] = useState<Expense[]>([]);
  const [decision, setDecision] = useState<Record<number, 'skip' | 'add'>>({});
  const [income, setIncome] = useState({ amount: '', source: 'Salary', note: '', date: today() });
  const [sources, setSources] = useState<string[]>(['Salary']);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Reset whenever the panel opens for something new.
  useEffect(() => {
    setError(null);
    setParseMessage(null);
    setPendingText(null);
    setConfirmDelete(false);
    setConfirmDiscard(false);
    setDuplicates([]);
    if (panel.mode === 'add') {
      setKind(panel.kind);
      setDraft(emptyDraft(today(), 'b_haspa_credit'));
      setIncome({ amount: '', source: 'Salary', note: '', date: today() });
      setTimeout(() => textRef.current?.focus(), 50);
    } else if (panel.mode === 'editExpense') {
      const e = panel.expense;
      setKind('expense');
      setDraft({ text: '', amount: e.amount, vendorId: e.vendor?.id ?? e.vendor_id, category: e.category, note: e.comment, paymentMethod: e.payment_method || 'cash', date: e.date.slice(0, 10), edited: ['amount', 'vendorId', 'category', 'note', 'paymentMethod', 'date'] });
    } else if (panel.mode === 'editIncome') {
      const i = panel.income;
      setKind('income');
      setIncome({ amount: String(i.amount), source: i.source, note: i.comment, date: i.date.slice(0, 10) });
    }
  }, [panel]);

  useEffect(() => {
    if (panel.mode === 'closed') return;
    incomeAPI
      .getIncomes()
      .then((r) => {
        const past = (r.data ?? []).map((i: Income) => i.source);
        setSources(Array.from(new Set(['Salary', ...past])));
      })
      .catch(() => {});
  }, [panel.mode]);

  // Parse 0.8 s after typing stops.
  useEffect(() => {
    if (pendingText === null) return;
    const text = pendingText;
    const check = checkParseInput(text);
    if (check !== 'ok') {
      setPendingText(null);
      if (check === 'short') setDraft((d) => (d.text === text ? clearParsed(d) : d));
      if (check === 'long') setParseMessage("That's too long to read. Keep it under 500 characters.");
      return;
    }
    const timer = setTimeout(() => {
      expenseAPI
        .parseExpense({ text: text.trim() })
        .then((r) => {
          setDraft((d) => applyParse(d, r.data, text, vendors, categories));
          if (draftRef.current.text === text) setParseMessage(r.data.amount === 0 ? "Couldn't read that. Fill in the fields below." : null);
        })
        .catch(() => {
          if (draftRef.current.text === text) setParseMessage("Couldn't read that. Fill in the fields below.");
        })
        .finally(() => setPendingText((p) => (p === text ? null : p)));
    }, 800);
    return () => clearTimeout(timer);
  }, [pendingText, vendors, categories]);

  const vendorOptions = useMemo(
    () => vendors.filter((v) => !draft.category || v.category.toLowerCase() === draft.category.toLowerCase()).sort((a, b) => a.name.localeCompare(b.name)),
    [vendors, draft.category]
  );

  if (panel.mode === 'closed') return null;

  const isEdit = panel.mode === 'editExpense' || panel.mode === 'editIncome';
  const edit = (patch: Partial<Omit<Draft, 'text' | 'edited'>>) => setDraft((d) => editDraft(d, patch, vendors));
  const incomeAmount = parseAmount(income.amount) ?? 0;
  const canSaveExpense = canSave(draft) && pendingText === null && !saving;
  const canSaveIncome = incomeAmount > 0 && income.source.trim() !== '' && !saving;

  const done = (message: string) => {
    show(message);
    notifyChanged();
    close();
  };
  const fail = (message: string) => {
    setSaving(false);
    setError(message);
  };

  const createExpense = () =>
    expenseAPI
      .createExpense(toRequest(draft))
      .then(() => done(`Saved ${eur(draft.amount)}`))
      .catch(() => fail("Couldn't save the expense."));

  const saveExpense = async () => {
    setSaving(true);
    setError(null);
    if (editingExpense) {
      expenseAPI.updateExpense(editingExpense.id, toRequest(draft)).then(() => done('Saved')).catch(() => fail("Couldn't save the changes."));
      return;
    }
    try {
      const found = (await expenseAPI.checkDuplicates(draft.amount, draft.date, 2)).data ?? [];
      const matches = found.filter((e) => Math.abs(e.amount - draft.amount) < 0.01);
      if (matches.length > 0) {
        setDuplicates(matches.slice(0, 1));
        setDecision({});
        setSaving(false);
        return;
      }
    } catch {
      // Without the check we can't promise this isn't a duplicate.
      fail("Couldn't check for duplicates. Try again in a moment.");
      return;
    }
    createExpense();
  };

  const saveIncome = () => {
    setSaving(true);
    setError(null);
    const request = { amount: incomeAmount, date: income.date, source: income.source.trim(), comment: income.note.trim() };
    const call = editingIncome ? incomeAPI.updateIncome(editingIncome.id, request) : incomeAPI.createIncome(request);
    call.then(() => done(`Saved ${eur(incomeAmount)} income`)).catch(() => fail("Couldn't save the income."));
  };

  const remove = () => {
    setSaving(true);
    const call = editingExpense ? expenseAPI.deleteExpense(editingExpense.id) : editingIncome ? incomeAPI.deleteIncome(editingIncome.id) : null;
    call?.then(() => done('Deleted')).catch(() => fail("Couldn't delete it."));
  };

  // Anything typed or changed since the panel opened.
  const dirty = isEdit
    ? panel.mode === 'editExpense'
      ? draft.amount !== panel.expense.amount || draft.note !== panel.expense.comment || draft.category !== panel.expense.category || draft.date !== panel.expense.date.slice(0, 10) || draft.paymentMethod !== panel.expense.payment_method || draft.vendorId !== (panel.expense.vendor?.id ?? panel.expense.vendor_id)
      : panel.mode === 'editIncome' && (income.amount !== String(panel.income.amount) || income.source !== panel.income.source || income.note !== panel.income.comment)
    : draft.text.trim() !== '' || draft.edited.length > 0 || income.amount.trim() !== '';
  const askClose = () => (dirty && !saving ? setConfirmDiscard(true) : close());

  const title = isEdit ? (kind === 'income' ? 'Edit income' : 'Edit expense') : 'New entry';
  const saveLabel = kind === 'income' ? (incomeAmount > 0 ? `Save ${eur(incomeAmount)} income` : 'Save') : saveTitle(draft, vendors);
  const vendorName = vendors.find((v) => v.id === draft.vendorId)?.name;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onMouseDown={(e) => e.target === e.currentTarget && askClose()} onKeyDown={(e) => e.key === 'Escape' && askClose()}>
      <div className="flex h-full w-full max-w-md flex-col gap-3 overflow-y-auto bg-white p-5 shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={askClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10" title="Close (Esc)"><X className="h-5 w-5" /></button>
        </div>

        {!isEdit && (
          <div className="flex rounded-lg bg-gray-100 p-0.5 text-sm font-semibold dark:bg-white/5">
            {(['expense', 'income'] as const).map((k) => (
              <button key={k} onClick={() => setKind(k)} className={`flex-1 rounded-md py-1.5 capitalize ${kind === k ? 'bg-white shadow-sm dark:bg-zinc-700 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                {k}
              </button>
            ))}
          </div>
        )}

        {kind === 'expense' ? (
          <>
            {!isEdit && (
              <>
                <textarea
                  ref={textRef}
                  rows={2}
                  value={draft.text}
                  placeholder="rewe 23.40 groceries"
                  onChange={(e) => {
                    const text = e.target.value;
                    setDraft((d) => ({ ...d, text }));
                    setParseMessage(null);
                    setPendingText(text);
                  }}
                  className={`${field} resize-none border-blue-500 text-base`}
                />
                {parseMessage && <div className="text-xs text-gray-500 dark:text-gray-400">{parseMessage}</div>}
              </>
            )}
            <div className={`rounded-xl border border-gray-200 px-3 dark:border-white/10 ${pendingText !== null ? 'animate-pulse' : ''}`}>
              <Row label="Amount">
                <AmountInput className={field} value={draft.amount} onChange={(amount) => edit({ amount })} />
              </Row>
              <Row label="Category">
                <select className={field} value={draft.category ?? ''} onChange={(e) => edit({ category: e.target.value || undefined })}>
                  <option value="">Choose…</option>
                  {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                    <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </Row>
              <Row label="Vendor">
                <div className="flex items-center gap-2">
                  <select className={field} value={draft.vendorId ?? ''} onChange={(e) => {
                    const v = vendors.find((x) => x.id === Number(e.target.value));
                    edit(v ? { vendorId: v.id, ...(draft.category ? {} : { category: v.category }) } : { vendorId: undefined });
                  }}>
                    <option value="">Choose…</option>
                    {vendorOptions.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  {vendorName && !draft.edited.includes('vendorId') && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">matched</span>}
                </div>
              </Row>
              <Row label="Note">
                <input className={field} value={draft.note} onChange={(e) => edit({ note: e.target.value })} />
              </Row>
              <Row label="Paid with">
                <select className={field} value={draft.paymentMethod} onChange={(e) => edit({ paymentMethod: e.target.value })}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{getPaymentMethodLabel(m)}</option>)}
                </select>
              </Row>
              <Row label="Date">
                <input type="date" className={field} value={draft.date} max={today()} onChange={(e) => edit({ date: e.target.value })} />
              </Row>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-gray-200 px-3 dark:border-white/10">
            <Row label="Amount">
              <input className={`${field} text-base font-semibold`} inputMode="decimal" value={income.amount} onChange={(e) => setIncome({ ...income, amount: e.target.value })} placeholder="0,00" autoFocus />
            </Row>
            <Row label="Source">
              <div>
                <input className={field} value={income.source} list="income-sources" onChange={(e) => setIncome({ ...income, source: e.target.value })} />
                <datalist id="income-sources">{sources.map((s) => <option key={s} value={s} />)}</datalist>
              </div>
            </Row>
            <Row label="Note">
              <input className={field} value={income.note} onChange={(e) => setIncome({ ...income, note: e.target.value })} />
            </Row>
            <Row label="Date">
              <input type="date" className={field} value={income.date} onChange={(e) => setIncome({ ...income, date: e.target.value })} />
            </Row>
          </div>
        )}

        <div className="flex-1" />
        {confirmDiscard && (
          <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm dark:bg-amber-500/10">
            <span>Discard what you typed?</span>
            <div className="flex gap-2"><Button variant="ghost" onClick={() => setConfirmDiscard(false)}>Keep editing</Button><Button variant="danger" onClick={close}>Discard</Button></div>
          </div>
        )}
        {error && <div className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</div>}
        {isEdit && (
          confirmDelete ? (
            <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm dark:bg-red-500/10">
              <span className="text-red-700 dark:text-red-300">Delete for good?</span>
              <div className="flex gap-2"><Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep</Button><Button variant="danger" onClick={remove}>Delete</Button></div>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-sm font-semibold text-red-600 hover:underline dark:text-red-400">Delete</button>
          )
        )}
        <Button className="py-3 text-base" disabled={kind === 'expense' ? !canSaveExpense : !canSaveIncome} onClick={kind === 'expense' ? saveExpense : saveIncome}>
          {saving ? 'Saving…' : saveLabel}
        </Button>
      </div>

      {duplicates.length > 0 && (
        <DuplicateDialog
          pairs={duplicates.map((existing) => ({ incoming: { vendor: vendorName, amount: draft.amount, date: draft.date, note: draft.note }, existing }))}
          decided={decision}
          onDecide={(i, c) => setDecision((d) => ({ ...d, [i]: c }))}
          onDone={() => {
            const add = decision[0] === 'add';
            setDuplicates([]);
            if (add) {
              setSaving(true);
              createExpense();
            } else {
              show('Not saved: it’s already in Expenso', 'info');
              close();
            }
          }}
        />
      )}
    </div>
  );
};

export default AddPanel;
