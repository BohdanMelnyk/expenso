import React, { useEffect, useState } from 'react';
import { fetchSnapshots, createSnapshot, Snapshot, CreateSnapshotRequest } from '../api/client';

const RESOURCES: { key: keyof Omit<CreateSnapshotRequest, 'date' | 'careem_rsu_shares' | 'enbd_aed'>; label: string }[] = [
  { key: 'haspa', label: 'Haspa' },
  { key: 'n26_b', label: 'N26 B' },
  { key: 'n26_m', label: 'N26 M' },
  { key: 'cash', label: 'Cash' },
  { key: 'uber_stocks', label: 'Uber Stocks' },
  { key: 'scalable_capital', label: 'Scalable Capital' },
  { key: 'mono_b', label: 'Mono B' },
  { key: 'mono_m', label: 'Mono M' },
  { key: 'paypal_b', label: 'PayPal B' },
  { key: 'paypal_m', label: 'PayPal M' },
  { key: 'backup_cash', label: 'Backup Cash' },
];

const CAREEM_RSU_PRICE_USD = 5.5;
const CAREEM_RSU_USD_TO_EUR = 0.86;
const careemRSUValue = (shares: number) => shares * CAREEM_RSU_PRICE_USD * CAREEM_RSU_USD_TO_EUR;

const AED_TO_EUR = 0.24;
const enbdEURValue = (aed: number) => aed * AED_TO_EUR;

const emptyForm = (): CreateSnapshotRequest => ({
  date: new Date().toISOString().split('T')[0],
  haspa: 0, n26_b: 0, n26_m: 0, cash: 0,
  uber_stocks: 0, scalable_capital: 0,
  mono_b: 0, mono_m: 0,
  paypal_b: 0, paypal_m: 0, backup_cash: 0,
  careem_rsu_shares: 0,
  enbd_aed: 0,
});

export default function Snapshots() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [form, setForm] = useState<CreateSnapshotRequest>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSnapshots().then(setSnapshots).catch(() => setError('Failed to load snapshots'));
  }, []);

  const handleChange = (key: keyof CreateSnapshotRequest, value: string) => {
    setForm(prev => ({ ...prev, [key]: key === 'date' ? value : parseFloat(value) || 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await createSnapshot(form);
      setSnapshots(prev => [created, ...prev]);
      setForm(emptyForm());
    } catch {
      setError('Failed to save snapshot');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Money Snapshots</h1>

      {/* Add form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">New Snapshot</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => handleChange('date', e.target.value)}
              required
              className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {RESOURCES.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</label>
              <input
                type="number"
                step="0.01"
                value={(form[key] as number) || ''}
                onChange={e => handleChange(key, e.target.value)}
                placeholder="0.00"
                className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Careem RSU (shares)</label>
            <input
              type="number"
              step="1"
              min="0"
              value={form.careem_rsu_shares || ''}
              onChange={e => handleChange('careem_rsu_shares', e.target.value)}
              placeholder="0"
              className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {form.careem_rsu_shares > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                ≈ €{careemRSUValue(form.careem_rsu_shares).toFixed(2)} ({form.careem_rsu_shares} × $5.50 × 0.86)
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300">ENBD (AED)</label>
            <input
              type="number"
              step="0.01"
              value={form.enbd_aed || ''}
              onChange={e => handleChange('enbd_aed', e.target.value)}
              placeholder="0.00"
              className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {form.enbd_aed > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                ≈ €{enbdEURValue(form.enbd_aed).toFixed(2)} ({form.enbd_aed} AED × {AED_TO_EUR})
              </span>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
        >
          {saving ? 'Saving…' : 'Save Snapshot'}
        </button>
      </form>

      {/* History table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b dark:border-gray-700">
              <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Date</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Total</th>
              {RESOURCES.map(({ key, label }) => (
                <th key={key} className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{label}</th>
              ))}
              <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Careem RSU</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">ENBD (AED)</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">ENBD (EUR)</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.length === 0 && (
              <tr>
                <td colSpan={16} className="px-4 py-8 text-center text-gray-400">No snapshots yet</td>
              </tr>
            )}
            {snapshots.map(s => (
              <tr key={s.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                <td className="px-4 py-3 text-gray-800 dark:text-gray-200 whitespace-nowrap">{s.date}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                  {s.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                {RESOURCES.map(({ key }) => (
                  <td key={key} className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {(s[key as keyof Snapshot] as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap" title={`${s.careem_rsu_shares} shares`}>
                  {s.careem_rsu.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {s.enbd_aed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {s.enbd_eur.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
