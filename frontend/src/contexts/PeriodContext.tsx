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

// Namespaced (not just "period") because a few drill-down pages
// (CategoryStatistics, VendorStatistics, VendorTypeStatistics) already own an
// unrelated "period" query param with a different set of values; sharing the
// key would let this global picker clobber those pages' local filter.
const PERIOD_PARAM = 'globalPeriod';
const DEFAULT_PERIOD: Period = 'current_month';

export const PeriodProvider: React.FC<PeriodProviderProps> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParam = searchParams.get(PERIOD_PARAM);
  const [period, setPeriodState] = useState<Period>(
    initialParam && isValidPeriod(initialParam) ? initialParam : DEFAULT_PERIOD
  );

  // The period is shared, URL-driven state: every route should carry it in
  // its query string so it survives tab switches, refreshes, and shared
  // links. If the URL already has a valid value, adopt it; otherwise (e.g.
  // right after navigating to a route that doesn't carry the param yet)
  // write the current period back in rather than resetting to the default.
  useEffect(() => {
    const paramPeriod = searchParams.get(PERIOD_PARAM);
    if (paramPeriod && isValidPeriod(paramPeriod)) {
      if (paramPeriod !== period) {
        setPeriodState(paramPeriod);
      }
    } else {
      setSearchParams(
        (prev) => {
          prev.set(PERIOD_PARAM, period);
          return prev;
        },
        { replace: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setPeriod = (newPeriod: Period) => {
    setPeriodState(newPeriod);
    setSearchParams((prev) => {
      prev.set(PERIOD_PARAM, newPeriod);
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
