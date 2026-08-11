import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Upload           from "./pages/Upload";
import Interview        from "./pages/Interview";
import Results          from "./pages/Results";
import Login            from "./pages/Login";
import AuthCallback     from "./pages/AuthCallback";
import GoogleMockAuth   from "./pages/GoogleMockAuth";

function ProtectedRoute({ children, requiredKey, allowedRole }) {
  const hasEmail = sessionStorage.getItem("candidateEmail");
  const userRole = sessionStorage.getItem("ztaRole") || "candidate";

  if (!hasEmail) {
    const isRecruiterPath = window.location.pathname.includes("/recruiter");
    return <Navigate to={isRecruiterPath ? "/recruiter" : "/login"} replace />;
  }

  if (allowedRole && userRole !== allowedRole) {
    return <Navigate to={userRole === "admin" ? "/recruiter/dashboard" : "/"} replace />;
  }

  if (requiredKey && !sessionStorage.getItem(requiredKey)) {
    return <Navigate to={userRole === "admin" ? "/recruiter/dashboard" : "/"} replace />;
  }
  return children;
}

export default function App() {
  React.useEffect(() => {
    const path = window.location.pathname;
    const publicUrl = process.env.PUBLIC_URL || "/INTERVIEW-BOT";
    if (path === "/" || path === "") {
      window.location.replace(`${publicUrl}/`);
    }
  }, []);

  return (
    <BrowserRouter basename={process.env.PUBLIC_URL}>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<Login portalType="candidate" />} />
        <Route path="/recruiter" element={<Login portalType="employer" />} />
        
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/google-mock-auth" element={<GoogleMockAuth />} />
        
        {/* Candidate Portal */}
        <Route path="/" element={
          <ProtectedRoute allowedRole="candidate">
            <Upload viewRole="candidate" />
          </ProtectedRoute>
        } />
        
        {/* Recruiter Portal */}
        <Route path="/recruiter/dashboard" element={
          <ProtectedRoute allowedRole="admin">
            <Upload viewRole="admin" />
          </ProtectedRoute>
        } />
        
        {/* Shared / Candidate proctored assessment */}
        <Route path="/interview" element={
          <ProtectedRoute requiredKey="resumeText" allowedRole="candidate">
            <Interview />
          </ProtectedRoute>
        } />
        
        {/* Shared / Candidate score report */}
        <Route path="/results" element={
          <ProtectedRoute requiredKey="interviewResults" allowedRole="candidate">
            <Results />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
