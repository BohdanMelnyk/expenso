import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { PlusCircle, BarChart3, Home, TrendingDown, TrendingUp, Wallet, Calculator, Lightbulb } from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';
import { PeriodProvider } from './contexts/PeriodContext';
import ThemeToggle from './components/ThemeToggle';
import PeriodSelector from './components/PeriodSelector';
import Dashboard from './components/Dashboard';
import AddExpense from './components/AddExpense';
import Statistics from './components/Statistics';
import Trends from './components/Trends';
import CategoryStatistics from './components/CategoryStatistics';
import VendorTypeStatistics from './components/VendorTypeStatistics';
import VendorStatistics from './components/VendorStatistics';
import TagStatistics from './components/TagStatistics';
import CashFlow from './components/CashFlow';
import BalanceDashboard from './components/BalanceDashboard';
import ExpenseOverview from './components/ExpenseOverview';
import IncomeOverview from './components/IncomeOverview';
import EditExpense from './components/EditExpense';
import AverageExpenses from './components/AverageExpenses';
import Insights from './components/Insights/Insights';
import { BankImportScreen } from './components/BankImportScreen';
import { BankTransactionReview } from './components/BankTransactionReview';

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
    { to: '/add', icon: PlusCircle, label: 'Add', end: false, special: false },
    { to: '/trends', icon: TrendingUp, label: 'Trends', end: false, special: false },
    { to: '/insights', icon: Lightbulb, label: 'Insights', end: false, special: false },
    { to: '/balance', icon: Wallet, label: 'Balance', end: false, special: true },
    { to: '/cash-flow', icon: TrendingDown, label: 'Cash Flow', end: false, special: false },
    { to: '/averages', icon: Calculator, label: 'Averages', end: false, special: false }
  ];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mobileBottomItems = [
    { to: '/', icon: BarChart3, label: 'Stats', end: true, special: true },
    { to: '/dashboard', icon: Home, label: 'Home', end: false, special: false },
    { to: '/add', icon: PlusCircle, label: 'Add', end: false, special: false, isCentral: true },
    { to: '/balance', icon: Wallet, label: 'Balance', end: false, special: true },
    { to: '/cash-flow', icon: TrendingDown, label: 'Cash', end: false, special: false }
  ];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-white dark:bg-gray-900 shadow-lg transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Expenso</h1>
            </div>

            {/* Desktop Navigation */}
            <div className="flex items-center space-x-4">
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
              <PeriodSelector />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-2xl transition-colors border-t border-gray-200 dark:border-gray-700 z-40">
        <div className="flex justify-between items-end h-20 px-2">
          {mobileBottomItems.map(({ to, icon: Icon, label, end, special, isCentral }) => {
            if (isCentral) {
              return (
                <div key={to} className="flex-1 flex justify-center -mt-4">
                  <NavLink
                    to={to}
                    className={({ isActive }) => {
                      const baseClass = "flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-200";
                      if (isActive) {
                        return `${baseClass} bg-blue-500 text-white shadow-lg scale-110`;
                      }
                      return `${baseClass} bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800`;
                    }}
                    end={end}
                  >
                    <Icon className="w-6 h-6" />
                  </NavLink>
                </div>
              );
            }

            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => {
                  let isOnRelatedPage = false;
                  if (special) {
                    if (to === '/') {
                      isOnRelatedPage = location.pathname === '/' || location.pathname.startsWith('/statistics/');
                    } else {
                      isOnRelatedPage = location.pathname.startsWith(to);
                    }

                    if (to === '/balance' && location.pathname.startsWith('/vendor/')) {
                      isOnRelatedPage = true;
                    }
                  }

                  const baseClass = "flex-1 flex flex-col items-center justify-center h-20 transition-colors";
                  if (isActive || isOnRelatedPage) {
                    return `${baseClass} text-blue-600 dark:text-blue-400 border-t-2 border-blue-600 dark:border-blue-400`;
                  }
                  return `${baseClass} text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200`;
                }}
                end={end}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Mobile header with logo and menu for accessibility */}
      <div className="md:hidden bg-white dark:bg-gray-900 shadow transition-colors h-14 flex items-center justify-between px-4">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Expenso</h1>
        <ThemeToggle />
      </div>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <PeriodProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col">
            <Navigation />

            <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8 flex-1 w-full md:pb-0 pb-32">
              <Routes>
                <Route path="/" element={<Statistics />} />
                <Route path="/statistics" element={<Navigate to="/" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/trends" element={<Trends />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/averages" element={<AverageExpenses />} />
                <Route path="/add" element={<AddExpense />} />
                <Route path="/expense/:id/edit" element={<EditExpense />} />
                <Route path="/balance" element={<BalanceDashboard />} />
                <Route path="/cash-flow" element={<CashFlow />} />
                <Route path="/statistics/category/:category" element={<CategoryStatistics />} />
                <Route path="/statistics/vendor-type/:vendorType" element={<VendorTypeStatistics />} />
                <Route path="/statistics/tag/:tagId" element={<TagStatistics />} />
                <Route path="/vendor/:vendorId" element={<VendorStatistics />} />
                <Route path="/expenses/:id" element={<ExpenseOverview />} />
                <Route path="/incomes/:id" element={<IncomeOverview />} />
                <Route path="/import/bank" element={<BankImportScreen />} />
                <Route path="/import/bank/review" element={<BankTransactionReview />} />
              </Routes>
            </main>
          </div>
        </PeriodProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
