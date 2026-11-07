import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { RoomsPage } from './pages/RoomsPage';
import { StudentsPage } from './pages/StudentsPage';
import { AllocationsPage } from './pages/AllocationsPage';
import { AttendancePage } from './pages/AttendancePage';
import { VisitorsPage } from './pages/VisitorsPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { FeesPage } from './pages/FeesPage';
import { MessPage } from './pages/MessPage';
import { InventoryReportsPage } from './pages/InventoryReportsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Main Layout containing all hostel management modules */}
          <Route path="/" element={<Layout />}>
            {/* 1. Dashboard Overview */}
            <Route index element={<DashboardPage />} />

            {/* 2. Student Management */}
            <Route path="students" element={<StudentsPage />} />

            {/* 3. Room & Allocation Management */}
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="allocations" element={<AllocationsPage />} />

            {/* 4. Attendance & Outing Management */}
            <Route path="attendance" element={<AttendancePage />} />

            {/* 5. Visitor Management */}
            <Route path="visitors" element={<VisitorsPage />} />

            {/* 6. Fee Management */}
            <Route path="fees" element={<FeesPage />} />

            {/* 7. Complaints & Maintenance */}
            <Route path="complaints" element={<ComplaintsPage />} />

            {/* 8. Mess Management */}
            <Route path="mess" element={<MessPage />} />

            {/* 9. Inventory & Reports */}
            <Route path="inventory-reports" element={<InventoryReportsPage />} />
          </Route>

          {/* Legacy login redirects directly to Dashboard */}
          <Route path="/login" element={<Navigate to="/" replace />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
