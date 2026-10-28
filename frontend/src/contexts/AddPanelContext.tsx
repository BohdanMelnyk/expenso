import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Expense, Income } from '../api/client';

export type PanelState =
  | { mode: 'closed' }
  | { mode: 'add'; kind: 'expense' | 'income' }
  | { mode: 'editExpense'; expense: Expense }
  | { mode: 'editIncome'; income: Income };

interface AddPanelContextType {
  panel: PanelState;
  openAdd: (kind?: 'expense' | 'income') => void;
  openEditExpense: (expense: Expense) => void;
  openEditIncome: (income: Income) => void;
  close: () => void;
  /** Tell every page that data changed, so they reload. */
  notifyChanged: () => void;
  /** Bumps on every change; pages reload when it moves. */
  version: number;
}

const AddPanelContext = createContext<AddPanelContextType | undefined>(undefined);

export const useAddPanel = () => {
  const context = useContext(AddPanelContext);
  if (!context) throw new Error('useAddPanel must be used within an AddPanelProvider');
  return context;
};

/** Runs `reload` when anything is saved, edited or deleted anywhere. */
export const useReloadOnChange = (reload: () => void) => {
  const { version } = useAddPanel();
  const first = useRef(true);
  const latest = useRef(reload);
  latest.current = reload;
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    latest.current();
  }, [version]);
};

export const AddPanelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [panel, setPanel] = useState<PanelState>({ mode: 'closed' });
  const [version, setVersion] = useState(0);

  const openAdd = useCallback((kind: 'expense' | 'income' = 'expense') => setPanel({ mode: 'add', kind }), []);
  const openEditExpense = useCallback((expense: Expense) => setPanel({ mode: 'editExpense', expense }), []);
  const openEditIncome = useCallback((income: Income) => setPanel({ mode: 'editIncome', income }), []);
  const close = useCallback(() => setPanel({ mode: 'closed' }), []);
  const notifyChanged = useCallback(() => setVersion((v) => v + 1), []);

  return (
    <AddPanelContext.Provider value={{ panel, openAdd, openEditExpense, openEditIncome, close, notifyChanged, version }}>
      {children}
    </AddPanelContext.Provider>
  );
};
