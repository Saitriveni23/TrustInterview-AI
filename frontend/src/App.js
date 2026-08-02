import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Upload         from "./pages/Upload";
import Interview      from "./pages/Interview";
import Results        from "./pages/Results";
import Login          from "./pages/Login";
import GoogleMockAuth from "./pages/GoogleMockAuth";

function ProtectedRoute({ children, requiredKey }) {
  const hasEmail = sessionStorage.getItem("candidateEmail");
  if (!hasEmail) return <Navigate to="/login" replace />;
  if (requiredKey && !sessionStorage.getItem(requiredKey)) {
    return <Navigate to="/" replace />;
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
        <Route path="/login" element={<Login />} />
        <Route path="/google-mock-auth" element={<GoogleMockAuth />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Upload />
          </ProtectedRoute>
        } />
        
        <Route path="/interview" element={
          <ProtectedRoute requiredKey="resumeText">
            <Interview />
          </ProtectedRoute>
        } />
        
        <Route path="/results" element={
          <ProtectedRoute requiredKey="interviewResults">
            <Results />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

