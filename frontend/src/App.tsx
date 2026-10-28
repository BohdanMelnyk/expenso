import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AddPanelProvider } from './contexts/AddPanelContext';
import LoginPage from './components/LoginPage';
import Sidebar from './ui/Sidebar';
import OverviewPage from './pages/OverviewPage';
import ExpensesPage from './pages/ExpensesPage';
import ImportPage from './pages/ImportPage';
import WealthPage from './pages/WealthPage';
import DetailPage from './pages/DetailPage';

// Old pages and where their content lives now.
const redirects: Array<[string, string]> = [
  ['/statistics', '/'],
  ['/statistics/*', '/'],
  ['/trends', '/'],
  ['/insights', '/'],
  ['/averages', '/'],
  ['/cash-flow', '/'],
  ['/dashboard', '/expenses'],
  ['/add', '/expenses'],
  ['/import/bank', '/expenses/import'],
  ['/import/bank/review', '/expenses/import'],
  ['/expense/:id/edit', '/expenses'],
  ['/expenses/:id', '/expenses'],
  ['/incomes/:id', '/expenses?kind=income'],
  ['/balance', '/wealth'],
  ['/snapshots', '/wealth'],
];

function AppGate() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <Loader className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Router>
      <AddPanelProvider>
        <div className="flex min-h-screen bg-[#f5f5f7] text-gray-900 dark:bg-black dark:text-gray-100">
          <Sidebar />
          <main className="min-w-0 flex-1 px-6 py-6 lg:px-8">
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/category/:name" element={<DetailPage />} />
              <Route path="/vendor/:id" element={<DetailPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/expenses/import" element={<ImportPage />} />
              <Route path="/wealth" element={<WealthPage />} />
              {redirects.map(([from, to]) => (
                <Route key={from} path={from} element={<Navigate to={to} replace />} />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AddPanelProvider>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
