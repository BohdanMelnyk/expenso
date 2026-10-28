import React, { useState } from 'react';
import { X } from 'lucide-react';
import { createSnapshot, updateSnapshot, type CreateSnapshotRequest, type Snapshot } from '../../api/client';
import { eur, signedEur } from '../../lib/format';
import { toISODate } from '../../lib/months';
import { parseAmount } from '../../lib/draft';
import { SNAPSHOT_FIELDS, snapshotFieldText, type GroupName } from '../../lib/wealth';
import { Button } from '../../ui/Card';

type Values = Record<Exclude<keyof CreateSnapshotRequest, 'date'>, string>;

const fromSnapshot = (s?: Snapshot): Values =>
  Object.fromEntries(SNAPSHOT_FIELDS.map((f) => [f.key, s ? snapshotFieldText(s[f.key] ?? 0) : ''])) as Values;

/**
 * New snapshot (filled in with the latest one, so only what moved needs typing) or edit an existing one.
 * The live total converts AED and RSU shares at the rates of the latest snapshot.
 */
const SnapshotPanel: React.FC<{ editing?: Snapshot; latest?: Snapshot; onClose: () => void; onSaved: () => void }> = ({ editing, latest, onClose, onSaved }) => {
  const base = editing ?? latest;
  const [date, setDate] = useState(editing ? editing.date.slice(0, 10) : toISODate(new Date()));
  const [values, setValues] = useState<Values>(fromSnapshot(base));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (k: keyof Values) => parseAmount(values[k]) ?? 0;
  const aedRate = base && base.enbd_aed > 0 ? base.enbd_eur / base.enbd_aed : 0;
  const rsuPrice = base && base.careem_rsu_shares > 0 ? base.careem_rsu / base.careem_rsu_shares : 0;
  const total = SNAPSHOT_FIELDS.reduce((s, f) => {
    if (f.key === 'enbd_aed') return s + num(f.key) * aedRate;
    if (f.key === 'careem_rsu_shares') return s + num(f.key) * rsuPrice;
    return s + num(f.key);
  }, 0);
  const changed = (k: keyof Values) => !!base && Math.abs(num(k) - (base[k] ?? 0)) >= 0.005;

  const save = async () => {
    setSaving(true);
    setError(null);
    const request = { date, ...Object.fromEntries(SNAPSHOT_FIELDS.map((f) => [f.key, num(f.key)])) } as CreateSnapshotRequest;
    try {
      if (editing) await updateSnapshot(editing.id, request);
      else await createSnapshot(request);
      onSaved();
    } catch {
      setError("Couldn't save the snapshot.");
      setSaving(false);
    }
  };

  const groups: GroupName[] = ['Banks', 'Investments', 'Cash & PayPal'];
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex h-full w-full max-w-md flex-col gap-3 overflow-y-auto bg-white p-5 shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? 'Edit snapshot' : 'New snapshot'}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>
        {!base && <div className="text-sm text-gray-500 dark:text-gray-400">ENBD (AED) and Careem RSU shares are converted to euros when saved.</div>}
        {!editing && latest && <div className="text-sm text-gray-500 dark:text-gray-400">Filled in with {latest.date.slice(0, 10)}. Change only what moved.</div>}
        <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
          Date
          <input type="date" value={date} max={toISODate(new Date())} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 dark:border-white/10 dark:bg-zinc-800 dark:text-gray-100" />
        </label>
        {groups.map((g) => (
          <div key={g}>
            <div className="mb-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">{g}</div>
            <div className="grid grid-cols-2 gap-2">
              {SNAPSHOT_FIELDS.filter((f) => f.group === g).map((f) => (
                <label key={f.key} className="flex flex-col gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {f.label}
                  <input
                    inputMode="decimal"
                    value={values[f.key]}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    className={`rounded-lg border px-2.5 py-1.5 text-sm tabular-nums text-gray-900 dark:text-gray-100 ${changed(f.key) ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-500/10' : 'border-gray-200 bg-white dark:border-white/10 dark:bg-zinc-800'}`}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="flex-1" />
        {error && <div className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</div>}
        <div className="flex items-center justify-between">
          <span className="text-sm">
            Total <b className="tabular-nums">{eur(total)}</b>
            {base && <span className={`ml-2 font-semibold ${total - base.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{signedEur(total - base.total)}</span>}
          </span>
          <Button onClick={save} disabled={saving || !date}>{saving ? 'Saving…' : 'Save snapshot'}</Button>
        </div>
      </div>
    </div>
  );
};

export default SnapshotPanel;
