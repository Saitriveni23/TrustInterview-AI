import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ZTABadge from "../components/ZTABadge";

export default function History() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");  // "all" | "mock" | "official"
  const [sortBy, setSortBy] = useState("date");  // "date" | "score" | "company"
  const [sortDir, setSortDir] = useState("desc");
  const [search, setSearch] = useState("");

  // Load history from localStorage
  const rawHistory = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("candidateAssessmentHistory") || "[]");
    } catch { return []; }
  }, []);

  // Apply filter + search + sort
  const history = useMemo(() => {
    let items = [...rawHistory];

    // Filter by type
    if (filter === "mock") items = items.filter(i => i.interviewType?.toLowerCase().includes("practice") || i.interviewType?.toLowerCase().includes("mock"));
    if (filter === "official") items = items.filter(i => i.interviewType?.toLowerCase().includes("official") || i.interviewType?.toLowerCase().includes("graded"));

    // Search by company or role
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        (i.companyName || "").toLowerCase().includes(q) ||
        (i.jobRole    || "").toLowerCase().includes(q)
      );
    }

    // Sort
    items.sort((a, b) => {
      let va, vb;
      if (sortBy === "score")   { va = parseFloat(a.score); vb = parseFloat(b.score); }
      else if (sortBy === "company") { va = a.companyName?.toLowerCase(); vb = b.companyName?.toLowerCase(); }
      else                      { va = new Date(a.date).getTime(); vb = new Date(b.date).getTime(); }

      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });

    return items;
  }, [rawHistory, filter, search, sortBy, sortDir]);

  // Percentile ranking helper
  const getPercentile = (score) => {
    const scores = rawHistory.map(i => parseFloat(i.score) || 0);
    const below  = scores.filter(s => s < parseFloat(score)).length;
    return Math.round((below / Math.max(scores.length, 1)) * 100);
  };

  // Score trend sparkline SVG
  function Sparkline({ items, width = 120, height = 32 }) {
    if (!items || items.length < 2) return null;
    const scores = items.map(i => parseFloat(i.score) || 0);
    const min    = Math.min(...scores);
    const max    = Math.max(...scores);
    const range  = Math.max(max - min, 1);
    const pts    = scores.map((s, i) => {
      const x = (i / (scores.length - 1)) * width;
      const y = height - ((s - min) / range) * height;
      return `${x},${y}`;
    }).join(" ");
    const lastScore  = scores[scores.length - 1];
    const firstScore = scores[0];
    const trending   = lastScore >= firstScore;
    return (
      <svg width={width} height={height} style={{ overflow: "visible" }}>
        <polyline
          points={pts}
          fill="none"
          stroke={trending ? "#10b981" : "#ef4444"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {scores.map((s, i) => {
          const x = (i / (scores.length - 1)) * width;
          const y = height - ((s - min) / range) * height;
          return <circle key={i} cx={x} cy={y} r="3" fill={trending ? "#10b981" : "#ef4444"} />;
        })}
      </svg>
    );
  }

  // Company sparkline: scores for a specific company over time
  function CompanyTrend({ company }) {
    const compItems = rawHistory
      .filter(i => i.companyName?.toLowerCase() === company?.toLowerCase())
      .slice().reverse(); // oldest first
    return <Sparkline items={compItems} />;
  }

  const scoreColor = (s) => parseFloat(s) >= 7 ? "#10b981" : parseFloat(s) >= 5 ? "#f59e0b" : "#ef4444";
  const gradeTag   = (g) => {
    const colors = { "Exceptional": "#10b981", "Good": "#22d3ee", "Average": "#f59e0b", "Weak": "#f97316", "Poor": "#ef4444" };
    return colors[g] || "#6b6b90";
  };

  function clearHistory() {
    if (!window.confirm("Clear all interview history? This cannot be undone.")) return;
    localStorage.removeItem("candidateAssessmentHistory");
    window.location.reload();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#06060f", fontFamily: "var(--font-body)", position: "relative", overflowX: "hidden" }}>

      {/* Background glows */}
      <div style={{ position: "absolute", top: 0, left: "30%", width: "400px", height: "400px", background: "rgba(124,58,237,0.04)", borderRadius: "50%", filter: "blur(120px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "20%", width: "300px", height: "300px", background: "rgba(6,182,212,0.04)", borderRadius: "50%", filter: "blur(100px)", pointerEvents: "none" }} />

      {/* Header */}
      <header style={{
        background: "rgba(6,6,15,0.85)", borderBottom: "1px solid rgba(139,92,246,0.12)",
        padding: "0 40px", display: "flex", justifyContent: "space-between", alignItems: "center",
        height: "64px", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={() => navigate("/")}
            aria-label="Go back to dashboard"
            style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#cbd5e1", cursor: "pointer", width: "32px", height: "32px",
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s", fontSize: "14px",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#7c3aed"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
          >←</button>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#f0f0ff", fontFamily: "var(--font-headings)" }}>
              Assessment History
            </div>
            <div style={{ fontSize: "11px", color: "#6b6b90", marginTop: "2px" }}>
              {rawHistory.length} sessions recorded
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <ZTABadge compact page="History" />
          {rawHistory.length > 0 && (
            <button onClick={clearHistory} style={{
              background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)",
              color: "#f87171", padding: "7px 14px", borderRadius: "8px",
              cursor: "pointer", fontSize: "12px", fontWeight: 700, transition: "all 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.12)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.05)"}
            >
              🗑 Clear All
            </button>
          )}
        </div>
      </header>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Score Overview Stats */}
        {rawHistory.length > 0 && (() => {
          const scores   = rawHistory.map(i => parseFloat(i.score) || 0);
          const avgAll   = (scores.reduce((s,v) => s+v, 0) / scores.length).toFixed(1);
          const best     = Math.max(...scores).toFixed(1);
          const sessions = rawHistory.length;
          const lastScore = rawHistory[0]?.score || "—";
          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "16px", marginBottom: "28px" }}>
              {[
                { label: "Total Sessions",    value: sessions,   color: "#7c3aed", icon: "🎯" },
                { label: "Average Score",     value: `${avgAll}/10`, color: "#06b6d4", icon: "📊" },
                { label: "Best Score",        value: `${best}/10`,   color: "#10b981", icon: "🏆" },
                { label: "Last Session",      value: `${lastScore}/10`, color: scoreColor(lastScore), icon: "🕐" },
              ].map((stat, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "16px", padding: "20px", textAlign: "center",
                }}>
                  <div style={{ fontSize: "24px", marginBottom: "8px" }}>{stat.icon}</div>
                  <div style={{ fontSize: "22px", fontWeight: 900, color: stat.color, fontFamily: "var(--font-headings)" }}>{stat.value}</div>
                  <div style={{ fontSize: "11.5px", color: "#6b6b90", marginTop: "4px", fontWeight: 700 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Score Trend Overview */}
        {rawHistory.length >= 2 && (
          <div style={{
            background: "rgba(10,10,22,0.6)", border: "1px solid rgba(139,92,246,0.15)",
            borderRadius: "16px", padding: "20px 24px", marginBottom: "28px",
            display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 800, color: "#a78bfa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
                📈 Score Progression (All Sessions)
              </div>
              <Sparkline items={[...rawHistory].reverse()} width={200} height={40} />
            </div>
            <div style={{ color: "#6b6b90", fontSize: "12.5px", lineHeight: 1.6 }}>
              {(() => {
                const first = parseFloat(rawHistory[rawHistory.length - 1]?.score) || 0;
                const last  = parseFloat(rawHistory[0]?.score) || 0;
                const diff  = (last - first).toFixed(1);
                return diff >= 0
                  ? <span>Your score has <span style={{ color: "#10b981", fontWeight: 700 }}>improved by +{diff} pts</span> since your first session! 🚀</span>
                  : <span>Your score has <span style={{ color: "#f59e0b", fontWeight: 700 }}>shifted by {diff} pts</span> — keep practicing! 💪</span>;
              })()}
            </div>
          </div>
        )}

        {/* Dynamic Learning Roadmap Card */}
        {(() => {
          if (rawHistory.length === 0) return null;
          const scores = rawHistory.map(i => parseFloat(i.score) || 0);
          const avgScore = scores.reduce((s, v) => s + v, 0) / scores.length;
          if (avgScore >= 8.5) return null;

          const lastRole = rawHistory[0]?.jobRole || "";
          const isAI = lastRole.toLowerCase().includes("ai") || lastRole.toLowerCase().includes("machine") || lastRole.toLowerCase().includes("learning");
          const name = isAI ? "Model Tuning & Bias Control" : "System Design & Scale";
          const color = isAI ? "#10b981" : "#06b6d4";
          const icon = isAI ? "🤖" : "🌐";
          const focus = isAI 
            ? "Prompt injection safety, technical bias detection, and loss metrics."
            : "Caching strategies, database partitioning trade-offs, and microservices.";

          return (
            <div className="glass-card fade-in-up" style={{ padding: "24px", background: `linear-gradient(135deg, ${color}06, transparent)`, border: `1px solid ${color}22`, borderRadius: "18px", marginBottom: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <span style={{ fontSize: "28px" }}>{icon}</span>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 800, color: color, letterSpacing: "0.08em", textTransform: "uppercase" }}>🎯 RECOMMENDED PRACTICE PATHWAY</div>
                  <h4 style={{ color: "#f0f0ff", fontSize: "16px", fontWeight: 850, margin: "2px 0 0 0", fontFamily: "var(--font-headings)" }}>Focus Area: {name}</h4>
                </div>
              </div>
              <p style={{ color: "#6b6b90", fontSize: "13px", lineHeight: 1.6, margin: "0 0 16px 0" }}>
                Based on your historical averages, we recommend focusing on: <strong>{focus}</strong>
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  "Revise core trade-offs and runtime bounds for engineering systems.",
                  "Create a small sandbox mock test in our Placements Cell catalog.",
                  "Enforce fact-checking grounding by referencing CV projects directly in responses."
                ].map((step, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "10px", fontSize: "12.5px", color: "#cbd5e1" }}>
                    <span style={{ color: color, fontWeight: 700 }}>Step {idx + 1}:</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Filters & Search */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
            <input
              type="text"
              placeholder="🔍  Search company or role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search history"
              style={{
                width: "100%", padding: "10px 16px", borderRadius: "10px",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                color: "#f0f0ff", fontSize: "13px", outline: "none",
                fontFamily: "var(--font-body)", boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.4)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
            />
          </div>

          {/* Type filter */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.02)", borderRadius: "10px", padding: "4px", border: "1px solid rgba(255,255,255,0.05)" }}>
            {[["all","All"], ["mock","Mock"], ["official","Official"]].map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)} aria-label={`Filter by ${l}`}
                style={{
                  padding: "8px 14px", borderRadius: "7px", border: "none", cursor: "pointer",
                  fontSize: "12.5px", fontWeight: 700, transition: "all 0.2s",
                  background: filter === v ? "rgba(124,58,237,0.2)" : "transparent",
                  color: filter === v ? "#c4b5fd" : "#6b6b90",
                }}
              >{l}</button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortDir}`}
            onChange={e => { const [by, dir] = e.target.value.split("-"); setSortBy(by); setSortDir(dir); }}
            aria-label="Sort history"
            style={{
              padding: "10px 14px", borderRadius: "10px",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              color: "#cbd5e1", fontSize: "12.5px", cursor: "pointer", outline: "none",
            }}
          >
            <option value="date-desc">Latest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="score-desc">Highest Score</option>
            <option value="score-asc">Lowest Score</option>
            <option value="company-asc">Company A→Z</option>
          </select>
        </div>

        {/* History List */}
        {history.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#6b6b90" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0ff", marginBottom: "8px" }}>
              {rawHistory.length === 0 ? "No sessions yet" : "No results match your filter"}
            </div>
            <div style={{ fontSize: "13px" }}>
              {rawHistory.length === 0
                ? "Complete an interview to see your history here."
                : "Try adjusting your search or filter."}
            </div>
            {rawHistory.length === 0 && (
              <button onClick={() => navigate("/")} style={{
                marginTop: "24px", padding: "12px 28px", borderRadius: "10px",
                background: "rgba(124,58,237,0.15)", border: "1px solid rgba(139,92,246,0.35)",
                color: "#c4b5fd", cursor: "pointer", fontSize: "13.5px", fontWeight: 700,
              }}>
                Start First Interview
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {history.map((item, i) => {
              const sc        = parseFloat(item.score) || 0;
              const sColor    = scoreColor(sc);
              const pct       = getPercentile(sc);
              const isOfficial= item.interviewType?.toLowerCase().includes("official");
              return (
                <div key={i} style={{
                  background: "rgba(10,10,22,0.6)", border: `1px solid rgba(255,255,255,0.06)`,
                  borderRadius: "16px", padding: "20px 24px",
                  display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap",
                  transition: "border-color 0.2s",
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}
                >
                  {/* Score circle */}
                  <div style={{
                    width: "58px", height: "58px", borderRadius: "50%",
                    border: `2px solid ${sColor}`,
                    background: `radial-gradient(circle at center, ${sColor}12, transparent)`,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <div style={{ fontSize: "18px", fontWeight: 900, color: sColor, fontFamily: "var(--font-headings)", lineHeight: 1 }}>
                      {sc.toFixed(1)}
                    </div>
                    <div style={{ fontSize: "9px", color: "#6b6b90", fontWeight: 700 }}>/10</div>
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: "160px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "14.5px", fontWeight: 800, color: "#f0f0ff", fontFamily: "var(--font-headings)" }}>
                        {item.companyName || "General"}
                      </span>
                      <span style={{
                        fontSize: "10px", fontWeight: 800, padding: "2px 7px", borderRadius: "4px",
                        background: isOfficial ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                        color: isOfficial ? "#10b981" : "#f59e0b",
                        border: `1px solid ${isOfficial ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}`,
                      }}>
                        {isOfficial ? "🏆 OFFICIAL" : "🧪 MOCK"}
                      </span>
                    </div>
                    <div style={{ fontSize: "12.5px", color: "#6b6b90", marginBottom: "6px" }}>
                      {item.jobRole || "AI Specialist"} · {item.date}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "11px", color: gradeTag(item.grade), fontWeight: 700 }}>
                        {item.grade}
                      </span>
                      {pct > 0 && (
                        <span style={{ fontSize: "11px", color: "#6b6b90" }}>
                          Better than {pct}% of your sessions
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Company trend sparkline */}
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ fontSize: "9px", color: "#4a4a6a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px", textAlign: "center" }}>
                      {item.companyName} trend
                    </div>
                    <CompanyTrend company={item.companyName} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: "flex", gap: "14px", marginTop: "36px", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/")} style={{
            flex: 1, padding: "14px", borderRadius: "10px",
            background: "rgba(124,58,237,0.12)", border: "1px solid rgba(139,92,246,0.3)",
            color: "#c4b5fd", cursor: "pointer", fontSize: "14px", fontWeight: 700,
            transition: "all 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(124,58,237,0.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(124,58,237,0.12)"}
          >
            🏠 Back to Dashboard
          </button>
          <button onClick={() => navigate("/")} style={{
            flex: 1, padding: "14px", borderRadius: "10px",
            background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.25)",
            color: "#22d3ee", cursor: "pointer", fontSize: "14px", fontWeight: 700,
            transition: "all 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(6,182,212,0.16)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(6,182,212,0.08)"}
          >
            ➕ New Interview Session
          </button>
        </div>
      </div>
    </div>
  );
}

