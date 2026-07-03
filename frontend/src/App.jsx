import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import HodDashboard from './pages/HodDashboard';
import SisterDashboard from './pages/SisterDashboard';
import WardenDashboard from './pages/WardenDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

const roleHome = {
  Student: '/student-dashboard',
  HOD: '/hod-dashboard',
  Sister: '/sister-dashboard',
  Warden: '/warden-dashboard',
};

const HomeRedirect = () => {
  const { user, token } = useAuth();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={roleHome[user.role]} replace />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/student-dashboard"
        element={
          <ProtectedRoute roles={["Student"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/student" element={<Navigate to="/student-dashboard" replace />} />
      <Route
        path="/hod-dashboard"
        element={
          <ProtectedRoute roles={["HOD"]}>
            <HodDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/hod" element={<Navigate to="/hod-dashboard" replace />} />
      <Route
        path="/sister-dashboard"
        element={
          <ProtectedRoute roles={["Sister"]}>
            <SisterDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/sister" element={<Navigate to="/sister-dashboard" replace />} />
      <Route
        path="/warden-dashboard"
        element={
          <ProtectedRoute roles={["Warden"]}>
            <WardenDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/warden" element={<Navigate to="/warden-dashboard" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
