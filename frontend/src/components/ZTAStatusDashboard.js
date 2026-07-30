import React, { useState, useEffect } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:5001";

export default function ZTAStatusDashboard() {
  const [status,  setStatus]  = useState(null);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchStatus() {
    try {
      const res  = await fetch(`${API}/api/zta-status`);
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;

  const on = status?.ztaEnabled;
  const isFraud = status?.fraudAlert;

  return (
    <div style={s.wrap} className="fade-in-up">
      {/* Top banner — always visible */}
      <div style={{ 
        ...s.banner, 
        borderColor: isFraud ? "rgba(239, 68, 68, 0.5)" : (on ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"),
        background: isFraud ? "rgba(220, 38, 38, 0.15)" : (on ? "rgba(6, 78, 59, 0.15)" : "rgba(159, 18, 57, 0.15)"),
        boxShadow: isFraud ? "0 0 15px rgba(239, 68, 68, 0.1)" : (on ? "0 0 15px rgba(16, 185, 129, 0.05)" : "0 0 15px rgba(244, 63, 94, 0.05)")
      }}>
        <div style={s.bannerLeft}>
          <span style={{ 
            fontSize: 20, 
            animation: isFraud || !on ? "pulse 1.2s infinite ease-in-out" : "none" 
          }}>
            {isFraud ? "🛑" : (on ? "🛡️" : "⚠️")}
          </span>
          <div>
            <div style={{ ...s.bannerTitle, color: isFraud ? "#ef4444" : (on ? "#10b981" : "#f43f5e") }}>
              {isFraud ? "ZTA BLOCKED — FRAUD/TAMPERING DETECTED" : (on ? `ZTA SECURED — ${status?.layers?.length || 13} Layers Active` : "ZTA VULNERABLE MODE — SECURITY DISABLED")}
            </div>
            <div style={s.bannerSub}>
              {isFraud
                ? `Threat Level: ${status?.threatLevel?.toUpperCase()} [${(status?.threatDetails || []).join(", ")}] — Session Terminated`
                : (on
                  ? "End-to-end zero trust validation active for this candidate session"
                  : "No session token auth · No CORS control · No bias filter · Risk of data manipulation")}
            </div>
          </div>
        </div>
        <button
          style={{ 
            ...s.toggleBtn, 
            borderColor: isFraud ? "rgba(239, 68, 68, 0.4)" : (on ? "rgba(16, 185, 129, 0.4)" : "rgba(244, 63, 94, 0.4)"), 
            color: isFraud ? "#ef4444" : (on ? "#34d399" : "#fb7185"),
            background: "rgba(255, 255, 255, 0.03)"
          }}
          onClick={() => setOpen(o => !o)}
        >
          {open ? "Hide Details ▲" : "Show Security Layers ▼"}
        </button>
      </div>

      {/* Expandable layer grid */}
      {open && status && (
        <div style={s.panel} className="glass-card">
          <div style={s.panelTitle}>
            ZERO TRUST SECURITY ARCHITECTURE LAYER MATRIX
          </div>
          <div style={s.grid}>
            {status.layers.map(l => {
              const active = l.status === "active";
              const blocked = l.status === "BLOCKED";
              return (
                <div
                  key={l.id}
                  style={{
                    ...s.layerCard,
                    borderColor: blocked ? "rgba(239, 68, 68, 0.3)" : (active ? "rgba(255, 255, 255, 0.08)" : "rgba(244, 63, 94, 0.1)"),
                    background:  blocked ? "rgba(220, 38, 38, 0.03)" : (active ? "rgba(17, 24, 39, 0.4)" : "rgba(244, 63, 94, 0.02)"),
                    boxShadow: active ? "none" : "inset 0 0 10px rgba(244, 63, 94, 0.02)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: blocked ? "#f87171" : (active ? "#c084fc" : "#f43f5e"), fontFamily: "monospace" }}>
                      {l.id}
                    </span>
                    <span style={{
                      fontSize: 8, fontWeight: 700, fontFamily: "monospace",
                      color: blocked ? "#ef4444" : (active ? "#10b981" : "#f43f5e"),
                      background: blocked ? "rgba(220, 38, 38, 0.1)" : (active ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)"),
                      padding: "2px 5px", borderRadius: 4,
                      border: `1px solid ${blocked ? "rgba(220, 38, 38, 0.2)" : (active ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)")}`,
                    }}>
                      {l.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: blocked ? "#f87171" : (active ? "#d1d5db" : "#9ca3af"), marginTop: 8, fontWeight: 500 }}>
                    {l.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Risks/Safes Box */}
          {isFraud ? (
            <div style={{ ...s.riskBox, borderColor: "rgba(239, 68, 68, 0.3)", background: "rgba(220, 38, 38, 0.05)" }}>
              <div style={{ ...s.riskTitle, color: "#ef4444" }}>🛑 ACTIVE SECURITY THREAT DETECTED (SESSION TERMINATED)</div>
              <div style={s.riskGrid}>
                {[
                  "Headless browser / automation testing agent detected (L2 Device Fingerprinting alert)",
                  "Request matched a threat signature (SQL Injection, Path Traversal, or shell commands blocked)",
                  "SOAR auto-blocking triggered due to abnormal frequency of client-side request failures",
                  "Input sanitisation scanner blocked payload due to prohibited XSS elements or key leakage",
                  "Cross-Origin Resource Sharing (CORS) microsegmentation blocks unauthorized client execution",
                ].map((r, i) => (
                  <div key={i} style={s.riskRow}>
                    <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 14 }}>✕</span>
                    <span style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.5 }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : !on ? (
            <div style={s.riskBox}>
              <div style={s.riskTitle}>⚠️ IMMEDIATE SECURITY RISKS (VULNERABLE DEMO MODE)</div>
              <div style={s.riskGrid}>
                {[
                  "Anyone can call the API directly without a session token (no L1 auth)",
                  "Scanning and hacking tools (SQLMap, Nikto) will not be blocked (no L2 device fingerprinting)",
                  "Any script or remote domain can steal candidates' interview data (no L3 CORS lock)",
                  "XSS injections and malicious prompt payloads bypass validation (no L8 governance)",
                  "No audit trail is written, leaving no log of who accessed the backend (no L6 audit logging)",
                  "Raw unverified AI output is shown without toxic bias detection (no L12 bias filter)",
                ].map((r, i) => (
                  <div key={i} style={s.riskRow}>
                    <span style={{ color: "#f43f5e", fontWeight: 700, fontSize: 14 }}>✕</span>
                    <span style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.5 }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={s.safeBox}>
              <div style={s.safeTitle}>🛡️ SECURITY COMPLIANCE STANDARDS (ZTA ACTIVE)</div>
              <div style={s.safeGrid}>
                {[
                  "L1 Identity: Cryptographic session signatures checked on every incoming request",
                  "L2 Device: Browser telemetry analyzed to identify and drop headless testing agents",
                  "L3 Microsegmentation: Tight CORS origins block unauthorized scripts and domains",
                  "L8 Input Governance: Payload sanitisers run prior to database and AI submission",
                  "L6 Non-repudiation: Access attempts logged continuously to structured audit database",
                  "L12 AI Fairness: Deep sentiment analysis filters out gender, race, and age references",
                ].map((r, i) => (
                  <div key={i} style={s.safeRow}>
                    <span style={{ color: "#10b981", fontWeight: 700, fontSize: 14 }}>✓</span>
                    <span style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.5 }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:       { width: "100%", fontFamily: "var(--font-body)", display: "flex", flexDirection: "column", gap: 12 },
  banner:     { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderRadius: "12px", border: "1px solid", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" },
  bannerLeft: { display: "flex", alignItems: "center", gap: 14 },
  bannerTitle:{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-headings)", letterSpacing: "0.02em" },
  bannerSub:  { fontSize: 12, color: "#9ca3af", marginTop: 4, lineHeight: 1.4 },
  toggleBtn:  { fontSize: 11, fontWeight: 600, padding: "8px 14px", border: "1px solid", borderRadius: 8, cursor: "pointer", fontFamily: "var(--font-headings)", transition: "all 0.2s" },
  panel:      { padding: 20, background: "rgba(17, 24, 39, 0.4)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 12 },
  panelTitle: { fontSize: 11, fontWeight: 700, color: "#9ca3af", fontFamily: "var(--font-headings)", marginBottom: 16, letterSpacing: "0.08em" },
  grid:       { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 20 },
  layerCard:  { border: "1px solid", borderRadius: 8, padding: 12, transition: "all 0.2s" },
  riskBox:    { background: "rgba(244, 63, 94, 0.04)", border: "1px solid rgba(244, 63, 94, 0.2)", borderRadius: 8, padding: 16 },
  riskTitle:  { fontSize: 12, fontWeight: 700, color: "#f43f5e", fontFamily: "var(--font-headings)", marginBottom: 12, letterSpacing: "0.02em" },
  riskGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" },
  riskRow:    { display: "flex", gap: 10, alignItems: "flex-start" },
  safeBox:    { background: "rgba(16, 185, 129, 0.04)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 8, padding: 16 },
  safeTitle:  { fontSize: 12, fontWeight: 700, color: "#10b981", fontFamily: "var(--font-headings)", marginBottom: 12, letterSpacing: "0.02em" },
  safeGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" },
  safeRow:    { display: "flex", gap: 10, alignItems: "flex-start" },
};
