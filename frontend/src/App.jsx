import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import AnalystDashboard from "./pages/analyst/AnalystDashboard";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AuditorDashboard from "./pages/auditor/AuditorDashboard";
import DashboardLayout from "./layouts/DashboardLayout";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected dashboard routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="customer/*" element={<ProtectedRoute roles={["customer"]}><CustomerDashboard /></ProtectedRoute>} />
            <Route path="analyst/*" element={<ProtectedRoute roles={["analyst"]}><AnalystDashboard /></ProtectedRoute>} />
            <Route path="manager/*" element={<ProtectedRoute roles={["manager"]}><ManagerDashboard /></ProtectedRoute>} />
            <Route path="admin/*" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="auditor/*" element={<ProtectedRoute roles={["auditor"]}><AuditorDashboard /></ProtectedRoute>} />
          </Route>

          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
