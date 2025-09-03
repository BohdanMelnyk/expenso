import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { PlusCircle, BarChart3, Home, TrendingDown, Wallet, Menu, X } from 'lucide-react';
import Dashboard from './components/Dashboard';
import AddExpense from './components/AddExpense';
import Statistics from './components/Statistics';
import CategoryStatistics from './components/CategoryStatistics';
import VendorTypeStatistics from './components/VendorTypeStatistics';
import VendorStatistics from './components/VendorStatistics';
import CashFlow from './components/CashFlow';
import BalanceDashboard from './components/BalanceDashboard';
import ExpenseOverview from './components/ExpenseOverview';
import IncomeOverview from './components/IncomeOverview';

function Navigation() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    const baseClass = "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors";
    if (isActive) {
      return `${baseClass} bg-blue-100 text-blue-700 border border-blue-200`;
    }
    return `${baseClass} text-gray-700 hover:text-gray-900 hover:bg-gray-100`;
  };

  const getSpecialNavLinkClass = (basePath: string) => ({ isActive }: { isActive: boolean }) => {
    const baseClass = "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors";
    // Check if we're on the base path or any sub-page
    let isOnRelatedPage = location.pathname.startsWith(basePath);
    
    // Special cases for related pages
    if (basePath === '/balance' && location.pathname.startsWith('/vendor/')) {
      isOnRelatedPage = true; // Vendor stats should highlight Balance tab
    }
    if (basePath === '/statistics' && location.pathname.startsWith('/statistics/')) {
      isOnRelatedPage = true; // Category/VendorType stats should highlight Statistics tab
    }
    
    if (isActive || isOnRelatedPage) {
      return `${baseClass} bg-blue-100 text-blue-700 border border-blue-200`;
    }
    return `${baseClass} text-gray-700 hover:text-gray-900 hover:bg-gray-100`;
  };

  const navigationItems = [
    { to: '/', icon: Home, label: 'Dashboard', end: true, special: false },
    { to: '/add', icon: PlusCircle, label: 'Add Expense', end: false, special: false },
    { to: '/balance', icon: Wallet, label: 'Balance', end: false, special: true },
    { to: '/cash-flow', icon: TrendingDown, label: 'Cash Flow', end: false, special: false },
    { to: '/statistics', icon: BarChart3, label: 'Statistics', end: false, special: true }
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">Expenso</h1>
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
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-700 hover:text-gray-900 focus:outline-none focus:text-gray-900 transition duration-150 ease-in-out"
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
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
            {navigationItems.map(({ to, icon: Icon, label, end, special }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => {
                  const baseClass = "flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors w-full";
                  
                  let isOnRelatedPage = false;
                  if (special) {
                    isOnRelatedPage = location.pathname.startsWith(to);
                    if (to === '/balance' && location.pathname.startsWith('/vendor/')) {
                      isOnRelatedPage = true;
                    }
                    if (to === '/statistics' && location.pathname.startsWith('/statistics/')) {
                      isOnRelatedPage = true;
                    }
                  }
                  
                  if (isActive || isOnRelatedPage) {
                    return `${baseClass} bg-blue-100 text-blue-700 border border-blue-200`;
                  }
                  return `${baseClass} text-gray-700 hover:text-gray-900 hover:bg-gray-100`;
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
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />

        <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add" element={<AddExpense />} />
            <Route path="/balance" element={<BalanceDashboard />} />
            <Route path="/cash-flow" element={<CashFlow />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/statistics/category/:category" element={<CategoryStatistics />} />
            <Route path="/statistics/vendor-type/:vendorType" element={<VendorTypeStatistics />} />
            <Route path="/vendor/:vendorId" element={<VendorStatistics />} />
            <Route path="/expenses/:id" element={<ExpenseOverview />} />
            <Route path="/incomes/:id" element={<IncomeOverview />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
