import React, { useState } from "react";

export default function GoogleMockAuth() {
  const [userAccount, setUserAccount] = useState(() => {
    // 1. Check URL parameters passed from login page
    const params = new URLSearchParams(window.location.search);
    const urlEmail = params.get("email");
    const urlName = params.get("name");

    if (urlEmail && urlEmail.trim()) {
      const derivedName = urlName && urlName.trim() ? urlName.trim() :
        urlEmail.split("@")[0]
          .split(/[._-]+/)
          .map(p => p.charAt(0).toUpperCase() + p.slice(1))
          .join(" ");
      return { name: derivedName, email: urlEmail.trim(), avatar: "👤" };
    }

    // 2. Check saved user account specifically linked to this browser session
    const saved = localStorage.getItem("userGoogleAccount");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) return parsed;
      } catch (e) {
        // ignore error
      }
    }

    // 3. Check sessionStorage candidate credentials
    const candidateEmail = sessionStorage.getItem("candidateEmail");
    const candidateName = sessionStorage.getItem("candidateName");
    if (candidateEmail && candidateEmail.trim()) {
      return {
        name: candidateName && candidateName.trim() ? candidateName.trim() : "Candidate Account",
        email: candidateEmail.trim(),
        avatar: "👤"
      };
    }

    return null;
  });

  const [view, setView] = useState(() => (userAccount ? "chooser" : "add"));
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [error, setError] = useState("");

  const handleSelect = (account) => {
    if (window.opener) {
      window.opener.postMessage({
        type: "MOCK_GOOGLE_AUTH_SUCCESS",
        email: account.email,
        name: account.name
      }, window.location.origin);
      window.close();
    } else {
      alert("Parent window not found. Please log in from the main tab.");
    }
  };

  const handleAddAccount = (e) => {
    e.preventDefault();
    setError("");

    if (!customEmail.trim()) {
      setError("Enter a valid Google email address");
      return;
    }

    if (!customEmail.includes("@")) {
      setError("Enter a valid email address");
      return;
    }

    const derivedName = customName.trim() || 
      customEmail.split("@")[0]
        .split(/[._-]+/)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");

    const newAccount = {
      name: derivedName,
      email: customEmail.trim(),
      avatar: "👤"
    };

    setUserAccount(newAccount);
    localStorage.setItem("userGoogleAccount", JSON.stringify(newAccount));

    // Authenticate immediately
    handleSelect(newAccount);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        
        {/* Google branding logo */}
        <div style={styles.logoArea}>
          <svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24">
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
          <h2 style={styles.title}>Sign in with Google</h2>
          <p style={styles.subtitle}>to continue to <strong>TrustInterview AI</strong></p>
          
          <div style={{
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "11px",
            color: "#10b981",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span>🔒</span> ZTA-L12 Demographic Bias Shield Active (Anonymized Authentication)
          </div>
        </div>

        {view === "chooser" && userAccount ? (
          /* ====================================================
             VIEW 1: SINGLE USER GOOGLE ACCOUNT CARD
             ==================================================== */
          <div style={styles.contentArea}>
            <div style={styles.accountsList}>
              <div
                onClick={() => handleSelect(userAccount)}
                style={{ ...styles.accountRow, border: "1px solid rgba(16, 185, 129, 0.3)", background: "rgba(16, 185, 129, 0.05)" }}
                className="campaign-card-interactive"
              >
                <span style={styles.avatar}>{userAccount.avatar}</span>
                <div style={styles.accDetails}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={styles.name}>{userAccount.name}</div>
                    <span style={{ fontSize: "9px", color: "#10b981", background: "rgba(16, 185, 129, 0.15)", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                      🔒 Linked Google Account
                    </span>
                  </div>
                  <div style={styles.email}>{userAccount.email}</div>
                </div>
              </div>

              {/* Action to continue directly */}
              <button
                className="glow-btn"
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  background: "linear-gradient(135deg, var(--color-primary), #6366f1)",
                  marginTop: "6px"
                }}
                onClick={() => handleSelect(userAccount)}
              >
                Continue as {userAccount.name.split(" ")[0]} →
              </button>

              {/* Option to switch or link another Google Account */}
              <div
                onClick={() => setView("add")}
                style={{ ...styles.accountRow, borderStyle: "dashed", marginTop: "10px" }}
                className="campaign-card-interactive"
              >
                <span style={styles.avatar}>➕</span>
                <div style={styles.accDetails}>
                  <div style={{ ...styles.name, color: "var(--color-primary)" }}>Use another Google Account</div>
                  <div style={styles.email}>Sign in with a different email address</div>
                </div>
              </div>
            </div>

            {/* Cancel controls */}
            <div style={styles.bottomControls}>
              <button onClick={() => window.close()} style={styles.cancelBtn}>
                ✕ Cancel & Close Window
              </button>
            </div>
          </div>
        ) : (
          /* ====================================================
             VIEW 2: LINK YOUR SPECIFIC GOOGLE ACCOUNT FORM
             ==================================================== */
          <form onSubmit={handleAddAccount} style={styles.form}>
            {error && (
              <div style={styles.errorBox}>
                <span>⚠️</span> {error}
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>Your Google Email address</label>
              <input
                type="email"
                className="form-input"
                placeholder="e.g. yourname@gmail.com or @rvce.edu.in"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                autoFocus
              />
              <span style={styles.hint}>Sign in to link only your personal Google Account to this session.</span>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Full Name (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Sai Triveni"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            <div style={styles.formActions}>
              {userAccount && (
                <button
                  type="button"
                  onClick={() => {
                    setView("chooser");
                    setError("");
                  }}
                  style={styles.backBtn}
                >
                  Back to active account
                </button>
              )}
              <button type="submit" className="glow-btn" style={{ ...styles.nextBtn, width: userAccount ? "auto" : "100%" }}>
                Sign In & Connect Account →
              </button>
            </div>

            <div style={{ ...styles.bottomControls, marginTop: "16px" }}>
              <button type="button" onClick={() => window.close()} style={styles.cancelBtn}>
                ✕ Cancel & Close Window
              </button>
            </div>
          </form>
        )}

        <footer style={styles.footer}>
          <span>Google will share your verified name and email address with RVCE Placements Cell.</span>
        </footer>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#0f172a",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    fontFamily: "'Inter', sans-serif",
  },
  card: {
    background: "#1e293b",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "400px",
    padding: "32px 24px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  logoArea: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  },
  title: {
    color: "#ffffff",
    fontSize: "20px",
    fontWeight: "700",
    margin: "8px 0 0 0",
    fontFamily: "'Outfit', sans-serif",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: "13px",
    margin: 0,
  },
  contentArea: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  accountsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxHeight: "280px",
    overflowY: "auto",
    paddingRight: "4px",
  },
  accountRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "12px 16px",
    borderRadius: "10px",
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
  },
  avatar: {
    fontSize: "20px",
    background: "rgba(255,255,255,0.05)",
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
  },
  accDetails: {
    flex: 1,
    textAlign: "left",
  },
  name: {
    color: "#ffffff",
    fontSize: "13.5px",
    fontWeight: 600,
  },
  email: {
    color: "#64748b",
    fontSize: "11.5px",
    marginTop: "2px",
  },
  bottomControls: {
    display: "flex",
    justifyContent: "center",
    paddingTop: "10px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
  },
  cancelBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "12.5px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "color 0.2s",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
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
  },
  hint: {
    fontSize: "11px",
    color: "#64748b",
    marginTop: "2px",
  },
  errorBox: {
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "12px",
    color: "#f43f5e",
    background: "rgba(244, 63, 94, 0.08)",
    border: "1px solid rgba(244, 63, 94, 0.15)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  formActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "10px",
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "var(--color-primary)",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  nextBtn: {
    padding: "10px 24px",
    fontSize: "13px",
    fontWeight: "700",
    background: "linear-gradient(135deg, var(--color-primary), #6366f1)",
  },
  footer: {
    fontSize: "11px",
    color: "#64748b",
    lineHeight: 1.5,
    textAlign: "center",
  },
};
