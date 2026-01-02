import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export type Period = 'current_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'current_year' | 'all_time';

interface PeriodContextType {
  period: Period;
  setPeriod: (period: Period) => void;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

export const usePeriod = () => {
  const context = useContext(PeriodContext);
  if (context === undefined) {
    throw new Error('usePeriod must be used within a PeriodProvider');
  }
  return context;
};

interface PeriodProviderProps {
  children: React.ReactNode;
}

export const PeriodProvider: React.FC<PeriodProviderProps> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [period, setPeriodState] = useState<Period>('current_month');

  // Initialize period from URL params or default
  useEffect(() => {
    const paramPeriod = searchParams.get('period') as Period | null;
    if (paramPeriod && isValidPeriod(paramPeriod)) {
      setPeriodState(paramPeriod);
    } else {
      setPeriodState('current_month');
    }
  }, [searchParams]);

  const setPeriod = (newPeriod: Period) => {
    setPeriodState(newPeriod);
    // Update URL params
    setSearchParams((prev) => {
      prev.set('period', newPeriod);
      return prev;
    });
  };

  return (
    <PeriodContext.Provider value={{ period, setPeriod }}>
      {children}
    </PeriodContext.Provider>
  );
};

function isValidPeriod(value: string): value is Period {
  const validPeriods: Period[] = [
    'current_month',
    'last_month',
    'last_3_months',
    'last_6_months',
    'current_year',
    'all_time'
  ];
  return validPeriods.includes(value as Period);
}
