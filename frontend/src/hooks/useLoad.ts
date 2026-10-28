import { useCallback, useEffect, useRef, useState } from 'react';
import { useReloadOnChange } from '../contexts/AddPanelContext';

/**
 * Runs `load` whenever `key` changes and whenever data is saved anywhere.
 * Results of older runs are dropped.
 */
export function useLoad<T>(load: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const run = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(() => {
    const id = ++run.current;
    setLoading(true);
    loadRef
      .current()
      .then((d) => {
        if (id !== run.current) return;
        setData(d);
        setError(false);
      })
      .catch(() => id === run.current && setError(true))
      .finally(() => id === run.current && setLoading(false));
  }, []);

  useEffect(() => {
    // A new range: don't show the old range's numbers under the new title.
    setData(null);
    setError(false);
    reload();
  }, [key, reload]);
  useReloadOnChange(reload);
  return { data, error, loading, reload };
}
