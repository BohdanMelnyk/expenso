import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { PlusCircle, BarChart3, Home, TrendingDown, TrendingUp, Wallet, Menu, X, Calculator } from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import Dashboard from './components/Dashboard';
import AddExpense from './components/AddExpense';
import Statistics from './components/Statistics';
import Trends from './components/Trends';
import CategoryStatistics from './components/CategoryStatistics';
import VendorTypeStatistics from './components/VendorTypeStatistics';
import VendorStatistics from './components/VendorStatistics';
import CashFlow from './components/CashFlow';
import BalanceDashboard from './components/BalanceDashboard';
import ExpenseOverview from './components/ExpenseOverview';
import IncomeOverview from './components/IncomeOverview';
import AverageExpenses from './components/AverageExpenses';

function Navigation() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    const baseClass = "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors";
    if (isActive) {
      return `${baseClass} bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700`;
    }
    return `${baseClass} text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800`;
  };

  const getSpecialNavLinkClass = (basePath: string) => ({ isActive }: { isActive: boolean }) => {
    const baseClass = "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors";
    // Check if we're on the base path or any sub-page
    let isOnRelatedPage = false;

    // Special handling for root path to avoid matching all paths
    if (basePath === '/') {
      isOnRelatedPage = location.pathname === '/' || location.pathname.startsWith('/statistics/');
    } else {
      isOnRelatedPage = location.pathname.startsWith(basePath);
    }

    // Special cases for related pages. E.g., Vendor stats should highlight Balance tab.
    if (basePath === '/balance' && location.pathname.startsWith('/vendor/')) {
      isOnRelatedPage = true; // Vendor stats should highlight Balance tab
    }

    if (isActive || isOnRelatedPage) {
      return `${baseClass} bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700`;
    }
    return `${baseClass} text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800`;
  };

  const navigationItems = [
    { to: '/', icon: BarChart3, label: 'Statistics', end: true, special: true },
    { to: '/dashboard', icon: Home, label: 'Dashboard', end: false, special: false },
    { to: '/trends', icon: TrendingUp, label: 'Trends', end: false, special: false },
    { to: '/averages', icon: Calculator, label: 'Averages', end: false, special: false },
    { to: '/add', icon: PlusCircle, label: 'Add Expense', end: false, special: false },
    { to: '/balance', icon: Wallet, label: 'Balance', end: false, special: true },
    { to: '/cash-flow', icon: TrendingDown, label: 'Cash Flow', end: false, special: false }
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Expenso</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navigationItems.map(({ to, icon: Icon, label, end, special }) => (
              <NavLink
                key={to}
                to={to}
                className={special ? getSpecialNavLinkClass(to) : getNavLinkClass}
                end={end}
              >
                <Icon className="w-4 h-4 mr-2" />
                <span className="hidden lg:inline">{label}</span>
              </NavLink>
            ))}
            <ThemeToggle />
          </div>

          {/* Mobile menu button and theme toggle */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <button
              onClick={toggleMobileMenu}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none focus:text-gray-900 dark:focus:text-gray-100 transition duration-150 ease-in-out"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200 dark:border-gray-700">
            {navigationItems.map(({ to, icon: Icon, label, end, special }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => {
                  const baseClass = "flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors w-full";

                  let isOnRelatedPage = false;
                  if (special) {
                    // Special handling for root path to avoid matching all paths
                    if (to === '/') {
                      isOnRelatedPage = location.pathname === '/' || location.pathname.startsWith('/statistics/');
                    } else {
                      isOnRelatedPage = location.pathname.startsWith(to);
                    }

                    if (to === '/balance' && location.pathname.startsWith('/vendor/')) {
                      isOnRelatedPage = true;
                    }
                  }

                  if (isActive || isOnRelatedPage) {
                    return `${baseClass} bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700`;
                  }
                  return `${baseClass} text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800`;
                }}
                end={end}
                onClick={closeMobileMenu}
              >
                <Icon className="w-5 h-5 mr-3" />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
          <Navigation />

          <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Statistics />} />
              <Route path="/statistics" element={<Navigate to="/" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/trends" element={<Trends />} />
              <Route path="/averages" element={<AverageExpenses />} />
              <Route path="/add" element={<AddExpense />} />
              <Route path="/balance" element={<BalanceDashboard />} />
              <Route path="/cash-flow" element={<CashFlow />} />
              <Route path="/statistics/category/:category" element={<CategoryStatistics />} />
              <Route path="/statistics/vendor-type/:vendorType" element={<VendorTypeStatistics />} />
              <Route path="/vendor/:vendorId" element={<VendorStatistics />} />
              <Route path="/expenses/:id" element={<ExpenseOverview />} />
              <Route path="/incomes/:id" element={<IncomeOverview />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
