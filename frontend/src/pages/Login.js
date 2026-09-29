import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Login({ portalType = "candidate" }) {
  const navigate = useNavigate();
  const { login, profile, loading, error: authError } = useAuth();
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const recruiterPortal = portalType === "employer";

  useEffect(() => {
    if (!loading && profile) navigate(profile.role === "recruiter" ? "/recruiter/dashboard" : "/", { replace: true });
  }, [loading, profile, navigate]);

  async function handleLogin() {
    setSigningIn(true);
    setError("");
    try {
      await login();
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") setError("Google sign-in could not be completed. Please try again.");
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card} aria-labelledby="login-title">
        <div style={styles.logo}>TI</div>
        <p style={styles.eyebrow}>TRUSTINTERVIEW AI</p>
        <h1 id="login-title" style={styles.title}>{recruiterPortal ? "Recruiter access" : "RVCE candidate access"}</h1>
        <p style={styles.copy}>
          {recruiterPortal
            ? "Sign in with the Google account provisioned by the placement administrator. Recruiter access is verified by a server-side Firebase role claim."
            : "Sign in with your verified RVCE Google Workspace account. Only addresses ending exactly in @rvce.edu.in are accepted."}
        </p>
        {(error || authError) && <div role="alert" style={styles.error}>{error || authError}</div>}
        <button type="button" onClick={handleLogin} disabled={signingIn || loading} style={styles.button}>
          {signingIn || loading ? "Verifying account…" : "Continue with Google"}
        </button>
        <button type="button" onClick={() => navigate(recruiterPortal ? "/login" : "/recruiter")} style={styles.switchButton}>
          {recruiterPortal ? "Use candidate portal" : "Use recruiter portal"}
        </button>
        <p style={styles.security}>Passwords are never collected or stored by TrustInterview AI.</p>
      </section>
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "radial-gradient(circle at 20% 10%, #21134a 0, #090913 42%, #05050a 100%)", color: "#f8fafc" },
  card: { width: "min(440px, 100%)", padding: "44px 40px", borderRadius: 22, background: "rgba(13,14,28,.9)", border: "1px solid rgba(167,139,250,.24)", boxShadow: "0 28px 80px rgba(0,0,0,.55)", textAlign: "center" },
  logo: { width: 52, height: 52, margin: "0 auto 16px", borderRadius: 14, display: "grid", placeItems: "center", fontWeight: 900, background: "linear-gradient(135deg,#7c3aed,#06b6d4)" },
  eyebrow: { color: "#a78bfa", fontSize: 11, letterSpacing: ".16em", fontWeight: 800 },
  title: { fontSize: 28, margin: "12px 0", fontFamily: "var(--font-headings)" },
  copy: { color: "#a1a1b8", fontSize: 14, lineHeight: 1.65, marginBottom: 24 },
  error: { textAlign: "left", padding: 12, marginBottom: 16, borderRadius: 10, color: "#fecdd3", background: "rgba(244,63,94,.12)", border: "1px solid rgba(244,63,94,.25)", fontSize: 13 },
  button: { width: "100%", border: 0, borderRadius: 11, padding: "13px 16px", cursor: "pointer", color: "white", fontWeight: 800, background: "linear-gradient(135deg,#7c3aed,#4f46e5)" },
  switchButton: { marginTop: 14, border: 0, background: "transparent", color: "#67e8f9", cursor: "pointer", fontWeight: 700 },
  security: { marginTop: 28, color: "#62627d", fontSize: 11 },
};
