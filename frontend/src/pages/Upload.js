import ZTAStatusDashboard from "../components/ZTAStatusDashboard";
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:5001";

function sanitize(val) {
  return val.replace(/[<>'"]/g, "").substring(0, 100);
}

function validateFile(file) {
  if (!file) return "Please select a file.";
  if (file.type !== "application/pdf") return "Only PDF files are accepted.";
  if (file.size > 10 * 1024 * 1024) return "File must be under 10MB.";
  return null;
}

export default function Upload() {
  const navigate  = useNavigate();
  const inputRef  = useRef();

  const [file,          setFile]          = useState(null);
  const [jobRole,       setJobRole]       = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [error,         setError]         = useState("");
  const [status,        setStatus]        = useState("idle");
  const [drag,          setDrag]          = useState(false);
  const [isBlocked,     setIsBlocked]     = useState(false);

  React.useEffect(() => {
    async function checkBlocked() {
      try {
        const res = await fetch(`${API}/api/zta-status`);
        const data = await res.json();
        if (data.fraudAlert) {
          setIsBlocked(true);
          setError("ZTA ALERT: This session has been blocked due to suspicious activity, headless testing, or policy violations.");
        } else {
          setIsBlocked(false);
        }
      } catch (e) {
        setIsBlocked(false);
      }
    }
    checkBlocked();
    const interval = setInterval(checkBlocked, 5000);
    return () => clearInterval(interval);
  }, []);

  function handleFile(f) {
    const err = validateFile(f);
    if (err) { setError(err); setFile(null); return; }
    setError("");
    setFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function handleSubmit() {
    if (validateFile(file)) { setError(validateFile(file)); return; }
    if (!jobRole.trim())     { setError("Please enter the job role."); return; }
    if (!candidateName.trim()) { setError("Please enter your name."); return; }

    setError("");

    try {
      setStatus("connecting");
      const sessionRes = await fetch(`${API}/api/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const sessionData = await sessionRes.json();
      const token = sessionData.token;

      setStatus("uploading");
      const formData = new FormData();
      formData.append("resume", file);

      const uploadRes = await fetch(`${API}/api/resume/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

      setStatus("generating");
      const qRes = await fetch(`${API}/api/interview/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          resumeText:    uploadData.resumeText,
          jobRole:       sanitize(jobRole),
          candidateName: sanitize(candidateName),
        }),
      });
      const qData = await qRes.json();
      if (!qRes.ok) throw new Error(qData.error || "Failed to generate questions");

      setStatus("done");

      sessionStorage.setItem("token", token);
      sessionStorage.setItem("zta_token", token);
      sessionStorage.setItem("ztaToken", token);
      sessionStorage.setItem("ztaRole", "candidate");
      sessionStorage.setItem("ztaIssuedAt", Date.now().toString());
      sessionStorage.setItem("resumeText",    uploadData.resumeText);
      sessionStorage.setItem("jobRole",       jobRole.trim());
      sessionStorage.setItem("candidateName", candidateName.trim());
      sessionStorage.setItem("questions",     JSON.stringify(qData.questions));
      sessionStorage.setItem("biasReport",    JSON.stringify(qData.biasReport));

      navigate("/interview");

    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  const busy = ["connecting", "uploading", "generating"].includes(status);

  return (
    <div style={styles.page}>
      {/* Navbar header */}
      <header style={styles.navbar} className="glass-card">
        <div style={styles.logo}>
          <span style={{ marginRight: 6 }}>🤖</span> TrustInterview AI
        </div>
        <div style={styles.navBadge}>
          <span style={styles.livePulse} />
          SECURE SANDBOX ENVIRONMENT
        </div>
      </header>

      {/* Main Container Dashboard */}
      <main style={styles.mainContainer}>
        <div style={styles.grid}>
          {/* Left Column: ZTA Status Dashboard */}
          <div style={styles.leftCol}>
            <ZTAStatusDashboard />
          </div>

          {/* Right Column: Upload Card */}
          <div className="glass-card fade-in-up" style={styles.card}>
            <h1 style={styles.title}>Start Your Assessment</h1>
            <p style={styles.sub}>
              Fill in your details and drop your resume. Our AI interviewer will analyze your background and generate a customized technical interview.
            </p>

            {/* ZTA Info chips */}
            <div style={styles.chipContainer}>
              <span className="badge badge-primary">Session Auth</span>
              <span className="badge badge-primary">PDF Guard</span>
              <span className="badge badge-primary">Dynamic Sanitization</span>
              <span className="badge badge-primary">AI Bias Shield</span>
            </div>

            {/* Field: Full Name */}
            <div style={styles.field}>
              <label style={styles.label}>
                Your Full Name
                <span className="badge badge-warning" style={{ fontSize: 9, padding: "2px 6px" }}>Bias Checked</span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Sneha Sharma"
                value={candidateName}
                maxLength={100}
                onChange={e => setCandidateName(sanitize(e.target.value))}
                disabled={busy}
              />
              <small style={styles.hint}>
                🔒 Scrambled under Layer 12. Evaluation models analyze only your content, never your name or identity.
              </small>
            </div>

            {/* Field: Job Role */}
            <div style={styles.field}>
              <label style={styles.label}>Target Job Role</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Senior Frontend Engineer"
                value={jobRole}
                maxLength={100}
                onChange={e => setJobRole(sanitize(e.target.value))}
                disabled={busy}
              />
            </div>

            {/* File Drop Zone */}
            <div
              style={{
                ...styles.dropZone,
                borderColor: drag ? "var(--color-primary)" : file ? "var(--color-success)" : "rgba(255, 255, 255, 0.15)",
                background:  drag ? "rgba(139, 92, 246, 0.05)" : file ? "rgba(16, 185, 129, 0.05)" : "rgba(255, 255, 255, 0.01)",
                boxShadow:   drag ? "var(--shadow-glow)" : file ? "var(--shadow-success-glow)" : "none",
              }}
              onClick={() => !busy && inputRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0])}
              />
              {file ? (
                <div style={styles.fileReady}>
                  <span style={{ fontSize: 32 }}>📄</span>
                  <div style={{ textAlign: "left", flex: 1 }}>
                    <div style={styles.fileName}>{file.name}</div>
                    <div style={styles.fileMeta}>{(file.size / 1024).toFixed(0)} KB · PDF Format Verified</div>
                  </div>
                  <button
                    style={styles.clearBtn}
                    onClick={e => { e.stopPropagation(); setFile(null); }}
                  >✕ Remove</button>
                </div>
              ) : (
                <div style={styles.dropPrompt}>
                  <span style={{ fontSize: 28, color: "var(--text-muted)" }}>⬆️</span>
                  <p style={{ margin: "10px 0 4px", fontWeight: 600, color: "var(--text-main)", fontSize: 14 }}>
                    Drop your PDF resume here or <span style={{ color: "var(--color-primary)", textDecoration: "underline", cursor: "pointer" }}>browse files</span>
                  </p>
                  <small style={{ color: "var(--text-muted)", fontSize: 11 }}>Only PDF allowed · Max 10MB file size</small>
                </div>
              )}
            </div>

            {error && (
              <div style={styles.errorBox} className="badge-error">
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Actions */}
            <button
              className="glow-btn"
              style={{
                width: "100%",
                marginTop: 8,
                padding: "14px",
                fontSize: 15,
                background: (busy || isBlocked || !file || !jobRole.trim() || !candidateName.trim()) 
                  ? "rgba(255, 255, 255, 0.05)" 
                  : "linear-gradient(135deg, var(--color-primary), #6366f1)"
              }}
              onClick={handleSubmit}
              disabled={busy || isBlocked || !file || !jobRole.trim() || !candidateName.trim()}
            >
              {status === "connecting"  && "Establishing secure session…"}
              {status === "uploading"   && "Uploading & parsing resume…"}
              {status === "generating"  && "AI generating questions…"}
              {status === "idle"        && "Start Interview →"}
              {status === "done"        && "Ready! Redirecting…"}
            </button>

            {/* Progress indicators when busy */}
            {busy && (
              <div style={styles.progressWrap}>
                {[
                  { key: "connecting",  label: "1. Handshaking secure session token" },
                  { key: "uploading",   label: "2. Uploading & extracting text blocks" },
                  { key: "generating",  label: "3. Generating interview questions + setting bias guards" },
                ].map(step => {
                  const isActive = status === step.key;
                  return (
                    <div key={step.key} style={{
                      ...styles.progressStep,
                      color: isActive ? "var(--color-primary)" : "var(--text-muted)",
                      fontWeight: isActive ? 600 : 400,
                    }}>
                      {isActive ? (
                        <span style={styles.miniSpinner} />
                      ) : (
                        <span style={{ fontSize: 10, marginRight: 8 }}>○</span>
                      )}
                      {step.label}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    padding: "24px 20px 48px",
    position: "relative",
    zIndex: 1,
  },
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 28px",
    maxWidth: 1200,
    width: "100%",
    margin: "0 auto 32px",
    borderRadius: 14,
    background: "rgba(17, 24, 39, 0.45)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  logo: {
    fontFamily: "var(--font-headings)",
    fontSize: 18,
    fontWeight: 800,
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
  },
  navBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: "var(--color-secondary)",
    background: "rgba(6, 182, 212, 0.1)",
    border: "1px solid rgba(6, 182, 212, 0.2)",
    padding: "5px 12px",
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "var(--font-headings)",
    letterSpacing: "0.05em",
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--color-secondary)",
    display: "inline-block",
    boxShadow: "0 0 8px var(--color-secondary)",
    animation: "pulse 1.5s infinite ease-in-out",
  },
  mainContainer: {
    maxWidth: 1200,
    width: "100%",
    margin: "0 auto",
    flex: 1,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: 32,
    alignItems: "start",
  },
  leftCol: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  card: {
    padding: "32px 36px",
    background: "rgba(17, 24, 39, 0.55)",
    borderRadius: 20,
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.4)",
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    color: "#ffffff",
    marginBottom: 10,
    fontFamily: "var(--font-headings)",
    letterSpacing: "-0.01em",
  },
  sub: {
    color: "var(--text-muted)",
    fontSize: 13.5,
    lineHeight: 1.6,
    marginBottom: 20,
  },
  chipContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 12.5,
    fontWeight: 600,
    color: "#cbd5e1",
    marginBottom: 8,
    fontFamily: "var(--font-headings)",
  },
  hint: {
    display: "block",
    marginTop: 6,
    fontSize: 11,
    color: "var(--text-muted)",
    lineHeight: 1.4,
  },
  dropZone: {
    border: "1.5px dashed",
    borderRadius: 12,
    padding: "28px 24px",
    textAlign: "center",
    cursor: "pointer",
    marginBottom: 20,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  dropPrompt: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  fileReady: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  fileName: {
    fontWeight: 600,
    fontSize: 14,
    color: "#ffffff",
    wordBreak: "break-all",
  },
  fileMeta: {
    fontSize: 11.5,
    color: "var(--text-muted)",
    marginTop: 4,
  },
  clearBtn: {
    background: "rgba(244, 63, 94, 0.1)",
    border: "1px solid rgba(244, 63, 94, 0.2)",
    color: "var(--color-error)",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 600,
    fontFamily: "var(--font-headings)",
    transition: "all 0.2s",
  },
  errorBox: {
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 13,
    fontWeight: 500,
    color: "#f43f5e",
    background: "rgba(244, 63, 94, 0.08)",
    border: "1px solid rgba(244, 63, 94, 0.15)",
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  progressWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 18,
    background: "rgba(255, 255, 255, 0.02)",
    borderRadius: 8,
    padding: 12,
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  progressStep: {
    fontSize: 11.5,
    display: "flex",
    alignItems: "center",
    fontFamily: "var(--font-headings)",
  },
  miniSpinner: {
    display: "inline-block",
    width: 10,
    height: 10,
    border: "2px solid rgba(255, 255, 255, 0.1)",
    borderTopColor: "var(--color-primary)",
    borderRadius: "50%",
    marginRight: 8,
    animation: "spin 0.6s linear infinite",
  },
};

if (typeof window !== "undefined") {
  sessionStorage.setItem("ztaRole", "candidate");
  sessionStorage.setItem("ztaFingerprint", (() => {
    const raw = `${navigator.userAgent}|${navigator.language}|${Intl.DateTimeFormat().resolvedOptions().timeZone}|${window.screen.width}x${window.screen.height}`;
    let h = 0;
    for (let i = 0; i < raw.length; i++) { h = ((h << 5) - h) + raw.charCodeAt(i); h |= 0; }
    return Math.abs(h).toString(16).padStart(8, "0");
  })());
  sessionStorage.setItem("ztaIssuedAt", Date.now().toString());
}
