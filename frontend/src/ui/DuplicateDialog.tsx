import React from 'react';
import type { Expense } from '../api/client';
import { eur } from '../lib/format';
import { parseISODate } from '../lib/months';
import { Button } from './Card';

export interface DuplicatePair {
  incoming: { vendor?: string; amount: number; date: string; note?: string };
  existing: Expense;
}

const day = (iso: string) => parseISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/**
 * "This looks like an expense you already have": each new line next to the saved one,
 * with Skip / Add anyway. `decided` holds the choice per pair.
 */
const DuplicateDialog: React.FC<{
  pairs: DuplicatePair[];
  decided: Record<number, 'skip' | 'add'>;
  onDecide: (index: number, choice: 'skip' | 'add') => void;
  onDone: () => void;
  totalAdded?: number;
}> = ({ pairs, decided, onDecide, onDone, totalAdded }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-zinc-900">
      <div className="text-base font-bold text-gray-900 dark:text-white">
        ⚠ {pairs.length === 1 ? 'This looks like an expense you already have' : `${pairs.length} look like expenses you already have`}
      </div>
      {!!totalAdded && <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">The other {totalAdded} were added. Decide on these:</div>}
      <div className="mt-3 flex flex-col gap-3">
        {pairs.map((p, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-white/10">
            <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-500/10">
              <div className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">New</div>
              <div className="font-semibold text-gray-900 dark:text-white">{p.incoming.vendor ?? 'Expense'} · {eur(p.incoming.amount)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{day(p.incoming.date)}{p.incoming.note ? ` · ${p.incoming.note}` : ''}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 dark:bg-white/5">
              <div className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">Already in Expenso</div>
              <div className="font-semibold text-gray-900 dark:text-white">{p.existing.vendor?.name ?? p.existing.category} · {eur(p.existing.amount)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{day(p.existing.date)}{p.existing.comment ? ` · "${p.existing.comment}"` : ''}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Button variant={decided[i] === 'skip' ? 'primary' : 'ghost'} onClick={() => onDecide(i, 'skip')}>Skip</Button>
              <Button variant={decided[i] === 'add' ? 'danger' : 'ghost'} onClick={() => onDecide(i, 'add')}>Add anyway</Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        {pairs.length > 1 && <Button variant="ghost" onClick={() => pairs.forEach((_, i) => onDecide(i, 'skip'))}>Skip all</Button>}
        <Button onClick={onDone} disabled={pairs.some((_, i) => !decided[i])}>Done</Button>
      </div>
    </div>
  </div>
);

export default DuplicateDialog;
