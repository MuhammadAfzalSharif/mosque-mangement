
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import EmailVerificationPage from './pages/EmailVerificationPage';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<MosqueFinderPage />} />
            <Route path="/mosques" element={<Navigate to="/" replace />} />
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

            {/* Password Reset Routes */}
            <Route path="/forgot-password/:userType" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:userType" element={<ResetPasswordPage />} />

            {/* Email Verification Route */}
            <Route path="/email-verification" element={<EmailVerificationPage />} />

            {/* Catch all route - redirect to home */}
            <Route path="*" element={<MosqueFinderPage />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
