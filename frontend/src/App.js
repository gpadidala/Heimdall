import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Common/Sidebar';
import DashboardPage from './components/Dashboard/DashboardPage';
import TestRunnerPage from './components/TestRunner/TestRunnerPage';
import ReportsPage from './components/Reports/ReportsPage';
import ComparePage from './components/Compare/ComparePage';
import SettingsPage from './components/Settings/SettingsPage';

const layoutStyle = {
  display: 'flex',
  minHeight: '100vh',
  background: '#030712',
};

const mainStyle = {
  flex: 1,
  padding: '24px 32px',
  overflowY: 'auto',
  maxHeight: '100vh',
};

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div style={layoutStyle}>
          <Sidebar />
          <main style={mainStyle}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/run" element={<TestRunnerPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
