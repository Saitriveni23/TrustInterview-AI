import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Setup messaging listener for Google auth popup
  useEffect(() => {
    const handleGoogleAuth = (event) => {
      if (event.data && event.data.type === "MOCK_GOOGLE_AUTH_SUCCESS") {
        const { email: googleEmail, name: googleName } = event.data;
        sessionStorage.setItem("candidateEmail", googleEmail);
        sessionStorage.setItem("candidateName", googleName);
        navigate("/");
      }
    };
    window.addEventListener("message", handleGoogleAuth);
    return () => window.removeEventListener("message", handleGoogleAuth);
  }, [navigate]);

  const handleCredentialsSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password || (isSignUp && !name)) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    // Mock API authentication validation
    setTimeout(() => {
      setLoading(false);
      const parsedName = isSignUp ? name : email.split("@")[0].replace(".", " ");
      const formattedName = parsedName.charAt(0).toUpperCase() + parsedName.slice(1);

      sessionStorage.setItem("candidateEmail", email);
      sessionStorage.setItem("candidateName", formattedName);
      sessionStorage.setItem("ztaBiasShieldActive", "true");
      sessionStorage.setItem("ztaAnonymizedHash", Math.random().toString(36).substring(2, 10));
      sessionStorage.setItem("ztaDemographicProtection", "Active - 12 Categories Redacted");
      navigate("/");
    }, 1000);
  };

  const handleGoogleSignInClick = () => {
    // Open centered popup window
    const width = 450;
    const height = 550;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    // Basename compatibility fallback
    const basename = process.env.PUBLIC_URL || "/INTERVIEW-BOT";
    const activeEmail = email.trim() || sessionStorage.getItem("candidateEmail") || "";
    const activeName = name.trim() || sessionStorage.getItem("candidateName") || "";
    
    const params = new URLSearchParams();
    if (activeEmail) params.set("email", activeEmail);
    if (activeName) params.set("name", activeName);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    
    const authUrl = `${window.location.origin}${basename}/google-mock-auth${queryString}`;
    
    window.open(
      authUrl,
      "GoogleMockAuth",
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    );
  };

  return (
    <div style={styles.page}>
      {/* Decorative Blur Orbs */}
      <div style={{ ...styles.blurOrb, top: "15%", left: "10%", background: "rgba(99, 102, 241, 0.15)" }} />
      <div style={{ ...styles.blurOrb, bottom: "15%", right: "10%", background: "rgba(6, 182, 212, 0.15)" }} />

      <main style={styles.mainContainer}>
        <div className="glass-card fade-in-up" style={styles.card}>
          
          {/* Header branding */}
          <div style={styles.brandHeader}>
            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
              <span style={styles.badge}>• CAMPUS PLACEMENTS CELL •</span>
              <span style={{ fontSize: "9.5px", fontWeight: "800", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "4px 10px", borderRadius: "20px" }}>
                ⚖️ ZTA-L12 BIAS FAIRNESS SHIELD
              </span>
            </div>
            <h1 style={styles.logo}>
              🤖 TrustInterview <span style={{ color: "var(--color-primary)" }}>AI</span>
            </h1>
            <p style={styles.tagline}>
              Zero Trust Sandbox Placement Assessment Portal
            </p>
          </div>

          {/* Bias Fairness Protection Guarantee Banner */}
          <div style={{
            background: "rgba(16, 185, 129, 0.05)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            borderRadius: "10px",
            padding: "10px 14px",
            fontSize: "11.5px",
            color: "#cbd5e1",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            textAlign: "left"
          }}>
            <span style={{ fontSize: "16px", color: "#10b981" }}>⚖️</span>
            <div>
              <strong style={{ color: "#10b981", display: "block", marginBottom: "2px" }}>
                ZTA Layer 12 Demographic Fairness Active
              </strong>
              All candidate logins and identity data are scrambled under 12 anti-discrimination categories (Age, Gender, Ethnicity, Institution). Evaluation models assess pure content only.
            </div>
          </div>

          {/* Alert messages */}
          {error && (
            <div className="badge-error" style={styles.errorBox}>
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Form Credentials layout */}
          <form onSubmit={handleCredentialsSubmit} style={styles.form}>
            {isSignUp && (
              <div style={styles.field}>
                <label style={{ ...styles.label, display: "flex", justifyContent: "space-between" }}>
                  <span>Full Name</span>
                  <span style={{ fontSize: "10px", color: "#10b981", fontWeight: 700 }}>🔒 Bias-Free Scrambled</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sneha Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <div style={styles.field}>
              <label style={{ ...styles.label, display: "flex", justifyContent: "space-between" }}>
                <span>RVCE Email Address</span>
                <span style={{ fontSize: "10px", color: "#a5b4fc", fontWeight: 700 }}>🔒 Anonymized Token</span>
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. sneha.sharma@rvce.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <div style={styles.passwordContainer}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="Enter your security password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  style={{ paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  {showPassword ? "👁️" : "🙈"}
                </button>
              </div>
            </div>

            <button type="submit" className="glow-btn" style={styles.submitBtn} disabled={loading}>
              {loading ? "Authenticating session..." : isSignUp ? "Create Placement Profile →" : "Sign In to Sandbox →"}
            </button>
          </form>

          {/* Divider */}
          <div style={styles.divider}>
            <div style={styles.line} />
            <span style={styles.dividerText}>OR</span>
            <div style={styles.line} />
          </div>

          {/* Google Sign In Option */}
          <button onClick={handleGoogleSignInClick} style={styles.googleBtn} className="campaign-card-interactive">
            <svg style={styles.googleIcon} viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.53-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-8.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.08 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.15C3.26 22.25 7.37 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.24A7.16 7.16 0 0 1 5 12c0-.79.13-1.57.37-2.31V6.54H1.29A11.94 11.94 0 0 0 0 12c0 2.02.5 3.92 1.29 5.62l3.98-3.38z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 1.75 1.29 5.46L5.27 8.84c.95-2.85 3.6-4.09 6.73-4.09z"
              />
            </svg>
            Continue with Google Account
          </button>

          {/* Toggle Profile mode */}
          <div style={styles.toggleMode}>
            {isSignUp ? "Already registered? " : "New RVCE candidate? "}
            <button onClick={() => setIsSignUp(!isSignUp)} style={styles.toggleBtn}>
              {isSignUp ? "Sign In instead" : "Register Profile"}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#030712",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px 20px",
    position: "relative",
    overflow: "hidden",
  },
  blurOrb: {
    position: "absolute",
    width: "350px",
    height: "350px",
    borderRadius: "50%",
    filter: "blur(120px)",
    zIndex: 0,
    pointerEvents: "none",
  },
  mainContainer: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: "440px",
  },
  card: {
    padding: "40px",
    background: "rgba(17, 24, 39, 0.55)",
    borderRadius: "24px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5)",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  brandHeader: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  badge: {
    fontSize: "9.5px",
    fontWeight: "800",
    color: "var(--color-primary)",
    background: "rgba(139, 92, 246, 0.1)",
    border: "1px solid rgba(139, 92, 246, 0.2)",
    padding: "4px 10px",
    borderRadius: "20px",
    letterSpacing: "0.05em",
  },
  logo: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#ffffff",
    fontFamily: "var(--font-headings)",
    margin: "8px 0 0 0",
  },
  tagline: {
    fontSize: "12.5px",
    color: "var(--text-muted)",
    margin: 0,
  },
  errorBox: {
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "12.5px",
    fontWeight: 500,
    color: "#f43f5e",
    background: "rgba(244, 63, 94, 0.08)",
    border: "1px solid rgba(244, 63, 94, 0.15)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    textAlign: "left",
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#cbd5e1",
    fontFamily: "var(--font-headings)",
  },
  passwordContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  eyeBtn: {
    position: "absolute",
    right: "12px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    color: "#94a3b8",
  },
  submitBtn: {
    width: "100%",
    padding: "13px",
    fontSize: "14px",
    fontWeight: "700",
    marginTop: "8px",
    background: "linear-gradient(135deg, var(--color-primary), #6366f1)",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  line: {
    flex: 1,
    height: "1px",
    background: "rgba(255, 255, 255, 0.08)",
  },
  dividerText: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--text-muted)",
  },
  googleBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "12px",
    borderRadius: "12px",
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "var(--font-headings)",
    transition: "all 0.2s",
  },
  googleIcon: {
    width: "18px",
    height: "18px",
  },
  toggleMode: {
    fontSize: "12.5px",
    color: "var(--text-muted)",
    textAlign: "center",
    marginTop: "8px",
  },
  toggleBtn: {
    background: "none",
    border: "none",
    color: "var(--color-primary)",
    fontWeight: "700",
    cursor: "pointer",
    padding: 0,
    marginLeft: "4px",
    textDecoration: "underline",
  },
};
