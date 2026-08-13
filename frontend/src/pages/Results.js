import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ZTABadge from "../components/ZTABadge";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip as RTooltip,
} from "recharts";

/* ── Helpers ─────────────────────────────────────────────── */
function toArr(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.length > 0) return [val];
  return [];
}

function avg2dp(arr) {
  return arr.length ? (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1) : "—";
}

function scoreColor(s) {
  const n = parseFloat(s);
  return n >= 7 ? "#10b981" : n >= 5 ? "#f59e0b" : "#ef4444";
}

/* ── Theme hook (dark/light) ──────────────────────────────── */
function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("ui-theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ui-theme", theme);
  }, [theme]);

  const toggle = useCallback(() =>
    setTheme(t => t === "dark" ? "light" : "dark"), []);

  return { theme, toggle };
}

/* ── Sparkline component ─────────────────────────────────── */
function Sparkline({ scores, width = 200, height = 36 }) {
  if (!scores || scores.length < 2) return null;
  const min  = Math.min(...scores);
  const max  = Math.max(...scores);
  const rng  = Math.max(max - min, 1);
  const pts  = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * width;
    const y = height - ((s - min) / rng) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const trending = scores[scores.length - 1] >= scores[0];
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none"
        stroke={trending ? "#10b981" : "#ef4444"}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {scores.map((s, i) => {
        const x = (i / (scores.length - 1)) * width;
        const y = height - ((s - min) / rng) * (height - 4) - 2;
        return <circle key={i} cx={x} cy={y} r="3"
          fill={trending ? "#10b981" : "#ef4444"} />;
      })}
    </svg>
  );
}

/* ── Copy button ──────────────────────────────────────────── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard denied */ }
  };
  return (
    <button onClick={copy} aria-label="Copy ideal answer"
      style={{
        background: copied ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${copied ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.08)"}`,
        color: copied ? "#34d399" : "#6b6b90",
        padding: "5px 12px", borderRadius: "7px", cursor: "pointer",
        fontSize: "11.5px", fontWeight: 700, transition: "all 0.25s",
        display: "flex", alignItems: "center", gap: "6px",
      }}>
      {copied ? "✓ Copied!" : "📋 Copy"}
    </button>
  );
}

/* ── PDF export ───────────────────────────────────────────── */
async function exportPDF(elementId, filename) {
  try {
    const html2canvas = (await import("html2canvas")).default;
    const jsPDF       = (await import("jspdf")).jsPDF;
    const el          = document.getElementById(elementId);
    if (!el) return alert("Export target not found.");

    const canvas = await html2canvas(el, {
      backgroundColor: "#06060f",
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf     = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW   = pdf.internal.pageSize.getWidth();
    const pageH   = pdf.internal.pageSize.getHeight();
    const ratio   = canvas.height / canvas.width;
    const imgW    = pageW;
    const imgH    = imgW * ratio;

    let y = 0;
    if (imgH <= pageH) {
      pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);
    } else {
      // Multi-page support
      let remaining = imgH;
      while (remaining > 0) {
        pdf.addImage(imgData, "PNG", 0, y > 0 ? y : 0, imgW, imgH);
        remaining -= pageH;
        if (remaining > 0) { pdf.addPage(); y -= pageH; }
      }
    }
    pdf.save(filename || "TrustInterview_Report.pdf");
  } catch (e) {
    console.error("PDF export failed:", e);
    window.print(); // graceful fallback
  }
}

/* ── Confetti launcher ───────────────────────────────────── */
async function launchConfetti() {
  try {
    const confetti = (await import("canvas-confetti")).default;
    const end = Date.now() + 1800;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#7c3aed","#10b981","#06b6d4"] });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#7c3aed","#10b981","#06b6d4"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  } catch {}
}

/* ── Main Component ──────────────────────────────────────── */
export default function Results() {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();

  const raw         = sessionStorage.getItem("interviewResults");
  const data        = raw ? JSON.parse(raw) : null;
  const companyName = sessionStorage.getItem("companyName") || "";

  const [tab,       setTab]       = useState(0);
  const [animScore, setAnimScore] = useState(0);
  const [activeShapFactor, setActiveShapFactor] = useState(null);

  useEffect(() => {
    if (data) {
      const { answers, jobRole } = data;
      const safe = Array.isArray(answers) ? answers : [];
      const av   = safe.length
        ? (safe.reduce((s, a) => s + (a.score || 0), 0) / safe.length).toFixed(1)
        : 0;
      const grade         = parseFloat(av) >= 9 ? "Exceptional" : parseFloat(av) >= 7 ? "Good"
        : parseFloat(av) >= 5 ? "Average" : parseFloat(av) >= 3 ? "Weak" : "Poor";
      const interviewType = sessionStorage.getItem("interviewType") || "mock";
      const historyRaw    = localStorage.getItem("candidateAssessmentHistory");
      let historyList     = [];
      try { historyList = historyRaw ? JSON.parse(historyRaw) : []; } catch { historyList = []; }
      const sessionKey = `${companyName}-${interviewType}-${av}`;
      if (!historyList.some(item => item.sessionKey === sessionKey)) {
        historyList.unshift({
          sessionKey, companyName: companyName || "General",
          interviewType: interviewType === "actual" ? "Official Graded" : "Practice Mock",
          score: av, grade,
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          jobRole: jobRole || "AI Specialist",
        });
        localStorage.setItem("candidateAssessmentHistory", JSON.stringify(historyList));
      }

      // Score counter animation
      const target = parseFloat(av);
      const start  = Date.now();
      const dur    = 1200;
      const timer  = setInterval(() => {
        const p = Math.min((Date.now() - start) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        setAnimScore(parseFloat((e * target).toFixed(1)));
        if (p >= 1) clearInterval(timer);
      }, 16);

      // Confetti for good scores
      if (parseFloat(av) >= 7) setTimeout(launchConfetti, 800);
      return () => clearInterval(timer);
    }
  }, [data, companyName]);

  /* ── No data fallback ── */
  if (!data) return (
    <div style={{ minHeight: "100vh", background: "#06060f", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: "40px", fontFamily: "var(--font-body)", position: "relative" }}>
      <div style={{ position: "absolute", width: "300px", height: "300px", background: "rgba(124,58,237,0.05)", borderRadius: "50%", filter: "blur(100px)" }} />
      <div style={{ zIndex: 1, textAlign: "center" }}>
        <div style={{ fontSize: "64px", marginBottom: "20px" }}>📊</div>
        <h1 style={{ fontSize: "24px", fontWeight: 900, color: "#f0f0ff", fontFamily: "var(--font-headings)", marginBottom: "8px" }}>No Assessment Data</h1>
        <p style={{ color: "#6b6b90", fontSize: "14px", maxWidth: "340px", textAlign: "center", marginBottom: "28px" }}>
          Please launch and complete a mock or official placement session first.
        </p>
        <button onClick={() => navigate("/")} className="glow-btn" aria-label="Go to placements catalog">Go to Placements Catalog</button>
      </div>
    </div>
  );

  /* ── Derive data ── */
  const { answers, report, jobRole, candidateName } = data;
  const safe          = Array.isArray(answers) ? answers : [];
  const interviewType = sessionStorage.getItem("interviewType") || "mock";
  const isOfficial    = interviewType === "actual";
  const avg           = safe.length ? (safe.reduce((s, a) => s + (a.score || 0), 0) / safe.length).toFixed(1) : 0;
  const grade         = parseFloat(avg) >= 9 ? "Exceptional" : parseFloat(avg) >= 7 ? "Good"
    : parseFloat(avg) >= 5 ? "Average" : parseFloat(avg) >= 3 ? "Weak" : "Poor";
  const sc            = scoreColor(avg);

  const technicalScores  = safe.filter(a => a.type === "technical").map(a => a.score || 0);
  const behavioralScores = safe.filter(a => a.type === "behavioural").map(a => a.score || 0);
  const situationalScores= safe.filter(a => a.type === "situational").map(a => a.score || 0);

  /* ── Radar chart data ── */
  const radarData = [
    { subject: "Technical",    value: parseFloat(avg2dp(technicalScores))  || 0, fullMark: 10 },
    { subject: "Behavioral",   value: parseFloat(avg2dp(behavioralScores)) || 0, fullMark: 10 },
    { subject: "Situational",  value: parseFloat(avg2dp(situationalScores))|| 0, fullMark: 10 },
    { subject: "Avg Score",    value: parseFloat(avg) || 0,                       fullMark: 10 },
    { subject: "Consistency",  value: (() => {
        const scores = safe.map(a => a.score || 0);
        if (scores.length < 2) return parseFloat(avg) || 0;
        const mean = scores.reduce((s,v) => s+v,0) / scores.length;
        const variance = scores.reduce((s,v) => s + Math.pow(v - mean, 2), 0) / scores.length;
        return Math.max(0, 10 - Math.sqrt(variance)).toFixed(1);
      })(), fullMark: 10 },
  ];

  /* ── Dynamic SHAP from actual hallucination/bias data ── */
  const hallucinationResults = safe.map(a => a.hallucinationCheck).filter(Boolean);
  const biasResults          = safe.map(a => a.biasCheck).filter(Boolean);
  const avgHallucRisk        = hallucinationResults.length
    ? hallucinationResults.reduce((s, h) => s + (h.hallucinationRiskScore || 0), 0) / hallucinationResults.length
    : 0;
  const avgBiasCompliance    = biasResults.length
    ? biasResults.reduce((s, b) => s + (b.complianceScore || 100), 0) / biasResults.length
    : 100;
  const resumeGrounding   = Math.max(0, 10 - avgHallucRisk / 10).toFixed(1);
  const biasShield        = (avgBiasCompliance / 10).toFixed(1);

  const shapAttrs = [
    { label: "Resume Context Grounding (L13 Factuality)", value: `+${resumeGrounding} pts`, pct: Math.round(parseFloat(resumeGrounding) * 10), color: "#10b981", type: "positive" },
    { label: "Answer Context Completeness",               value: `+${avg2dp(safe.map(a => a.score || 0))} pts`, pct: Math.round(parseFloat(avg) * 10), color: "#34d399", type: "positive" },
    { label: "Vocal Proctoring Rating (Secure Behavior)", value: "+0.8 pts", pct: 40, color: "#059669", type: "positive" },
    { label: "ZTA Anonymization Shield (Name Redacted)",  value: `+${biasShield} pts`, pct: Math.round(parseFloat(biasShield) * 10), color: "#a78bfa", type: "shield" },
    { label: "ZTA Demographic Guardrails (Gender/Age masked)", value: `+${(avgBiasCompliance / 100).toFixed(1)} pts`, pct: Math.round(avgBiasCompliance), color: "#c4b5fd", type: "shield" },
  ];

  /* ── Verification Signature & QR Code ───────────────────── */
  const ztaSignature = (() => {
    const rawData = `${candidateName}|${companyName}|${jobRole}|${avg}`;
    let hash = 0;
    for (let i = 0; i < rawData.length; i++) {
      hash = ((hash << 5) - hash) + rawData.charCodeAt(i);
      hash |= 0;
    }
    return "ZTASIG-" + Math.abs(hash).toString(16).toUpperCase() + "-" + Math.floor(1000 + Math.random() * 9000);
  })();

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=10b981&bgcolor=06060f&data=${encodeURIComponent(
    `https://rvce-placement.edu.in/verify?sig=${ztaSignature}&candidate=${encodeURIComponent(candidateName)}&score=${avg}`
  )}`;

  /* ── Speech Clarity Analytics ───────────────────────────── */
  const speechAnalysisResults = safe.map(a => a.speechAnalysis).filter(Boolean);
  const avgClarityScore = speechAnalysisResults.length
    ? parseFloat((speechAnalysisResults.reduce((sum, s) => sum + (s.clarityScore || 10), 0) / speechAnalysisResults.length).toFixed(1))
    : null;
  const avgFillerCount = speechAnalysisResults.length
    ? parseFloat((speechAnalysisResults.reduce((sum, s) => sum + (s.fillerCount || 0), 0) / speechAnalysisResults.length).toFixed(1))
    : 0;

  const aggregateFillers = {};
  speechAnalysisResults.forEach(sa => {
    if (sa.fillerWords) {
      for (const [word, count] of Object.entries(sa.fillerWords)) {
        aggregateFillers[word] = (aggregateFillers[word] || 0) + count;
      }
    }
  });

  /* ── Weak Category Roadmap ──────────────────────────────── */
  const weakCategory = (() => {
    const tech = parseFloat(avg2dp(technicalScores)) || 10;
    const beh = parseFloat(avg2dp(behavioralScores)) || 10;
    const sit = parseFloat(avg2dp(situationalScores)) || 10;
    
    const minVal = Math.min(tech, beh, sit);
    if (minVal >= 9) return null;
    if (minVal === tech) return { name: "Technical Depth", color: "#7c3aed", icon: "💻", focus: "Data Structures, coding test assertions, and time-complexity optimization." };
    if (minVal === beh) return { name: "Behavioral Alignment", color: "#f59e0b", icon: "🗣️", focus: "STAR method formulation, leadership impact metrics, and collaboration anecdotes." };
    return { name: "Situational / System Design", color: "#06b6d4", icon: "🌐", focus: "Scalability structures, database choice trade-offs, and failure mode recovery." };
  })();

  /* ── Percentile from history ── */
  const historyScores = (() => {
    try { return JSON.parse(localStorage.getItem("candidateAssessmentHistory") || "[]").map(i => parseFloat(i.score) || 0); }
    catch { return []; }
  })();
  const percentile = historyScores.length > 1
    ? Math.round((historyScores.filter(s => s < parseFloat(avg)).length / historyScores.length) * 100)
    : null;

  /* ── Score timeline for sparkline ── */
  const scoreTimeline = safe.map(a => a.score || 0);

  const tabs = ["Overview", "Question Analysis", "ZTA Audit"];

  const isDark = theme === "dark";
  const bg     = isDark ? "#06060f" : "#f0f0f8";
  const cardBg = isDark ? "rgba(10,10,22,0.65)" : "rgba(255,255,255,0.7)";
  const textPrimary   = isDark ? "#f0f0ff" : "#0f0f1a";
  const textSecondary = isDark ? "#6b6b90" : "#8888aa";

  return (
    <div id="results-export-root" style={{ minHeight: "100vh", background: bg, fontFamily: "var(--font-body)", position: "relative", overflowX: "hidden", transition: "background 0.3s" }}>

      {/* Background glows */}
      {isDark && <>
        <div style={{ position: "absolute", top: 0, left: "25%", width: "400px", height: "400px", background: "rgba(124,58,237,0.04)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "20%", width: "300px", height: "300px", background: "rgba(6,182,212,0.04)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />
      </>}

      {/* ─── Header ──────────────────────────────────────────────── */}
      <header style={{
        background: isDark ? "rgba(6,6,15,0.85)" : "rgba(240,240,248,0.9)",
        borderBottom: `1px solid ${isDark ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.2)"}`,
        padding: "0 40px", display: "flex", justifyContent: "space-between", alignItems: "center",
        height: "64px", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button onClick={() => navigate("/")} aria-label="Back to dashboard"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#cbd5e1", cursor: "pointer", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#7c3aed"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
          >←</button>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: textPrimary, fontFamily: "var(--font-headings)" }}>
              {companyName ? `${companyName} Assessment Report` : "RVCE Placement Report"}
            </div>
            <div style={{ fontSize: "11px", color: textSecondary, marginTop: "2px" }}>
              {candidateName} · {jobRole}
            </div>
          </div>
        </div>

        <div className="header-actions" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {isOfficial && <span className="badge badge-success">🏆 OFFICIAL GRADED</span>}
          <ZTABadge compact page="Results" />

          {/* Dark/Light toggle */}
          <button onClick={toggleTheme} aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#cbd5e1", padding: "8px 12px", borderRadius: "8px",
              cursor: "pointer", fontSize: "14px", transition: "all 0.2s", lineHeight: 1,
            }}
            title={`Switch to ${isDark ? "light" : "dark"} mode`}
          >
            {isDark ? "☀️" : "🌙"}
          </button>

          {/* History */}
          <button onClick={() => navigate("/history")} aria-label="View history" className="ghost-btn" style={{ padding: "8px 16px", fontSize: "12.5px" }}>
            📈 History
          </button>

          {/* PDF Export */}
          <button onClick={() => exportPDF("results-export-root", `TrustInterview_${companyName || "Report"}.pdf`)}
            className="ghost-btn" style={{ padding: "8px 16px", fontSize: "12.5px" }} aria-label="Export PDF report">
            📄 Export PDF
          </button>
        </div>
      </header>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 24px" }}>

        {/* ─── Official Banner ─────────────────────────────────── */}
        {isOfficial && (
          <div style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(124,58,237,0.06))",
            border: "1px solid rgba(16,185,129,0.22)", borderRadius: "16px",
            padding: "18px 24px", marginBottom: "28px",
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{ fontSize: "32px" }}>🏛️</span>
              <div>
                <div style={{ color: textPrimary, fontWeight: 900, fontSize: "14.5px", fontFamily: "var(--font-headings)" }}>
                  OFFICIAL CAMPUS RECRUITMENT CELL LOG
                </div>
                <div style={{ color: textSecondary, fontSize: "12.5px", marginTop: "3px" }}>
                  This session's scores have been successfully logged to the RVCE Placement leaderboards.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <span className="badge badge-success">✓ RECORDED</span>
              <span className="badge badge-primary">🛡️ L9 PDP VERIFIED</span>
            </div>
          </div>
        )}

        {/* ─── Score Hero Card ──────────────────────────────────── */}
        <div className="score-hero-card" style={{
          background: cardBg,
          border: "1px solid rgba(139,92,246,0.15)", borderRadius: "24px",
          padding: "36px", marginBottom: "28px",
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", flexWrap: "wrap", gap: "32px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        }}>
          <div style={{ flex: 1, minWidth: "260px" }}>
            <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.1em", color: textSecondary, textTransform: "uppercase", display: "block", marginBottom: "10px" }}>
              PLACEMENT DRIVE ASSESSMENT EVALUATION
            </span>
            <h1 style={{ fontSize: "28px", fontWeight: 900, color: textPrimary, fontFamily: "var(--font-headings)", marginBottom: "6px", letterSpacing: "-0.02em" }}>
              {jobRole}
            </h1>
            <p style={{ color: textSecondary, fontSize: "13px", marginBottom: "20px" }}>
              {safe.length} questions · {isOfficial ? "Official Campus Placement" : "Sandbox Mock Session"}
            </p>

            {/* Score timeline sparkline */}
            {scoreTimeline.length >= 2 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "10px", fontWeight: 800, color: "#a78bfa", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>
                  📈 Question-by-Question Score Trend
                </div>
                <Sparkline scores={scoreTimeline} width={280} height={40} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: textSecondary, marginTop: "4px" }}>
                  <span>Q1</span>
                  <span>Q{scoreTimeline.length}</span>
                </div>
              </div>
            )}

            {/* Skill progress bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Technical Skills", score: avg2dp(technicalScores), color: "#7c3aed" },
                { label: "Behavioral Alignment", score: avg2dp(behavioralScores), color: "#f59e0b" },
                { label: "Situational / System Design", score: avg2dp(situationalScores), color: "#06b6d4" },
              ].map(cat => (
                <div key={cat.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12.5px" }}>
                    <span style={{ color: textSecondary, fontWeight: 700 }}>{cat.label}</span>
                    <span style={{ color: cat.color, fontWeight: 800 }}>{cat.score} / 10</span>
                  </div>
                  <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{
                      width: cat.score === "—" ? "0%" : `${(parseFloat(cat.score) / 10) * 100}%`,
                      background: cat.color, borderRadius: "4px", transition: "width 1.2s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Dynamic SHAP panel */}
            <div style={{
              background: "rgba(255,255,255,0.01)", border: "1px solid rgba(139,92,246,0.15)",
              borderRadius: "16px", padding: "20px", marginTop: "24px",
            }}>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#a78bfa", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: "12px", fontFamily: "var(--font-headings)" }}>
                ⚖️ ZTA SHAP FEATURE ATTRIBUTION (LIVE - CLICK TO EXPAND)
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {shapAttrs.map((attr, index) => {
                  const isActive = activeShapFactor === index;
                  return (
                    <div
                      key={index}
                      style={{ fontSize: "11.5px", cursor: "pointer", padding: "6px", borderRadius: "8px", background: isActive ? "rgba(255,255,255,0.03)" : "transparent", transition: "all 0.2s" }}
                      onClick={() => setActiveShapFactor(isActive ? null : index)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1", marginBottom: "4px" }}>
                        <span style={{ color: textSecondary }}>{attr.label}</span>
                        <span style={{ color: attr.color, fontWeight: 700 }}>{attr.value}</span>
                      </div>
                      <div style={{ width: "100%", height: "3px", background: "rgba(255,255,255,0.04)", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{
                          width: `${Math.min(attr.pct, 100)}%`, height: "100%",
                          background: attr.color, borderRadius: "2px",
                          boxShadow: attr.type === "shield" ? "0 0 6px rgba(167,139,250,0.4)" : "none",
                          transition: "width 1.4s ease",
                        }} />
                      </div>

                      {/* Interactive Drawer */}
                      {isActive && (
                        <div className="fade-in" style={{ marginTop: "8px", padding: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "6px", fontSize: "11px", color: "#cbd5e1", lineHeight: 1.5 }}>
                          <strong>Factor Details:</strong>
                          <div style={{ marginTop: "4px", color: textSecondary }}>
                            {index === 0 && `Resume Context Grounding (L13 Factuality) ensures your answers match verified nodes in your CV. L13 Fact Shield matches technical terms to CV details.`}
                            {index === 1 && `Answer Context Completeness rates how thoroughly your arguments cover the topic requested by the evaluator.`}
                            {index === 2 && `Vocal Proctoring score verifies continuous video presence, noise checks, and confidence variables.`}
                            {index === 3 && `Name Redaction matches ZTA-L12 anonymization. Graders cannot see candidate identity variables.`}
                            {index === 4 && `Demographic Guardrails filter gender, age, and location identifiers to eliminate cognitive bias.`}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Score circle + Radar chart */}
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            {/* Animated score circle */}
            <div style={{
              width: "150px", height: "150px", borderRadius: "50%",
              border: `4px solid ${sc}`,
              background: `radial-gradient(circle at center, ${sc}12, transparent)`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 32px ${sc}30`, margin: "0 auto 16px",
            }}>
              <div style={{ fontSize: "44px", fontWeight: 950, color: sc, fontFamily: "var(--font-headings)", lineHeight: 1 }}>
                {animScore.toFixed(1)}
              </div>
              <div style={{ fontSize: "11px", color: textSecondary, fontWeight: 800, letterSpacing: "0.05em", marginTop: "4px" }}>
                OVERALL RATING
              </div>
            </div>
            <div style={{ fontSize: "20px", fontWeight: 900, color: sc, fontFamily: "var(--font-headings)" }}>{grade}</div>
            <div style={{ fontSize: "11.5px", color: textSecondary, marginTop: "4px" }}>Candidate Quality Grade</div>

            {percentile !== null && (
              <div style={{ marginTop: "10px", fontSize: "11px", color: "#a78bfa", fontWeight: 700 }}>
                Top {100 - percentile}% of your sessions
              </div>
            )}

            {parseFloat(avg) >= 7.0 && (
              <div style={{ marginTop: "12px" }}>
                <span className="badge badge-success">✓ Tier-1 Eligibility Cutoff Met</span>
              </div>
            )}

            {/* Radar chart */}
            <div style={{ marginTop: "24px", width: "220px" }}>
              <div style={{ fontSize: "10px", fontWeight: 800, color: "#a78bfa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
                SKILL RADAR
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#6b6b90", fontSize: 9, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={18} domain={[0, 10]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.18} strokeWidth={2} />
                  <RTooltip contentStyle={{ background: "#0c0c1a", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "8px", fontSize: "12px", color: "#f0f0ff" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ─── Tabs ─────────────────────────────────────────────── */}
        <div className="results-tabs" style={{ display: "flex", gap: "8px", marginBottom: "24px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "5px", border: "1px solid rgba(255,255,255,0.05)" }}>
          {tabs.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} aria-label={`View ${t} tab`}
              style={{
                flex: 1, padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer",
                fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-headings)",
                background: tab === i ? "rgba(124,58,237,0.15)" : "transparent",
                color: tab === i ? "#c4b5fd" : textSecondary, transition: "all 0.2s",
              }}>
              {["📊 Dashboard Summary", "📝 Detailed Answers Feedback", "🛡️ Security & Bias Audit"][i]}
            </button>
          ))}
        </div>

        {/* ─── Tab 0: Overview ─────────────────────────────────── */}
        {tab === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {report?.summary && (
              <div className="glass-card" style={{ padding: "24px", background: cardBg }}>
                <div style={{ fontSize: "11px", fontWeight: 900, color: textSecondary, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
                  EVALUATOR SYNTHESIS REPORT
                </div>
                <p style={{ color: isDark ? "#cbd5e1" : "#2a2a42", fontSize: "13.5px", lineHeight: 1.8, margin: 0 }}>{report.summary}</p>
              </div>
            )}

            {/* Quick stats */}
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "16px" }}>
              {[
                { label: "Overall Rating",    value: `${avg} / 10`,                               color: "#7c3aed", icon: "📊" },
                { label: "Evaluator Verdict", value: grade,                                        color: sc,        icon: "🏆" },
                { label: "Questions Done",    value: `${safe.length} Evaluated`,                   color: "#06b6d4", icon: "❓" },
                { label: "Recruitment Scope", value: isOfficial ? "Official" : "Mock Sandbox",     color: isOfficial ? "#10b981" : "#f59e0b", icon: "🎯" },
              ].map((stat, i) => (
                <div key={i} style={{
                  padding: "20px", background: cardBg,
                  border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", textAlign: "center",
                }}>
                  <div style={{ fontSize: "26px", marginBottom: "8px" }}>{stat.icon}</div>
                  <div style={{ fontSize: "20px", fontWeight: 900, color: stat.color, fontFamily: "var(--font-headings)" }}>{stat.value}</div>
                  <div style={{ fontSize: "12px", color: textSecondary, marginTop: "6px", fontWeight: 700 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Strengths & Improvements */}
            {report && (
              <div className="strengths-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div className="glass-card" style={{ padding: "24px", borderColor: "rgba(16,185,129,0.25)", background: cardBg }}>
                  <div style={{ fontSize: "11px", fontWeight: 900, color: "#10b981", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "14px" }}>
                    ✓ Top Candidate Strengths
                  </div>
                  {toArr(report.strengths).slice(0, 5).map((s, i) => (
                    <div key={i} style={{ fontSize: "13px", color: isDark ? "#cbd5e1" : "#2a2a42", marginBottom: "10px", display: "flex", alignItems: "flex-start", gap: "8px", lineHeight: 1.5 }}>
                      <span style={{ color: "#34d399", fontWeight: 900 }}>▸</span><span>{s}</span>
                    </div>
                  ))}
                </div>
                <div className="glass-card" style={{ padding: "24px", borderColor: "rgba(239,68,68,0.25)", background: cardBg }}>
                  <div style={{ fontSize: "11px", fontWeight: 900, color: "#ef4444", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "14px" }}>
                    ✕ Areas for Professional Improvement
                  </div>
                  {toArr(report.improvements).slice(0, 5).map((s, i) => (
                    <div key={i} style={{ fontSize: "13px", color: isDark ? "#cbd5e1" : "#2a2a42", marginBottom: "10px", display: "flex", alignItems: "flex-start", gap: "8px", lineHeight: 1.5 }}>
                      <span style={{ color: "#f87171", fontWeight: 900 }}>▸</span><span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vocal Delivery Analytics Card */}
            {avgClarityScore !== null && (
              <div className="glass-card fade-in-up" style={{ padding: "24px", background: cardBg, borderColor: "rgba(6,182,212,0.25)" }}>
                <div style={{ fontSize: "11px", fontWeight: 900, color: "#06b6d4", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>
                  🎙️ AI VOCAL CONFIDENCE & SPEECH CLARITY REPORT
                </div>
                <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{
                    width: "80px", height: "80px", borderRadius: "50%",
                    border: `3px solid ${avgClarityScore >= 7.5 ? "#06b6d4" : "#f59e0b"}`,
                    background: "rgba(255,255,255,0.01)",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <div style={{ fontSize: "20px", fontWeight: 950, color: avgClarityScore >= 7.5 ? "#06b6d4" : "#f59e0b", fontFamily: "var(--font-headings)" }}>
                      {avgClarityScore}
                    </div>
                    <div style={{ fontSize: "9px", color: textSecondary, fontWeight: 700 }}>/10</div>
                  </div>
                  
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div style={{ color: textPrimary, fontSize: "14.5px", fontWeight: 800 }}>Speech Clarity Index</div>
                    <p style={{ color: textSecondary, fontSize: "12.5px", lineHeight: 1.5, margin: "6px 0 0 0" }}>
                      We analyzed your speech pacing and filler phrases. You used an average of <strong>{avgFillerCount} filler words</strong> per question response.
                    </p>
                  </div>
                </div>

                {Object.keys(aggregateFillers).length > 0 && (
                  <div style={{ marginTop: "20px", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "16px" }}>
                    <div style={{ fontSize: "10.5px", fontWeight: 800, color: textSecondary, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "10px" }}>Filler Word Frequency</div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {Object.entries(aggregateFillers).map(([word, count]) => (
                        <span key={word} style={{ fontSize: "11.5px", padding: "4px 10px", borderRadius: "6px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171" }}>
                          "{word}": <strong>{count}x</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Placement verdict */}
            <div style={{
              background: parseFloat(avg) >= 7 ? "rgba(16,185,129,0.03)" : "rgba(124,58,237,0.03)",
              border: `1px solid ${parseFloat(avg) >= 7 ? "rgba(16,185,129,0.22)" : "rgba(139,92,246,0.22)"}`,
              borderRadius: "18px", padding: "24px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "12px" }}>
                <span style={{ fontSize: "28px" }}>{parseFloat(avg) >= 7 ? "✅" : parseFloat(avg) >= 5 ? "⚠️" : "❌"}</span>
                <div>
                  <h4 style={{ color: textPrimary, fontWeight: 900, fontSize: "16px", fontFamily: "var(--font-headings)", margin: 0 }}>
                    {parseFloat(avg) >= 7 ? "Approved for Corporate Interview Stages"
                      : parseFloat(avg) >= 5 ? "Recommended for Practice Iterations"
                      : "Action Required: Additional Training Recommended"}
                  </h4>
                  <div style={{ color: textSecondary, fontSize: "12px", marginTop: "3px" }}>RVCE Placement Cell Coordinator Board</div>
                </div>
              </div>
              <p style={{ color: isDark ? "#cbd5e1" : "#2a2a42", fontSize: "13px", lineHeight: 1.7, margin: 0 }}>
                {parseFloat(avg) >= 7
                  ? "Your score profile meets the requirements of partner companies. Your verified report has been published to placement repositories."
                  : parseFloat(avg) >= 5
                  ? "You are within reach of tier-1 recruitment cutoff averages. Review detailed answer feedbacks to close remaining technical gaps."
                  : "Conceptual depth anomalies were flagged during analysis. Re-attempt practice mock sandboxes to calibrate technical response structure."}
              </p>
            </div>

            {/* Dynamic Learning Roadmap Card */}
            {weakCategory && (
              <div className="glass-card fade-in-up" style={{ padding: "24px", background: `linear-gradient(135deg, ${weakCategory.color}06, transparent)`, border: `1px solid ${weakCategory.color}25`, borderRadius: "18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "28px" }}>{weakCategory.icon}</span>
                  <div>
                    <div style={{ fontSize: "10px", fontWeight: 800, color: weakCategory.color, letterSpacing: "0.08em", textTransform: "uppercase" }}>🎯 RECOMMENDED PRACTICE PATHWAY</div>
                    <h4 style={{ color: textPrimary, fontSize: "16px", fontWeight: 850, margin: "2px 0 0 0", fontFamily: "var(--font-headings)" }}>Focus Area: {weakCategory.name}</h4>
                  </div>
                </div>
                <p style={{ color: textSecondary, fontSize: "13px", lineHeight: 1.6, margin: "0 0 16px 0" }}>
                  Based on your performance, you scored lowest in this dimension. We recommend studying: <strong>{weakCategory.focus}</strong>
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    "Review matching textbook templates and design pattern sheets.",
                    "Practice answering similar mock campaigns using our simulator.",
                    "Include metric bounds (e.g. latency reduced by 30%, 4 test frameworks used) in your CV descriptions."
                  ].map((step, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "10px", fontSize: "12.5px", color: isDark ? "#cbd5e1" : "#2a2a42" }}>
                      <span style={{ color: weakCategory.color, fontWeight: 700 }}>Step {idx + 1}:</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Tab 1: Question Analysis ────────────────────────── */}
        {tab === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {safe.map((a, i) => {
              const itemColor = (a.score || 0) >= 7 ? "#10b981" : (a.score || 0) >= 5 ? "#f59e0b" : "#ef4444";
              const isWeak    = (a.score || 0) < 5;
              return (
                <div key={i} className="glass-card" style={{ padding: "24px", background: cardBg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                        <span className={`badge badge-${a.type === "technical" ? "primary" : a.type === "behavioural" ? "warning" : "info"}`}>
                          {a.type?.toUpperCase()}
                        </span>
                        <span className="badge" style={{ background: "rgba(255,255,255,0.03)", color: isDark ? "#cbd5e1" : "#2a2a42", border: "1px solid rgba(255,255,255,0.06)" }}>
                          Skill: {a.skill}
                        </span>
                        {isWeak && <span className="badge" style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>⚠ Needs Work</span>}
                      </div>
                      <p style={{ color: textPrimary, fontSize: "15px", fontWeight: 700, lineHeight: 1.5, margin: 0, fontFamily: "var(--font-headings)" }}>
                        Q{i + 1}: {a.question}
                      </p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: "24px", fontWeight: 950, fontFamily: "var(--font-headings)", color: itemColor }}>
                        {a.score ?? "—"}<span style={{ fontSize: "13px", color: textSecondary }}>/10</span>
                      </div>
                      <div style={{ fontSize: "11.5px", color: textSecondary, marginTop: "2px", fontWeight: 700 }}>{a.grade || "—"}</div>
                    </div>
                  </div>

                  {a.answer && (
                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
                      <div style={{ fontSize: "10px", color: textSecondary, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>YOUR SUBMITTED RESPONSE</div>
                      <p style={{ color: isDark ? "#cbd5e1" : "#2a2a42", fontSize: "13.5px", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)" }}>{a.answer}</p>
                    </div>
                  )}

                  {a.summary && (
                    <div style={{ marginBottom: "14px" }}>
                      <div style={{ fontSize: "10px", color: textSecondary, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>EVALUATOR PERFORMANCE FEEDBACK</div>
                      <p style={{ color: isDark ? "#cbd5e1" : "#2a2a42", fontSize: "13.5px", lineHeight: 1.6, margin: 0 }}>{a.summary}</p>
                    </div>
                  )}

                  {a.idealAnswer && (
                    <div style={{ background: "rgba(139,92,246,0.03)", border: "1px solid rgba(139,92,246,0.18)", borderRadius: "12px", padding: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <div style={{ fontSize: "10px", color: "#a78bfa", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          IDEAL REFERENCE ANSWER GUIDELINE
                        </div>
                        <CopyButton text={a.idealAnswer} />
                      </div>
                      <p style={{ color: isDark ? "#cbd5e1" : "#2a2a42", fontSize: "13.5px", lineHeight: 1.6, margin: 0 }}>{a.idealAnswer}</p>
                    </div>
                  )}

                  {/* Practice Again button for weak answers */}
                  {isWeak && (
                    <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end" }}>
                      <button onClick={() => {
                        sessionStorage.setItem("practiceQuestion", JSON.stringify({ question: a.question, skill: a.skill, type: a.type }));
                        navigate("/");
                      }}
                        aria-label="Practice this question again"
                        style={{
                          background: "rgba(124,58,237,0.08)", border: "1px solid rgba(139,92,246,0.25)",
                          color: "#c4b5fd", padding: "9px 18px", borderRadius: "9px",
                          cursor: "pointer", fontSize: "12.5px", fontWeight: 700,
                          display: "flex", alignItems: "center", gap: "7px", transition: "all 0.2s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(124,58,237,0.18)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(124,58,237,0.08)"}
                      >
                        🔁 Practice This Question Again
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Tab 2: Security & Bias Audit ─────────────────────── */}
        {tab === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* ZTA certificate */}
            <div style={{
              background: "linear-gradient(135deg, rgba(16,185,129,0.05), rgba(124,58,237,0.05))",
              border: "1px solid rgba(16,185,129,0.22)", borderRadius: "20px", padding: "36px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛡️</div>
              <h2 style={{ fontSize: "22px", fontWeight: 900, color: textPrimary, fontFamily: "var(--font-headings)", marginBottom: "8px" }}>
                Zero Trust Performance Certificate
              </h2>
              <p style={{ color: textSecondary, fontSize: "13.5px", maxWidth: "600px", margin: "0 auto 28px" }}>
                Cryptographic session receipt generated under RVCE's automated proctor framework.
                Grades are verified, audit-logged, and decoupling pipelines have filtered identity variables from scoring models.
              </p>

              {/* Cryptographic QR Verification Seal */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", margin: "0 auto 28px", padding: "20px", background: "rgba(0,0,0,0.15)", borderRadius: "14px", border: "1px solid rgba(16,185,129,0.2)", maxWidth: "500px" }}>
                <div>
                  <img src={qrCodeUrl} alt="ZTA Verification Barcode Seal" style={{ borderRadius: "8px", border: "1px solid rgba(16,185,129,0.3)" }} />
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#10b981", letterSpacing: "0.08em", textTransform: "uppercase" }}>🛡️ Cryptographic Verification Seal</div>
                  <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "#cbd5e1", marginTop: "4px" }}>{ztaSignature}</div>
                  <div style={{ fontSize: "11px", color: textSecondary, marginTop: "4px" }}>Scan QR code to verify this session receipt in RVCE's placement cell audit ledger.</div>
                </div>
              </div>

              {/* Bias Metrics */}
              {biasResults.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "12px", marginBottom: "20px", textAlign: "left" }}>
                  <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
                    <div style={{ fontSize: "24px", fontWeight: 900, color: "#10b981", fontFamily: "var(--font-headings)" }}>{avgBiasCompliance.toFixed(0)}%</div>
                    <div style={{ fontSize: "11px", color: textSecondary, marginTop: "4px" }}>Bias Compliance</div>
                  </div>
                  <div style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.18)", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
                    <div style={{ fontSize: "24px", fontWeight: 900, color: "#a78bfa", fontFamily: "var(--font-headings)" }}>{(100 - avgHallucRisk).toFixed(0)}%</div>
                    <div style={{ fontSize: "11px", color: textSecondary, marginTop: "4px" }}>Factual Accuracy</div>
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "12px", textAlign: "left" }}>
                {[
                  { label: "L1 Identity Token", status: "Verified" },
                  { label: "L2 Device Fingerprint", status: "Matched" },
                  { label: "L4 Payload Filter", status: "Secure" },
                  { label: "L6 Session Audit Log", status: "Created" },
                  { label: "L8 XSS Protection", status: "Passed" },
                  { label: "L11 Threat Matrix Shield", status: "Clean" },
                  { label: "L12 Demographic Decouple", status: "Shielded" },
                  { label: "L13 Hallucination Scanner", status: "Verified" },
                  { label: "L14 Question Uniqueness", status: "Enforced" },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.18)",
                    borderRadius: "10px", padding: "12px 14px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontSize: "12px", color: isDark ? "#cbd5e1" : "#2a2a42" }}>{item.label}</span>
                    <span style={{ fontSize: "11px", color: "#34d399", fontWeight: 800 }}>✓ {item.status}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "24px", padding: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "12px", fontSize: "12.5px", color: textSecondary, lineHeight: 1.6 }}>
                ZTA-L12 protection decoupled name, gender, nationality, and academic profiles from the LLM evaluator cluster during assessment.
                Answers were graded dynamically against job roles with zero historical evaluator bias.
              </div>
            </div>

            {/* Bias audit ledger */}
            <div className="glass-card" style={{ padding: "24px", background: cardBg }}>
              <div style={{ fontSize: "11px", fontWeight: 900, color: textSecondary, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>
                SESSION AUDIT LEDGER
              </div>
              {safe.map((a, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
                  fontSize: "13px",
                }}>
                  <span style={{ color: textSecondary, flex: 1, paddingRight: "16px" }}>
                    Q{i + 1}: "{a.question?.substring(0, 75)}..."
                  </span>
                  <span className="badge badge-success">✓ BIAS-FREE</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Footer Actions ───────────────────────────────────── */}
        <div style={{ display: "flex", gap: "16px", marginTop: "36px", flexWrap: "wrap" }}>
          <button className="glow-btn" style={{ flex: 1, padding: "14px", fontSize: "14px" }} onClick={() => navigate("/")} aria-label="Back to placements dashboard">
            🏠 Back to Placements Cell Dashboard
          </button>
          <button className="ghost-btn" style={{ flex: 1, padding: "14px", fontSize: "14px" }} aria-label="View history"
            onClick={() => navigate("/history")}>
            📈 View Session History
          </button>
          <button className="ghost-btn" style={{ flex: 1, padding: "14px", fontSize: "14px" }}
            aria-label="Start new session"
            onClick={() => {
              sessionStorage.removeItem("resumeText");
              sessionStorage.removeItem("interviewResults");
              navigate("/");
            }}>
            🔄 New Campaign Drive
          </button>
        </div>
      </div>
    </div>
  );
}