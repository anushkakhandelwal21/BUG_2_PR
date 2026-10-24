import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewRunPage } from './pages/NewRunPage';
import { RunDetailsPage } from './pages/RunDetailsPage';
import { DiffPage } from './pages/DiffPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReplayPage } from './pages/ReplayPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/runs/new" element={<NewRunPage />} />
        <Route path="/runs/:id" element={<RunDetailsPage />} />
        <Route path="/runs/:id/diff" element={<DiffPage />} />
        <Route path="/replay" element={<ReplayPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
