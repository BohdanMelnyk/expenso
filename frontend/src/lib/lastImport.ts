// When the last bank statement was imported, kept in this browser only.

const KEY = 'expenso.lastImport';

interface LastImport {
  bank: string;
  /** ISO timestamp of the import. */
  at: string;
  /** Latest transaction date in the statement, yyyy-MM-dd. */
  coveredUntil: string;
}

export function saveLastImport(value: LastImport) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Not remembered; the strip just won't show it.
  }
}

/** The last import with a human "3 days ago", or null if unknown. */
export function readLastImport(now: Date = new Date()): (LastImport & { ago: string }) | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as LastImport;
    const at = new Date(value.at);
    // Calendar days, so last night counts as "yesterday".
    const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime()) / 86_400_000);
    const ago = days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
    return { ...value, ago };
  } catch {
    return null;
  }
}
