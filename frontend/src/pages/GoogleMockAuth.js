import React, { useState } from "react";

const DEFAULT_ACCOUNTS = [
  { name: "Sneha Sharma", email: "sneha.sharma@rvce.edu.in", avatar: "👩‍💻" },
  { name: "Pawan Kumar", email: "pawan.kumar@rvce.edu.in", avatar: "👨‍💻" },
  { name: "Ananth Gopal", email: "ananth.gopal@rvce.edu.in", avatar: "🧑‍💻" },
  { name: "Priya Nair", email: "priya.nair@rvce.edu.in", avatar: "👩‍🔬" },
];

export default function GoogleMockAuth() {
  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem("mockGoogleAccounts");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_ACCOUNTS;
      }
    }
    return DEFAULT_ACCOUNTS;
  });

  const [view, setView] = useState("chooser"); // "chooser" or "add"
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
      setError("Enter an email or phone number");
      return;
    }

    if (!customEmail.includes("@")) {
      setError("Enter a valid email address");
      return;
    }

    // Determine name from email prefix
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

    // Prevent duplicate emails in listing
    const filtered = accounts.filter(acc => acc.email.toLowerCase() !== newAccount.email.toLowerCase());
    const updated = [newAccount, ...filtered];
    
    setAccounts(updated);
    localStorage.setItem("mockGoogleAccounts", JSON.stringify(updated));

    // Sign in immediately
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
        </div>

        {view === "chooser" ? (
          /* ====================================================
             VIEW 1: ACCOUNTS CHOOSER LIST
             ==================================================== */
          <div style={styles.contentArea}>
            <div style={styles.accountsList}>
              {accounts.map((acc, index) => (
                <div
                  key={index}
                  onClick={() => handleSelect(acc)}
                  style={styles.accountRow}
                  className="campaign-card-interactive"
                >
                  <span style={styles.avatar}>{acc.avatar}</span>
                  <div style={styles.accDetails}>
                    <div style={styles.name}>{acc.name}</div>
                    <div style={styles.email}>{acc.email}</div>
                  </div>
                </div>
              ))}

              {/* Use another account option */}
              <div
                onClick={() => setView("add")}
                style={{ ...styles.accountRow, borderStyle: "dashed" }}
                className="campaign-card-interactive"
              >
                <span style={styles.avatar}>➕</span>
                <div style={styles.accDetails}>
                  <div style={{ ...styles.name, color: "var(--color-primary)" }}>Use another account</div>
                  <div style={styles.email}>Sign in with a new email address</div>
                </div>
              </div>
            </div>

            {/* Back/Close controls at the bottom */}
            <div style={styles.bottomControls}>
              <button onClick={() => window.close()} style={styles.cancelBtn}>
                ✕ Cancel & Close Window
              </button>
            </div>
          </div>
        ) : (
          /* ====================================================
             VIEW 2: ADD CUSTOM EMAIL FORM
             ==================================================== */
          <form onSubmit={handleAddAccount} style={styles.form}>
            {error && (
              <div style={styles.errorBox}>
                <span>⚠️</span> {error}
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>Email or phone</label>
              <input
                type="email"
                className="form-input"
                placeholder="Enter your device or personal email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                autoFocus
              />
              <span style={styles.hint}>Google will remember this email for future sign-ins.</span>
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
              <button
                type="button"
                onClick={() => {
                  setView("chooser");
                  setError("");
                }}
                style={styles.backBtn}
              >
                Back to chooser
              </button>
              <button type="submit" className="glow-btn" style={styles.nextBtn}>
                Next
              </button>
            </div>
          </form>
        )}

        <footer style={styles.footer}>
          <span>To continue, Google will share your name and email address with RVCE Placements Cell.</span>
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
    maxHeight: "260px",
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
    padding: "8px 24px",
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
