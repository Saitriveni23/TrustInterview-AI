import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Upload    from "./pages/Upload";
import Interview from "./pages/Interview";
import Results   from "./pages/Results";

function ProtectedRoute({ children, requiredKey }) {
  const hasData = sessionStorage.getItem(requiredKey);
  if (!hasData) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Upload />} />
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
