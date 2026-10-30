import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DemoProvider } from './context/DemoContext';
import { LandingPage } from './pages/marketing/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/app/DashboardPage';
import { ProjectsPage } from './pages/app/ProjectsPage';
import { ProjectDetailPage } from './pages/app/ProjectDetailPage';
import { GuidelinesPage } from './pages/app/GuidelinesPage';
import { HistoryReportsPage } from './pages/app/HistoryReportsPage';
import { ReviewEditorPage } from './pages/app/ReviewEditorPage';
import { ApprovalsPage } from './pages/app/ApprovalsPage';
import { ChangeRequestsPage } from './pages/app/ChangeRequestsPage';
import { PassportPage } from './pages/app/PassportPage';
import { InboxPage } from './pages/app/InboxPage';
import { SettingsPage } from './pages/app/SettingsPage';
import { AdminPage } from './pages/app/AdminPage';

export function App() {
  return (
    <DemoProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Website */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication & Account Selection */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated Application */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            
            {/* Core Workspace & Operations Routes */}
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="inbox/:id" element={<InboxPage />} />
            <Route path="change-requests" element={<ChangeRequestsPage />} />
            <Route path="guidelines" element={<GuidelinesPage />} />
            <Route path="history" element={<HistoryReportsPage />} />
            <Route path="passport" element={<PassportPage />} />
            <Route path="passport/:id" element={<PassportPage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Direct Manuscript Editor */}
            <Route path="review/:id" element={<ReviewEditorPage />} />
            <Route path="admin" element={<AdminPage />} />

            {/* Backward-Compatible Route Aliases */}
            <Route path="workspace" element={<Navigate to="/app/projects" replace />} />
            <Route path="claims" element={<Navigate to="/app/guidelines?tab=claims" replace />} />
            <Route path="rules" element={<Navigate to="/app/guidelines?tab=rules" replace />} />
            <Route path="insights" element={<Navigate to="/app/history?tab=reports" replace />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </DemoProvider>
  );
}

export default App;
