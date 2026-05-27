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
      // Get session token
      setStatus("connecting");
      const sessionRes = await fetch(`${API}/api/auth/session`, { method: "POST" });
      const sessionData = await sessionRes.json();
      const token = sessionData.token;

      // Upload resume
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

      // Generate questions — send candidateName so bias filter uses it
      setStatus("generating");
      const qRes = await fetch(`${API}/api/interview/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          resumeText:    uploadData.resumeText,
          jobRole:       sanitize(jobRole),
          candidateName: sanitize(candidateName),  // ← sent to backend
        }),
      });
      const qData = await qRes.json();
      if (!qRes.ok) throw new Error(qData.error || "Failed to generate questions");

      setStatus("done");

      // Store everything in sessionStorage for interview page
      sessionStorage.setItem("token",         token);
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
      <div style={styles.card}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>🤖 AI Interview Bot</div>
          <div style={styles.ztaBadge}>🛡️ ZTA Secured — 12 Layers Active</div>
        </div>

        <h1 style={styles.title}>Start Your Interview</h1>
        <p style={styles.sub}>Upload your resume and we'll generate personalised questions</p>

        {/* ZTA info */}
        <div style={styles.ztaStrip}>
          <span style={styles.chip}>ZTA L1</span> Session auth
          <span style={styles.chip}>ZTA L4</span> PDF only
          <span style={styles.chip}>ZTA L5</span> File deleted after parsing
          <span style={styles.chip}>ZTA L12</span> Bias filter active
        </div>

        {/* Candidate name — used for bias filter */}
        <div style={styles.field}>
          <label style={styles.label}>
            Your Full Name
            <span style={styles.biasTag}>Used by Bias Filter</span>
          </label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. Sneha Sharma"
            value={candidateName}
            maxLength={100}
            onChange={e => setCandidateName(sanitize(e.target.value))}
            disabled={busy}
          />
          <small style={styles.hint}>
            🛡️ Your name is added to the bias filter so the AI never references you personally in feedback
          </small>
        </div>

        {/* Job role */}
        <div style={styles.field}>
          <label style={styles.label}>Job Role You're Applying For</label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. Senior Frontend Engineer"
            value={jobRole}
            maxLength={100}
            onChange={e => setJobRole(sanitize(e.target.value))}
            disabled={busy}
          />
        </div>

        {/* Drop zone */}
        <div
          style={{
            ...styles.dropZone,
            borderColor: drag ? "#6366f1" : file ? "#16a34a" : "#e5e7eb",
            background:  drag ? "#eef2ff" : file ? "#f0fdf4" : "#fafafa",
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
              <span style={{ fontSize: 28 }}>📄</span>
              <div>
                <div style={styles.fileName}>{file.name}</div>
                <div style={styles.fileMeta}>{(file.size / 1024).toFixed(0)} KB · PDF · ✅ Valid</div>
              </div>
              <button
                style={styles.clearBtn}
                onClick={e => { e.stopPropagation(); setFile(null); }}
              >✕</button>
            </div>
          ) : (
            <div style={styles.dropPrompt}>
              <span style={{ fontSize: 32 }}>⬆️</span>
              <p style={{ margin: "8px 0 4px", fontWeight: 500 }}>
                Drop your PDF here or <u>click to browse</u>
              </p>
              <small style={{ color: "#9ca3af" }}>PDF only · max 10MB</small>
            </div>
          )}
        </div>

        {error && (
          <div style={styles.errorBox}>⚠️ {error}</div>
        )}

        <button
          style={{
            ...styles.submitBtn,
            opacity: (busy || !file || !jobRole.trim() || !candidateName.trim()) ? 0.5 : 1,
            cursor:  (busy || !file || !jobRole.trim() || !candidateName.trim()) ? "not-allowed" : "pointer",
          }}
          onClick={handleSubmit}
          disabled={busy || !file || !jobRole.trim() || !candidateName.trim()}
        >
          {status === "connecting"  && "⏳ Establishing secure session…"}
          {status === "uploading"   && "⏳ Uploading & parsing resume…"}
          {status === "generating"  && "⏳ AI generating questions…"}
          {status === "idle"        && "Start Interview →"}
          {status === "done"        && "✅ Ready!"}
        </button>

        {/* Progress steps */}
        {busy && (
          <div style={styles.progressWrap}>
            {[
              { key: "connecting",  label: "1. Secure session (ZTA L1)" },
              { key: "uploading",   label: "2. Upload & extract text (ZTA L5)" },
              { key: "generating",  label: "3. AI generates questions + bias filter (ZTA L12)" },
            ].map(step => (
              <div key={step.key} style={{
                ...styles.progressStep,
                color:      status === step.key ? "#6366f1" : "#9ca3af",
                fontWeight: status === step.key ? 600 : 400,
              }}>
                {status === step.key ? "⏳" : "○"} {step.label}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  page:        { minHeight: "100vh", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  card:        { background: "#fff", borderRadius: 16, padding: 32, width: "100%", maxWidth: 520, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  logo:        { fontSize: 18, fontWeight: 800, color: "#1e293b" },
  ztaBadge:    { fontSize: 11, background: "#f0fdf4", color: "#15803d", padding: "4px 10px", borderRadius: 99, border: "1px solid #86efac", fontWeight: 600 },
  title:       { fontSize: 26, fontWeight: 800, color: "#1e293b", margin: "0 0 8px" },
  sub:         { color: "#64748b", fontSize: 14, margin: "0 0 20px" },
  ztaStrip:    { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#475569", marginBottom: 20, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  chip:        { background: "#6366f1", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 },
  field:       { marginBottom: 16 },
  label:       { display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  biasTag:     { fontSize: 10, background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 4, border: "1px solid #fcd34d", fontWeight: 600 },
  input:       { width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" },
  hint:        { display: "block", marginTop: 6, fontSize: 11, color: "#6b7280" },
  dropZone:    { border: "2px dashed", borderRadius: 12, padding: 24, textAlign: "center", cursor: "pointer", marginBottom: 16, transition: "all 0.2s" },
  dropPrompt:  { color: "#6b7280" },
  fileReady:   { display: "flex", alignItems: "center", gap: 12 },
  fileName:    { fontWeight: 600, fontSize: 14, color: "#1e293b" },
  fileMeta:    { fontSize: 12, color: "#6b7280", marginTop: 2 },
  clearBtn:    { marginLeft: "auto", background: "#fee2e2", border: "none", color: "#dc2626", borderRadius: 6, padding: "4px 8px", cursor: "pointer" },
  errorBox:    { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginBottom: 12 },
  submitBtn:   { width: "100%", padding: "13px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 12 },
  progressWrap:{ display: "flex", flexDirection: "column", gap: 6 },
  progressStep:{ fontSize: 12, padding: "4px 0" },
};
