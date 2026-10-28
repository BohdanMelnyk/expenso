import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, List, TrendingUp, Plus, Sun, Moon, Monitor, LogOut } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useAddPanel } from '../contexts/AddPanelContext';

const items = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/expenses', label: 'Expenses', icon: List, end: false },
  { to: '/wealth', label: 'Wealth', icon: TrendingUp, end: false },
];

/** Left menu; shrinks to icons on narrow windows. */
const Sidebar: React.FC = () => {
  const { mode, cycleMode } = useTheme();
  const { logout } = useAuth();
  const { openAdd } = useAddPanel();
  const ThemeIcon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;
  const themeLabel = mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System';

  return (
    <aside className="sticky top-0 flex h-screen w-16 flex-none flex-col border-r border-gray-200 bg-white px-2 py-4 dark:border-white/10 dark:bg-zinc-950 lg:w-52 lg:px-3">
      <div className="mb-6 px-2 text-lg font-extrabold tracking-tight text-gray-900 dark:text-white">
        <span className="lg:hidden">E</span>
        <span className="hidden lg:inline">Expenso</span>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5'
              }`
            }
          >
            <Icon className="h-4 w-4 flex-none" />
            <span className="hidden lg:inline">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="flex-1" />
      <button
        onClick={() => openAdd()}
        title="Add"
        className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden lg:inline">Add</span>
      </button>
      <div className="mt-3 flex flex-col gap-1 lg:flex-row lg:justify-between">
        <button onClick={cycleMode} title={`Theme: ${themeLabel}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5">
          <ThemeIcon className="h-4 w-4" />
          <span className="hidden lg:inline">{themeLabel}</span>
        </button>
        <button onClick={() => logout()} title="Log out" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5">
          <LogOut className="h-4 w-4" />
          <span className="hidden lg:inline">Log out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
