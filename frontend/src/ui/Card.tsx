import React from 'react';
import type { Category } from '../api/client';
import { changeLabel, toneClass } from '../lib/format';

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`rounded-xl border border-gray-200/70 bg-white p-4 dark:border-white/10 dark:bg-zinc-900 ${className}`}>{children}</div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div className="mb-3 flex items-center justify-between gap-2">
    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{children}</h2>
    {right && <div className="text-xs text-gray-500 dark:text-gray-400">{right}</div>}
  </div>
);

export const StatCard: React.FC<{ label: string; value: string; sub?: React.ReactNode; tone?: 'good' | 'bad' }> = ({ label, value, sub, tone }) => (
  <Card>
    <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    <div className={`mt-1 text-2xl font-bold tracking-tight tabular-nums ${tone ? toneClass[tone] : 'text-gray-900 dark:text-gray-50'}`}>{value}</div>
    {sub && <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</div>}
  </Card>
);

export const ChangeBadge: React.FC<{ change: number | null; className?: string }> = ({ change, className = '' }) => {
  const label = changeLabel(change);
  if (!label) return null;
  return <span className={`text-xs font-semibold tabular-nums ${toneClass[label.tone]} ${className}`}>{label.text}</span>;
};

/** The category's emoji on its colour at low opacity; grey box for unknown categories. */
export const CategoryIcon: React.FC<{ category?: Category; size?: number }> = ({ category, size = 24 }) => (
  <span
    className="inline-flex flex-none items-center justify-center rounded-md"
    style={{
      width: size,
      height: size,
      fontSize: size * 0.55,
      background: category?.color ? `${category.color}26` : 'rgba(142,142,147,.18)',
    }}
  >
    {category?.icon || '📦'}
  </span>
);

export const Quiet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{children}</div>
);

export const PageHeader: React.FC<{ title: React.ReactNode; children?: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-5 flex flex-wrap items-center gap-3">
    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">{title}</h1>
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }> = ({
  variant = 'primary',
  className = '',
  ...props
}) => {
  const styles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-600/40',
    ghost: 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-white/15 dark:bg-zinc-900 dark:text-gray-100 dark:hover:bg-zinc-800',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[variant];
  return <button {...props} className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${styles} ${className}`} />;
};
