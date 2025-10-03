
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import pages
import WelcomePage from './pages/WelcomePage';
import MosqueFinderPage from './pages/MosqueFinderPage';
import MosqueDetailPage from './pages/MosqueDetailPage';
import AdminApplicationPage from './pages/AdminApplicationPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<WelcomePage />} />
          <Route path="/mosques" element={<MosqueFinderPage />} />
          <Route path="/mosques/:id" element={<MosqueDetailPage />} />
          <Route path="/mosques/:id/apply" element={<AdminApplicationPage />} />

          {/* Protected Admin Route */}
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />

          {/* Catch all route - redirect to home */}
          <Route path="*" element={<WelcomePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
