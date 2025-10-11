
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import pages
import MosqueFinderPage from './pages/MosqueFinderPage';
import MosqueDetailPage from './pages/MosqueDetailPage';
import AdminApplicationPage from './pages/AdminApplicationPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminStatusPage from './pages/AdminStatusPage';
import AdminReapplicationPage from './pages/AdminReapplicationPage';
import SuperAdminLoginPage from './pages/SuperAdminLoginPage';
import SuperAdminRegisterPage from './pages/SuperAdminRegisterPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<MosqueFinderPage />} />
          <Route path="/mosques" element={<MosqueFinderPage />} />
          <Route path="/mosques/:id" element={<MosqueDetailPage />} />
          <Route path="/mosques/:id/apply" element={<AdminApplicationPage />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/status" element={<AdminStatusPage />} />
          <Route path="/admin/reapply" element={<AdminReapplicationPage />} />

          {/* Super Admin Routes */}
          <Route path="/superadmin/register" element={<SuperAdminRegisterPage />} />
          <Route path="/superadmin/login" element={<SuperAdminLoginPage />} />
          <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />

          {/* Catch all route - redirect to home */}
          <Route path="*" element={<MosqueFinderPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
