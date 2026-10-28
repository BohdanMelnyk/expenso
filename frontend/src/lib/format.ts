const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const euroWhole = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/** "4.768,91 €" */
export const eur = (n: number) => euro.format(n);

/** "4.769 €", for headline numbers. */
export const eurShort = (n: number) => euroWhole.format(n);

/** "+3.081 €" / "−410 €" */
export const signedEur = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + euroWhole.format(Math.abs(n));

export type Tone = 'good' | 'bad' | 'neutral';

/** A spending change: up is bad, down is good, under 1% is nothing. */
export function changeLabel(change: number | null): { text: string; tone: Tone } | null {
  if (change === null || !Number.isFinite(change)) return null;
  if (Math.abs(change) < 0.01) return { text: '0%', tone: 'neutral' };
  const percent = Math.round(Math.abs(change) * 100);
  return change > 0 ? { text: `+${percent}%`, tone: 'bad' } : { text: `−${percent}%`, tone: 'good' };
}

export const toneClass: Record<Tone, string> = {
  good: 'text-emerald-600 dark:text-emerald-400',
  bad: 'text-red-600 dark:text-red-400',
  neutral: 'text-gray-500 dark:text-gray-400',
};
