import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:5001";

export default function Login({ portalType }) {
  const navigate = useNavigate();

  const [portal, setPortal] = useState(portalType || null); // null | "candidate" | "employer"
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Sync portal with portalType prop if it changes
  useEffect(() => {
    if (portalType) {
      setPortal(portalType);
    }
  }, [portalType]);

  // Google auth message listener (for candidates only)
  useEffect(() => {
    const handleGoogleAuth = (event) => {
      if (event.data && event.data.type === "MOCK_GOOGLE_AUTH_SUCCESS") {
        const { email: googleEmail, name: googleName } = event.data;
        sessionStorage.setItem("candidateEmail", googleEmail);
        sessionStorage.setItem("candidateName", googleName);
        sessionStorage.setItem("ztaRole", "candidate");
        sessionStorage.setItem("ztaBiasShieldActive", "true");
        sessionStorage.setItem("ztaAnonymizedHash", Math.random().toString(36).substring(2, 10));
        sessionStorage.setItem("ztaDemographicProtection", "Active - 14 Categories Redacted");

        // Sync Google Auth login to backend
        fetch(`${API}/api/auth/register-sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: googleName, email: googleEmail, role: "candidate" })
        }).catch(err => console.warn("Backend Google sync failed:", err));

        navigate("/");
      }
    };
    window.addEventListener("message", handleGoogleAuth);
    return () => window.removeEventListener("message", handleGoogleAuth);
  }, [navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    const cleanEmail    = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanEmail || !cleanPassword || (isSignUp && !name.trim())) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (cleanPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    let registeredUsers = [];
    try {
      const saved = localStorage.getItem("registeredUsers");
      registeredUsers = saved ? JSON.parse(saved) : [];
    } catch { registeredUsers = []; }

    const existingUser = registeredUsers.find(u => u.email === cleanEmail);
    const targetRole = portal === "employer" ? "admin" : "candidate";

    if (isSignUp) {
      if (existingUser) {
        setError("A profile with this email already exists. Sign in instead.");
        return;
      }
      if (cleanPassword !== cleanConfirm) {
        setError("Passwords do not match.");
        return;
      }
      registeredUsers.push({
        name: name.trim(),
        email: cleanEmail,
        password: cleanPassword,
        role: targetRole,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem("registeredUsers", JSON.stringify(registeredUsers));

      // Sync user to backend database
      fetch(`${API}/api/auth/register-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: cleanEmail, role: targetRole })
      }).catch(err => console.warn("Backend register sync failed:", err));

      setSuccess("Account registered successfully! You can now sign in.");
      setIsSignUp(false);
      setPassword("");
      setConfirmPassword("");
      return;
    } else {
      if (!existingUser) {
        setError("No profile found. Please register first.");
        return;
      }
      if (existingUser.password !== cleanPassword) {
        setError("Incorrect password. Access denied.");
        return;
      }
      // Role enforcement
      const userRole = existingUser.role || "candidate";
      if (userRole !== targetRole) {
        setError(`This account is registered for the ${userRole === "admin" ? "Employer" : "Candidate"} portal. Please use that portal.`);
        return;
      }
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const activeName = isSignUp ? name.trim() : (existingUser?.name || cleanEmail.split("@")[0]);
      sessionStorage.setItem("candidateEmail", cleanEmail);
      sessionStorage.setItem("candidateName", activeName.charAt(0).toUpperCase() + activeName.slice(1));
      sessionStorage.setItem("ztaRole", targetRole);
      sessionStorage.setItem("ztaBiasShieldActive", "true");
      sessionStorage.setItem("ztaAnonymizedHash", Math.random().toString(36).substring(2, 10));
      sessionStorage.setItem("ztaDemographicProtection", "Active - 14 Categories Redacted");

      // Sync user to backend database on login
      fetch(`${API}/api/auth/register-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: activeName, email: cleanEmail, role: targetRole })
      }).catch(err => console.warn("Backend login sync failed:", err));

      if (targetRole === "admin") {
        navigate("/recruiter/dashboard");
      } else {
        navigate("/");
      }
    }, 1000);
  };

  const handleGoogleSignIn = () => {
    const width = 460; const height = 560;
    const left = window.screen.width / 2 - width / 2;
    const top  = window.screen.height / 2 - height / 2;
    const params = new URLSearchParams();
    if (email.trim()) params.set("email", email.trim());
    if (name.trim())  params.set("name", name.trim());
    const qs = params.toString() ? `?${params.toString()}` : "";
    const appBase = window.location.href.includes("/INTERVIEW-BOT")
      ? `${window.location.origin}/INTERVIEW-BOT`
      : window.location.origin;
    window.open(
      `${appBase}/google-mock-auth${qs}`,
      "GoogleMockAuth",
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    );
  };

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      alignItems: "center",
      justifyContent: "center",
      background: "#06060f",
      fontFamily: "var(--font-body)",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background ambient radial glows */}
      <div style={{ position: "absolute", top: "15%", left: "15%", width: "400px", height: "400px", borderRadius: "50%", background: "rgba(124, 58, 237, 0.06)", filter: "blur(100px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "15%", right: "15%", width: "350px", height: "350px", borderRadius: "50%", background: "rgba(6, 182, 212, 0.05)", filter: "blur(100px)", pointerEvents: "none" }} />

      {/* ── PORTAL SELECTION SCREEN ── */}
      {portal === null ? (
        <div style={{ maxWidth: "800px", width: "100%", zIndex: 1, textAlign: "center", animation: "fadeInUp 0.4s ease" }}>
          
          {/* Logo Mark */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "12px",
              background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "24px", boxShadow: "0 6px 20px rgba(124, 58, 237, 0.4)",
            }}>
              🤖
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#f0f0ff", fontFamily: "var(--font-headings)", letterSpacing: "-0.02em" }}>
                TrustInterview<span style={{ color: "#a78bfa" }}> AI</span>
              </div>
              <div style={{ fontSize: "11px", color: "#6b6b90", fontWeight: 700, letterSpacing: "0.08em" }}>
                RVCE CAMPUS PLACEMENTS PORTAL
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: "28px", color: "#f0f0ff", fontFamily: "var(--font-headings)", marginBottom: "12px", fontWeight: 800 }}>
            Choose Your Access Portal
          </h2>
          <p style={{ color: "#6b6b90", fontSize: "14.5px", marginBottom: "40px", maxWidth: "480px", marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            Select your account type to proceed with assessment taking or coordinate campaigns.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", textAlign: "left" }}>
            
            {/* Candidate Portal Card */}
            <div
              onClick={() => { setPortal("candidate"); setError(""); setSuccess(""); setIsSignUp(true); }}
              className="glass-card table-row-hover"
              style={{
                padding: "36px",
                background: "rgba(10, 11, 22, 0.75)",
                border: "1px solid rgba(139, 92, 246, 0.15)",
                borderRadius: "20px",
                cursor: "pointer",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
                transition: "all 0.3s ease",
              }}
            >
              <div style={{ fontSize: "36px", marginBottom: "16px" }}>🎓</div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#f0f0ff", fontFamily: "var(--font-headings)", marginBottom: "10px" }}>
                Candidate Portal
              </h3>
              <p style={{ color: "#6b6b90", fontSize: "13.5px", lineHeight: 1.6, marginBottom: "24px" }}>
                Launch mock interviews, upload resumes, verify CGPA eligibility, and access course resources.
              </p>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#a78bfa", display: "flex", alignItems: "center", gap: "6px" }}>
                Enter Candidate Portal <span>→</span>
              </div>
            </div>

            {/* Employer Portal Card */}
            <div
              onClick={() => { setPortal("employer"); setError(""); setSuccess(""); setIsSignUp(false); }}
              className="glass-card table-row-hover"
              style={{
                padding: "36px",
                background: "rgba(10, 11, 22, 0.75)",
                border: "1px solid rgba(6, 182, 212, 0.15)",
                borderRadius: "20px",
                cursor: "pointer",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
                transition: "all 0.3s ease",
              }}
            >
              <div style={{ fontSize: "36px", marginBottom: "16px" }}>💼</div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#f0f0ff", fontFamily: "var(--font-headings)", marginBottom: "10px" }}>
                Employer & Coordinator Portal
              </h3>
              <p style={{ color: "#6b6b90", fontSize: "13.5px", lineHeight: 1.6, marginBottom: "24px" }}>
                Configure proctor rules, select grading parameters, route AI agent personalities, and audit student scores.
              </p>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#22d3ee", display: "flex", alignItems: "center", gap: "6px" }}>
                Enter Recruiter Portal <span>→</span>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* ── DUAL LOGIN FORM SCREEN ── */
        <div className="glass-card" style={{
          maxWidth: "480px",
          width: "100%",
          padding: "40px",
          background: "rgba(10, 11, 22, 0.75)",
          border: portal === "employer" ? "1px solid rgba(6, 182, 212, 0.2)" : "1px solid rgba(139, 92, 246, 0.2)",
          borderRadius: "24px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
          zIndex: 1,
          animation: "fadeInUp 0.4s ease",
        }}>
          
          {/* Back button (Only show if portal selection was manual, i.e. no portalType prop) */}
          {!portalType && (
            <button
              onClick={() => setPortal(null)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#6b6b90", fontSize: "12px", fontWeight: 700,
                display: "flex", alignItems: "center", gap: "6px", marginBottom: "20px",
                padding: 0, fontFamily: "var(--font-headings)"
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#f0f0ff"}
              onMouseLeave={e => e.currentTarget.style.color = "#6b6b90"}
            >
              ← Back to portal selection
            </button>
          )}

          {/* Logo and Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: portal === "employer" ? "linear-gradient(135deg, #06b6d4, #0891b2)" : "linear-gradient(135deg, #7c3aed, #6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "18px", boxShadow: portal === "employer" ? "0 4px 14px rgba(6, 182, 212, 0.4)" : "0 4px 14px rgba(124, 58, 237, 0.4)",
            }}>
              {portal === "employer" ? "💼" : "🎓"}
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 900, color: "#f0f0ff", fontFamily: "var(--font-headings)", letterSpacing: "-0.01em" }}>
                TrustInterview<span style={{ color: portal === "employer" ? "#22d3ee" : "#a78bfa" }}> AI</span>
              </div>
              <div style={{ fontSize: "9px", color: "#4a4a6a", fontWeight: 700, letterSpacing: "0.05em" }}>
                {portal === "employer" ? "EMPLOYER PANEL" : "CANDIDATE PANEL"}
              </div>
            </div>
          </div>

          {/* Form Header */}
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#f0f0ff", fontFamily: "var(--font-headings)", marginBottom: "6px" }}>
              {isSignUp ? "Create Access Profile" : "Portal Secure Sign-In"}
            </h2>
            <p style={{ color: "#6b6b90", fontSize: "13.5px" }}>
              {portal === "employer"
                ? (isSignUp ? "Register recruiter credentials for placement campaign setup" : "Authenticate to access security and grading matrices")
                : (isSignUp ? "Create candidate profile for placement drive access" : "Sign in to launch active hiring assessments")}
            </p>
          </div>

          {/* Toggle Tabs */}
          <div style={{
            display: "flex",
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: "12px",
            padding: "4px",
            marginBottom: "24px",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          }}>
            {["Register", "Sign In"].map((label, i) => (
              <button
                key={i}
                onClick={() => { setIsSignUp(i === 0); setError(""); setSuccess(""); }}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer",
                  fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-headings)",
                  background: (i === 0) === isSignUp
                    ? (portal === "employer" ? "rgba(6, 182, 212, 0.15)" : "rgba(124, 58, 237, 0.15)")
                    : "transparent",
                  color: (i === 0) === isSignUp
                    ? (portal === "employer" ? "#22d3ee" : "#c4b5fd")
                    : "#6b6b90",
                  transition: "all 0.2s",
                  borderBottom: (i === 0) === isSignUp
                    ? (portal === "employer" ? "2px solid #06b6d4" : "2px solid #7c3aed")
                    : "2px solid transparent",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Error / Success */}
          {error && (
            <div style={{
              background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: "10px", padding: "10px 14px",
              color: "#f87171", fontSize: "13px", marginBottom: "16px",
              display: "flex", alignItems: "baseline", gap: "8px",
            }}>
              <span style={{ flexShrink: 0 }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div style={{
              background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)",
              borderRadius: "10px", padding: "10px 14px",
              color: "#34d399", fontSize: "13px", marginBottom: "16px",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              <span>✓</span> {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {isSignUp && (
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#6b6b90", marginBottom: "6px", display: "block", letterSpacing: "0.05em" }}>
                  {portal === "employer" ? "RECRUITER FULL NAME" : "CANDIDATE FULL NAME"}
                </label>
                <input
                  className="input-field"
                  type="text"
                  placeholder={portal === "employer" ? "e.g. Coordinator Admin" : "e.g. Sai Triveni B"}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#6b6b90", marginBottom: "6px", display: "block", letterSpacing: "0.05em" }}>
                {portal === "employer" ? "WORK EMAIL" : "COLLEGE EMAIL"}
              </label>
              <input
                className="input-field"
                type="email"
                placeholder={portal === "employer" ? "admin@placement.rvce.edu.in" : "yourname@rvce.edu.in"}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#6b6b90", marginBottom: "6px", display: "block", letterSpacing: "0.05em" }}>PASSWORD</label>
              <div style={{ position: "relative" }}>
                <input
                  className="input-field"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: "44px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "#4a4a6a", fontSize: "15px", padding: "4px"
                  }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#6b6b90", marginBottom: "6px", display: "block", letterSpacing: "0.05em" }}>CONFIRM PASSWORD</label>
                <input
                  className="input-field"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              className="glow-btn"
              disabled={loading}
              style={{
                marginTop: "4px", padding: "14px", fontSize: "14px", width: "100%", borderRadius: "12px",
                background: portal === "employer" ? "linear-gradient(135deg, #06b6d4, #0891b2)" : "linear-gradient(135deg, #7c3aed, #6366f1)",
                boxShadow: portal === "employer" ? "0 4px 14px rgba(6,182,212,0.2)" : "0 4px 14px rgba(124,58,237,0.2)",
                border: "none", color: "#fff", cursor: "pointer", fontWeight: 700
              }}
            >
              {loading ? "Authenticating Session..." : (isSignUp ? `Create ${portal === "employer" ? "Recruiter" : "Candidate"} Profile →` : "Sign In Securely →")}
            </button>
          </form>

          {/* Google Authentication (For Candidates only) */}
          {portal === "candidate" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", margin: "20px 0" }}>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
                <span style={{ color: "#4a4a6a", fontSize: "11.5px", fontWeight: 600 }}>or continue with</span>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
              </div>

              <button
                onClick={handleGoogleSignIn}
                style={{
                  width: "100%", padding: "12px", borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#d4d4f0", fontSize: "13.5px", fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                  fontFamily: "var(--font-headings)", transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)"; e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)"; }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: "4px" }}>
                  <path d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z" fill="#EA4335" />
                  <path d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z" fill="#4285F4" />
                  <path d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z" fill="#FBBC05" />
                  <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.88 13.04C2.36 15.98 5.48 18 9 18z" fill="#34A853" />
                </svg>
                Continue with Google
              </button>
            </>
          )}

        </div>
      )}
    </div>
  );
}
