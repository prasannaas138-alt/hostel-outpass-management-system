import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import HodDashboard from './pages/HodDashboard';
import SisterDashboard from './pages/SisterDashboard';
import WardenDashboard from './pages/WardenDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

const roleHome = {
  Student: '/student',
  HOD: '/hod',
  Sister: '/sister',
  Warden: '/warden',
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
        path="/student"
        element={
          <ProtectedRoute roles={["Student"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hod"
        element={
          <ProtectedRoute roles={["HOD"]}>
            <HodDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sister"
        element={
          <ProtectedRoute roles={["Sister"]}>
            <SisterDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/warden"
        element={
          <ProtectedRoute roles={["Warden"]}>
            <WardenDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
