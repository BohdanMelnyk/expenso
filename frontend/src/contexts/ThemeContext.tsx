import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';
export type ThemeMode = Theme | 'system';

interface ThemeContextType {
  /** The theme in effect right now. */
  theme: Theme;
  /** What the user picked; 'system' follows the operating system. */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** light → dark → system → light */
  cycleMode: () => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const systemPrefersDark = () => !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

const readMode = (): ThemeMode => {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // Storage blocked: fall through to the system setting.
  }
  return 'system';
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(readMode);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const theme: Theme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('theme', mode);
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#000000' : '#f5f5f7');
    }
  }, [mode, theme]);

  const cycleMode = () => setMode((m) => (m === 'light' ? 'dark' : m === 'dark' ? 'system' : 'light'));
  const toggleTheme = () => setMode(theme === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, cycleMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
