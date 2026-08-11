import React, { useState } from "react";

// Generate avatar color from email string
function avatarColor(email) {
  const colors = ["#EA4335","#4285F4","#34A853","#FBBC05","#9C27B0","#FF5722","#00BCD4","#607D8B","#E91E63","#FF9800"];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name) {
  return name
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export default function GoogleMockAuth() {
  // Read registered users from localStorage
  const getRegisteredUsers = () => {
    try {
      const saved = localStorage.getItem("registeredUsers");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  };

  const params      = new URLSearchParams(window.location.search);
  const urlEmail    = params.get("email") || "";
  const urlName     = params.get("name")  || "";

  const registered  = getRegisteredUsers();
  const [view, setView] = useState("chooser"); // "chooser" | "another" | "password"
  const [selectedUser, setSelectedUser] = useState(null);
  const [manualEmail, setManualEmail]   = useState(urlEmail);
  const [manualName,  setManualName]    = useState(urlName);
  const [password, setPassword]         = useState("");
  const [error, setError]               = useState("");

  // Determine which accounts to show
  const accounts = registered.length > 0
    ? registered
    : urlEmail
      ? [{ name: urlName || urlEmail.split("@")[0], email: urlEmail, password: "" }]
      : [];

  const handleAccountClick = (user) => {
    setSelectedUser(user);
    setPassword("");
    setError("");
    setView("password");
  };

  const handleUseAnother = () => {
    setView("another");
    setError("");
  };

  const handleAnotherContinue = (e) => {
    e.preventDefault();
    const cleanEmail = manualEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    const match = registered.find(u => u.email === cleanEmail);
    if (match) {
      handleAccountClick(match);
    } else {
      // New account — go straight to password view as "new user"
      setSelectedUser({ name: manualName || cleanEmail.split("@")[0], email: cleanEmail, password: null });
      setView("password");
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setError("");
    const cleanPassword = password.trim();
    if (!cleanPassword || cleanPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    // Verify password if user is registered
    if (selectedUser.password && selectedUser.password !== cleanPassword) {
      setError("Wrong password. Try again.");
      return;
    }
    const derivedName = selectedUser.name ||
      selectedUser.email.split("@")[0]
        .split(/[._-]+/)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
    localStorage.setItem("userGoogleAccount", JSON.stringify({ name: derivedName, email: selectedUser.email }));
    if (window.opener) {
      window.opener.postMessage({
        type: "MOCK_GOOGLE_AUTH_SUCCESS",
        email: selectedUser.email,
        name: derivedName,
      }, window.location.origin);
      window.close();
    } else {
      alert("Parent window not found. Please login from the main tab.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8faff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Google Sans', 'Roboto', Arial, sans-serif",
      padding: "20px",
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "28px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.12), 0 8px 40px rgba(0,0,0,0.08)",
        width: "100%",
        maxWidth: "400px",
        overflow: "hidden",
      }}>

        {/* ── ACCOUNT CHOOSER VIEW ── */}
        {view === "chooser" && (
          <>
            {/* Header */}
            <div style={{ padding: "28px 28px 0", textAlign: "center" }}>
              {/* Google Logo */}
              <svg width="75" height="24" viewBox="0 0 272 92" style={{ marginBottom: "20px" }}>
                <path fill="#EA4335" d="M115.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18C71.25 34.32 81.24 25 93.5 25s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44S80.99 39.2 80.99 47.18c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z"/>
                <path fill="#FBBC05" d="M163.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18c0-12.85 9.99-22.18 22.25-22.18s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44s-12.51 5.46-12.51 13.44c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z"/>
                <path fill="#4285F4" d="M209.75 26.34v39.82c0 16.38-9.66 23.07-21.08 23.07-10.75 0-17.22-7.19-19.66-13.07l8.48-3.53c1.51 3.61 5.21 7.87 11.17 7.87 7.31 0 11.84-4.51 11.84-13v-3.19h-.34c-2.18 2.69-6.38 5.04-11.68 5.04-11.09 0-21.25-9.66-21.25-22.09 0-12.52 10.16-22.26 21.25-22.26 5.29 0 9.49 2.35 11.68 4.96h.34v-3.61h9.25zm-8.56 20.92c0-7.81-5.21-13.52-11.84-13.52-6.72 0-12.35 5.71-12.35 13.52 0 7.73 5.63 13.36 12.35 13.36 6.63 0 11.84-5.63 11.84-13.36z"/>
                <path fill="#34A853" d="M225 3v65h-9.5V3h9.5z"/>
                <path fill="#EA4335" d="M262.02 54.48l7.56 5.04c-2.44 3.61-8.32 9.83-18.48 9.83-12.6 0-22.01-9.74-22.01-22.18 0-13.19 9.49-22.18 20.92-22.18 11.51 0 17.14 9.16 18.98 14.11l1.01 2.52-29.65 12.28c2.27 4.45 5.8 6.72 10.75 6.72 4.96 0 8.4-2.44 10.92-6.14zm-23.27-7.98l19.82-8.23c-1.09-2.77-4.37-4.7-8.23-4.7-4.95 0-11.84 4.37-11.59 12.93z"/>
                <path fill="#4285F4" d="M35.29 41.41V32h31.46c.31 1.64.47 3.58.47 5.68 0 7.06-1.93 15.79-8.15 22.01-6.05 6.3-13.78 9.66-24.02 9.66C16.32 69.35.36 53.89.36 35.28.36 16.67 16.32 1.21 34.85 1.21c10.5 0 17.98 4.12 23.6 9.49l-6.64 6.64c-4.03-3.78-9.49-6.72-16.97-6.72-13.86 0-24.7 11.17-24.7 25.03 0 13.86 10.84 25.03 24.7 25.03 8.99 0 14.11-3.61 17.39-6.89 2.66-2.66 4.41-6.46 5.1-11.65l-22.04.07z"/>
              </svg>

              <h2 style={{ fontSize: "24px", fontWeight: 400, color: "#202124", margin: "0 0 8px", letterSpacing: 0 }}>
                Sign in with Google
              </h2>
              <p style={{ fontSize: "16px", color: "#202124", fontWeight: 400, margin: "0 0 4px" }}>
                Choose an account
              </p>
              <p style={{ fontSize: "14px", color: "#5f6368", margin: "0 0 20px" }}>
                to continue to <strong style={{ color: "#202124" }}>TrustInterview AI</strong>
              </p>
            </div>

            {/* Account List */}
            <div style={{ borderTop: "1px solid #e8eaed" }}>
              {accounts.length === 0 ? (
                <div style={{ padding: "20px 28px", textAlign: "center", color: "#5f6368", fontSize: "14px" }}>
                  No saved accounts. Use another account below.
                </div>
              ) : (
                accounts.map((user, i) => (
                  <div
                    key={i}
                    onClick={() => handleAccountClick(user)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "12px 24px",
                      cursor: "pointer",
                      transition: "background 0.15s",
                      borderBottom: i < accounts.length - 1 ? "1px solid #f1f3f4" : "none",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8f9fa"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: avatarColor(user.email),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 500,
                      fontSize: "16px",
                      flexShrink: 0,
                      letterSpacing: "0.5px",
                    }}>
                      {getInitials(user.name || user.email)}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "14px", color: "#202124", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#5f6368", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {user.email}
                      </div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, opacity:0.4 }}>
                      <path d="M9 18l6-6-6-6" stroke="#5f6368" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ))
              )}

              {/* Use another account */}
              <div
                onClick={handleUseAnother}
                style={{
                  display: "flex", alignItems: "center", gap: "16px",
                  padding: "12px 24px", cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8f9fa"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{
                  width: "40px", height: "40px", borderRadius: "50%",
                  background: "#f1f3f4", display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" fill="#5f6368"/>
                  </svg>
                </div>
                <span style={{ fontSize: "14px", color: "#202124", fontWeight: 400 }}>Use another account</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #e8eaed", background: "#f8f9fa" }}>
              <p style={{ fontSize: "12px", color: "#5f6368", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
                Before using this app, you can review{" "}
                <span style={{ color: "#1a73e8", cursor: "pointer" }}>Privacy Policy</span>
                {" "}and{" "}
                <span style={{ color: "#1a73e8", cursor: "pointer" }}>Terms of Service</span>
              </p>
            </div>
          </>
        )}

        {/* ── USE ANOTHER ACCOUNT VIEW ── */}
        {view === "another" && (
          <>
            <div style={{ padding: "28px 28px 20px", textAlign: "center" }}>
              <svg width="75" height="24" viewBox="0 0 272 92" style={{ marginBottom: "20px" }}>
                <path fill="#4285F4" d="M35.29 41.41V32h31.46c.31 1.64.47 3.58.47 5.68 0 7.06-1.93 15.79-8.15 22.01-6.05 6.3-13.78 9.66-24.02 9.66C16.32 69.35.36 53.89.36 35.28.36 16.67 16.32 1.21 34.85 1.21c10.5 0 17.98 4.12 23.6 9.49l-6.64 6.64c-4.03-3.78-9.49-6.72-16.97-6.72-13.86 0-24.7 11.17-24.7 25.03 0 13.86 10.84 25.03 24.7 25.03 8.99 0 14.11-3.61 17.39-6.89 2.66-2.66 4.41-6.46 5.1-11.65l-22.04.07z"/>
              </svg>
              <h2 style={{ fontSize: "22px", fontWeight: 400, color: "#202124", margin: "0 0 8px" }}>Sign in</h2>
              <p style={{ fontSize: "14px", color: "#5f6368", margin: "0 0 20px" }}>
                Use your Google Account
              </p>
            </div>

            <form onSubmit={handleAnotherContinue} style={{ padding: "0 28px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {error && (
                <div style={{ fontSize: "13px", color: "#d93025", background: "#fce8e6", border: "1px solid #f5c6c5", borderRadius: "8px", padding: "10px 14px" }}>
                  {error}
                </div>
              )}
              <div>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={e => setManualEmail(e.target.value)}
                  placeholder="Email or phone"
                  autoFocus
                  style={{
                    width: "100%", padding: "14px 16px", border: "1px solid #dadce0",
                    borderRadius: "4px", fontSize: "16px", color: "#202124",
                    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "#1a73e8"}
                  onBlur={e => e.target.style.borderColor = "#dadce0"}
                />
                <p style={{ fontSize: "12px", color: "#5f6368", margin: "8px 0 0" }}>
                  Not your computer? Use a private browsing window to sign in.
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setView("chooser")}
                  style={{ background: "none", border: "none", color: "#1a73e8", fontSize: "14px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", padding: "10px 0" }}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  style={{
                    background: "#1a73e8", color: "#fff", border: "none", borderRadius: "4px",
                    padding: "10px 24px", fontSize: "14px", fontWeight: 500, cursor: "pointer",
                    fontFamily: "inherit", transition: "background 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#1557b0"}
                  onMouseLeave={e => e.currentTarget.style.background = "#1a73e8"}
                >
                  Next →
                </button>
              </div>
            </form>

            <div style={{ padding: "14px 24px", borderTop: "1px solid #e8eaed", background: "#f8f9fa" }}>
              <p style={{ fontSize: "12px", color: "#5f6368", textAlign: "center", margin: 0 }}>
                <span style={{ color: "#1a73e8", cursor: "pointer" }}>Create account</span>
              </p>
            </div>
          </>
        )}

        {/* ── PASSWORD VIEW ── */}
        {view === "password" && selectedUser && (
          <>
            <div style={{ padding: "28px 28px 20px", textAlign: "center" }}>
              <svg width="75" height="24" viewBox="0 0 272 92" style={{ marginBottom: "20px" }}>
                <path fill="#4285F4" d="M35.29 41.41V32h31.46c.31 1.64.47 3.58.47 5.68 0 7.06-1.93 15.79-8.15 22.01-6.05 6.3-13.78 9.66-24.02 9.66C16.32 69.35.36 53.89.36 35.28.36 16.67 16.32 1.21 34.85 1.21c10.5 0 17.98 4.12 23.6 9.49l-6.64 6.64c-4.03-3.78-9.49-6.72-16.97-6.72-13.86 0-24.7 11.17-24.7 25.03 0 13.86 10.84 25.03 24.7 25.03 8.99 0 14.11-3.61 17.39-6.89 2.66-2.66 4.41-6.46 5.1-11.65l-22.04.07z"/>
              </svg>
              <h2 style={{ fontSize: "22px", fontWeight: 400, color: "#202124", margin: "0 0 16px" }}>Welcome</h2>

              {/* Account chip */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "10px",
                border: "1px solid #dadce0", borderRadius: "24px", padding: "6px 16px 6px 6px",
                marginBottom: "8px",
              }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  background: avatarColor(selectedUser.email),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: "13px", fontWeight: 500,
                }}>
                  {getInitials(selectedUser.name || selectedUser.email)}
                </div>
                <span style={{ fontSize: "14px", color: "#202124" }}>{selectedUser.email}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M7 10l5 5 5-5" stroke="#5f6368" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} style={{ padding: "0 28px 28px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {error && (
                <div style={{ fontSize: "13px", color: "#d93025", background: "#fce8e6", border: "1px solid #f5c6c5", borderRadius: "8px", padding: "10px 14px" }}>
                  {error}
                </div>
              )}

              <div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoFocus
                  style={{
                    width: "100%", padding: "14px 16px", border: "1px solid #dadce0",
                    borderRadius: "4px", fontSize: "16px", color: "#202124",
                    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                  }}
                  onFocus={e => e.target.style.borderColor = "#1a73e8"}
                  onBlur={e => e.target.style.borderColor = "#dadce0"}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px" }}>
                  <input type="checkbox" id="showpwd" onChange={e => {
                    const input = document.querySelector('input[type="password"], input[type="text"][placeholder="Enter your password"]');
                    if (input) input.type = e.target.checked ? "text" : "password";
                  }} style={{ cursor: "pointer" }} />
                  <label htmlFor="showpwd" style={{ fontSize: "13px", color: "#5f6368", cursor: "pointer" }}>Show password</label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => { setView("chooser"); setError(""); setPassword(""); }}
                  style={{ background: "none", border: "none", color: "#1a73e8", fontSize: "14px", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", padding: "10px 0" }}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  style={{
                    background: "#1a73e8", color: "#fff", border: "none", borderRadius: "4px",
                    padding: "10px 28px", fontSize: "14px", fontWeight: 500, cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#1557b0"}
                  onMouseLeave={e => e.currentTarget.style.background = "#1a73e8"}
                >
                  Next →
                </button>
              </div>
            </form>

            <div style={{ padding: "14px 24px", borderTop: "1px solid #e8eaed", background: "#f8f9fa" }}>
              <p style={{ fontSize: "12px", color: "#5f6368", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
                Before using this app, you can review{" "}
                <span style={{ color: "#1a73e8", cursor: "pointer" }}>Privacy Policy</span>
                {" "}and{" "}
                <span style={{ color: "#1a73e8", cursor: "pointer" }}>Terms of Service</span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
