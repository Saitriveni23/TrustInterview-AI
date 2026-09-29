import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Upload from "./pages/Upload";
import Interview from "./pages/Interview";
import Results from "./pages/Results";
import Login from "./pages/Login";
import History from "./pages/History";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./AuthContext";

function ProtectedRoute({ children, role, requiredKey }) {
  const { loading, profile } = useAuth();
  if (loading) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#06060f", color: "#a78bfa" }}>Verifying secure session…</div>;
  if (!profile) return <Navigate to={role === "recruiter" ? "/recruiter" : "/login"} replace />;
  if (role && profile.role !== role) return <Navigate to={profile.role === "recruiter" ? "/recruiter/dashboard" : "/"} replace />;
  if (requiredKey && !sessionStorage.getItem(requiredKey)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter basename={process.env.PUBLIC_URL}>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login portalType="candidate" />} />
          <Route path="/recruiter" element={<Login portalType="employer" />} />
          <Route path="/" element={<ProtectedRoute role="candidate"><Upload viewRole="candidate" /></ProtectedRoute>} />
          <Route path="/recruiter/dashboard" element={<ProtectedRoute role="recruiter"><RecruiterDashboard /></ProtectedRoute>} />
          <Route path="/interview" element={<ProtectedRoute role="candidate" requiredKey="mockSessionId"><Interview /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute role="candidate" requiredKey="interviewResults"><Results /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute role="candidate"><History /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
