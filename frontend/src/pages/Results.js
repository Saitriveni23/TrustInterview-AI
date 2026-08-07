import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function toArr(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.length > 0) return [val];
  return [];
}

export default function Results() {
  const navigate = useNavigate();
  const raw = sessionStorage.getItem("interviewResults");
  const data = raw ? JSON.parse(raw) : null;
  const companyName = sessionStorage.getItem("companyName") || "";
  const [tab, setTab] = useState(0);

  React.useEffect(() => {
    if (data) {
      const { answers, jobRole } = data;
      const safe = Array.isArray(answers) ? answers : [];
      const avg = safe.length ? (safe.reduce((sum, a) => sum + (a.score || 0), 0) / safe.length).toFixed(1) : 0;
      const grade = avg >= 9 ? "Exceptional" : avg >= 7 ? "Good" : avg >= 5 ? "Average" : avg >= 3 ? "Weak" : "Poor";
      const interviewType = sessionStorage.getItem("interviewType") || "mock";

      const historyRaw = localStorage.getItem("candidateAssessmentHistory");
      let historyList = [];
      if (historyRaw) {
        try {
          historyList = JSON.parse(historyRaw);
        } catch (e) {
          historyList = [];
        }
      }

      const sessionKey = `${companyName}-${interviewType}-${avg}`;
      const alreadyLogged = historyList.some(item => item.sessionKey === sessionKey);

      if (!alreadyLogged) {
        const newRecord = {
          sessionKey,
          companyName: companyName || "General",
          interviewType: interviewType === "actual" ? "Official Graded" : "Practice Mock",
          score: avg,
          grade,
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          jobRole: jobRole || "AI Specialist"
        };
        const updatedHistory = [newRecord, ...historyList];
        localStorage.setItem("candidateAssessmentHistory", JSON.stringify(updatedHistory));
      }
    }
  }, [data, companyName]);

  if (!data) {
    return (
      <div style={s.noResultsWrap}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>📊</div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-headings)" }}>No Interview Results Found</div>
        <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 320, textAlign: "center", marginBottom: 20 }}>
          Please go back and complete an assessment first.
        </p>
        <button onClick={() => navigate("/")} className="glow-btn">
          Go to Upload Page
        </button>
      </div>
    );
  }

  const { answers, report, jobRole, candidateName } = data;
  const safe = Array.isArray(answers) ? answers : [];
  const interviewType = sessionStorage.getItem("interviewType") || "mock";
  const avg = safe.length ? (safe.reduce((s, a) => s + (a.score || 0), 0) / safe.length).toFixed(1) : 0;
  
  const grade = avg >= 9 ? "Exceptional" : avg >= 7 ? "Good" : avg >= 5 ? "Average" : avg >= 3 ? "Weak" : "Poor";
  
  const gc = avg >= 7 
    ? "var(--color-success)" 
    : avg >= 5 
      ? "var(--color-warning)" 
      : "var(--color-error)";

  const shadowGlow = avg >= 7
    ? "var(--shadow-success-glow)"
    : avg >= 5
      ? "0 0 15px rgba(234, 179, 8, 0.25)"
      : "var(--shadow-error-glow)";

  return (
    <div style={s.page}>
      {/* Top Navbar */}
      <header style={s.navbar} className="glass-card">
        <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--font-headings)" }}>
          {companyName ? `${companyName} Assessments` : "TrustInterview AI"}
        </span>
        <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, fontFamily: "var(--font-headings)" }}>
          CANDIDATE REPORT: {candidateName.toUpperCase()}
        </span>
      </header>

      <div style={s.mainContainer} className="fade-in-up">
        {/* Verification banner based on Interview Type */}
        {interviewType === "actual" ? (
          <div style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(99, 102, 241, 0.15))",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            padding: "16px 24px",
            borderRadius: "12px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "24px" }}>🎓</span>
              <div>
                <div style={{ color: "#ffffff", fontWeight: 800, fontSize: "14px", fontFamily: "var(--font-headings)" }}>
                  OFFICIAL RVCE PLACEMENTS CELL ASSESSMENT
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "11.5px", marginTop: "2px" }}>
                  This result has been verified under Zero Trust protocols and logged for recruitment review.
                </div>
              </div>
            </div>
            <span style={{
              background: "rgba(16, 185, 129, 0.2)",
              color: "#10b981",
              border: "1px solid #10b981",
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.05em"
            }}>
              PLACEMENTS VERIFIED
            </span>
          </div>
        ) : (
          <div style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "16px 24px",
            borderRadius: "12px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "24px" }}>🧪</span>
              <div>
                <div style={{ color: "#ffffff", fontWeight: 800, fontSize: "14px", fontFamily: "var(--font-headings)" }}>
                  PRACTICE MOCK INTERVIEW SANDBOX
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "11.5px", marginTop: "2px" }}>
                  This is a practice dashboard. Results are private and not shared with the placements office.
                </div>
              </div>
            </div>
            <span style={{
              background: "rgba(255, 255, 255, 0.05)",
              color: "#cbd5e1",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.05em"
            }}>
              PRACTICE SANDBOX
            </span>
          </div>
        )}
        {/* Top Summary Card (Overall performance) */}
        <div className="glass-card" style={s.topSummaryCard}>
          <div style={{ flex: 1 }}>
            <span style={s.sectionHeader}>PERFORMANCE REPORT CARD</span>
            <h1 style={s.roleTitle}>{jobRole}</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14.5, marginTop: 4 }}>
              Completed successfully · {safe.length} questions evaluated.
            </p>
          </div>
          
          <div style={s.scoreBlock}>
            <div 
              style={{ 
                ...s.scoreCircle, 
                borderColor: gc,
                boxShadow: shadowGlow,
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 800, color: gc, fontFamily: "var(--font-headings)" }}>{avg}</div>
              <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, letterSpacing: "0.05em", marginTop: -2 }}>SCORE</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: gc, fontFamily: "var(--font-headings)" }}>{grade}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Rating Grade</div>
            </div>
          </div>
        </div>

        {/* AI Recommendation Box */}
        {report && (
          <div className="glass-card" style={s.card}>
            <div style={s.cardHeader}>
              <span style={s.cardTitle}>AI Recommendation</span>
              <span 
                className="badge" 
                style={{
                  background: report.recommendation === "Hire" ? "var(--color-success-bg)" : report.recommendation === "Consider" ? "var(--color-warning-bg)" : "var(--color-error-bg)",
                  color: report.recommendation === "Hire" ? "var(--color-success)" : report.recommendation === "Consider" ? "var(--color-warning)" : "var(--color-error)",
                  borderColor: report.recommendation === "Hire" ? "rgba(16, 185, 129, 0.2)" : report.recommendation === "Consider" ? "rgba(234, 179, 8, 0.2)" : "rgba(244, 63, 94, 0.2)",
                  border: "1px solid",
                  padding: "4px 12px",
                  fontSize: 12
                }}
              >
                {report.recommendation === "Hire" ? "RECOMMEND TO HIRE" : report.recommendation === "Consider" ? "CONSIDER NEXT ROUND" : "DO NOT RECOMMEND"}
              </span>
            </div>
            {report.overallSummary && <p style={s.overallSummaryText}>{report.overallSummary}</p>}
            {report.recommendationReason && (
              <div style={s.metaNote}>
                <strong>Rationale:</strong> {report.recommendationReason}
              </div>
            )}
          </div>
        )}

        {/* ZTA Layer 12: Demographic Fairness & Bias Shield */}
        {report?.biasSummary && (
          <div 
            className="glass-card" 
            style={{ 
              ...s.card, 
              borderColor: "rgba(16, 185, 129, 0.3)",
              background: "rgba(16, 185, 129, 0.03)",
              marginBottom: "20px"
            }}
          >
            <div style={s.cardHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>🛡️</span>
                <span style={{ ...s.cardTitle, color: "var(--color-success)" }}>ZTA-L12: Demographic Fairness & Bias Shield</span>
              </div>
              <span 
                className="badge"
                style={{
                  color: "var(--color-success)",
                  background: "rgba(3, 7, 18, 0.5)",
                  borderColor: "rgba(16, 185, 129, 0.3)",
                  border: "1px solid",
                  padding: "4px 10px",
                  fontSize: 11
                }}
              >
                {report.biasSummary.status}
              </span>
            </div>

            <div style={s.auditGrid}>
              <div style={s.auditBox}>
                <div style={s.auditBoxTitle}>Fairness Compliance Score</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-success)", fontFamily: "var(--font-headings)" }}>
                  {report.biasSummary.overallCompliance}% Clean
                </div>
                <div style={s.barTrack}>
                  <div 
                    style={{ 
                      ...s.barFill, 
                      width: `${report.biasSummary.overallCompliance}%`, 
                      background: "var(--color-success)"
                    }} 
                  />
                </div>
              </div>

              <div style={s.auditBox}>
                <div style={s.auditBoxTitle}>Identity Bias Exposure</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: report.biasSummary.totalFlagsAcrossInterview > 0 ? "var(--color-warning)" : "#94a3b8", fontFamily: "var(--font-headings)" }}>
                  {100 - report.biasSummary.overallCompliance}% Bias
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                  Total Flagged Identity Terms: <strong style={{ color: report.biasSummary.totalFlagsAcrossInterview > 0 ? "var(--color-warning)" : "var(--color-success)" }}>{report.biasSummary.totalFlagsAcrossInterview}</strong>
                </div>
              </div>
            </div>

            {Object.keys(report.biasSummary.triggeredCategories || {}).length > 0 && (
              <div style={{ marginTop: "14px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#e5e7eb", marginBottom: 10, fontFamily: "var(--font-headings)" }}>FLAGGED DEVIATIONS DETECTED:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(report.biasSummary.triggeredCategories).map(([cat, count], idx) => (
                    <div key={idx} style={s.auditItem}>
                      <span style={{ color: "#ffffff", fontWeight: 600 }}>{cat}</span>
                      <span className="badge badge-warning" style={{ fontSize: 11 }}>{count} flag(s) in evaluation logs</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ZTA Layer 13: Hallucination & Factuality Audit */}
        {report?.hallucinationSummary && (
          <div 
            className="glass-card" 
            style={{ 
              ...s.card, 
              borderColor: "rgba(234, 179, 8, 0.3)",
              background: "rgba(234, 179, 8, 0.03)"
            }}
          >
            <div style={s.cardHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>🔍</span>
                <span style={{ ...s.cardTitle, color: "var(--color-warning)" }}>ZTA-L13: Factuality & Anti-Hallucination Audit</span>
              </div>
              <span 
                className="badge"
                style={{
                  color: report.hallucinationSummary.avgHallucinationRisk < 25 ? "var(--color-success)" : report.hallucinationSummary.avgHallucinationRisk < 55 ? "var(--color-warning)" : "var(--color-error)",
                  background: "rgba(3, 7, 18, 0.5)",
                  borderColor: report.hallucinationSummary.avgHallucinationRisk < 25 ? "rgba(16, 185, 129, 0.3)" : report.hallucinationSummary.avgHallucinationRisk < 55 ? "rgba(234, 179, 8, 0.3)" : "rgba(244, 63, 94, 0.3)",
                  border: "1px solid",
                  padding: "4px 10px",
                  fontSize: 11
                }}
              >
                {report.hallucinationSummary.status}
              </span>
            </div>

            <div style={s.auditGrid}>
              <div style={s.auditBox}>
                <div style={s.auditBoxTitle}>Average Hallucination Risk</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: report.hallucinationSummary.avgHallucinationRisk < 25 ? "var(--color-success)" : report.hallucinationSummary.avgHallucinationRisk < 55 ? "var(--color-warning)" : "var(--color-error)", fontFamily: "var(--font-headings)" }}>
                  {report.hallucinationSummary.avgHallucinationRisk}% Risk
                </div>
                <div style={s.barTrack}>
                  <div 
                    style={{ 
                      ...s.barFill, 
                      width: `${report.hallucinationSummary.avgHallucinationRisk}%`, 
                      background: report.hallucinationSummary.avgHallucinationRisk < 25 ? "var(--color-success)" : report.hallucinationSummary.avgHallucinationRisk < 55 ? "var(--color-warning)" : "var(--color-error)"
                    }} 
                  />
                </div>
              </div>

              <div style={s.auditBox}>
                <div style={s.auditBoxTitle}>Factuality & Grounding Grade</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", fontFamily: "var(--font-headings)" }}>
                  {report.hallucinationSummary.truthfulnessGrade}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                  Total Flagged Claims: <strong style={{ color: report.hallucinationSummary.totalFlags === 0 ? "var(--color-success)" : "var(--color-error)" }}>{report.hallucinationSummary.totalFlags}</strong>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: "#e5e7eb", marginBottom: 10, fontFamily: "var(--font-headings)", letterSpacing: "0.02em" }}>FACTUALITY BREAKDOWN PER QUESTION</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {report.hallucinationSummary.questionBreakdown?.map((q, idx) => (
                <div key={idx} style={s.auditItem}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Q{q.questionIndex} ({q.skill})</span>
                    <span style={{ fontSize: 12.5, color: q.flaggedCount === 0 ? "var(--color-success)" : "var(--color-warning)", marginLeft: 12 }}>
                      {q.flaggedCount === 0 ? "✓ Fully Grounded" : `⚠️ ${q.flaggedCount} Unverified Statement(s)`}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: q.hallucinationRiskScore < 25 ? "var(--color-success)" : "var(--color-warning)", fontFamily: "monospace" }}>
                    {q.hallucinationRiskScore}% RISK
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Score Per Question Cards */}
        <div className="glass-card" style={s.card}>
          <div style={s.cardTitle} className={{ marginBottom: 18 }}>Evaluation breakdown</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {safe.map((a, i) => {
              const c = a.score >= 7 ? "var(--color-success)" : a.score >= 5 ? "var(--color-warning)" : "var(--color-error)";
              return (
                <div key={i} style={s.scoreRow}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb" }}>
                      Q{i + 1} — {a.skill || "General Core"}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: c, fontFamily: "var(--font-headings)" }}>
                      {a.score}/10 · {a.grade}
                    </span>
                  </div>
                  <div style={s.barTrack}>
                    <div style={{ ...s.barFill, width: `${(a.score / 10) * 100}%`, background: c }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed per-question answers and evaluations tabs */}
        <div className="glass-card" style={s.card}>
          <div style={{ ...s.cardTitle, marginBottom: 16 }}>Detailed Answer Audit</div>
          
          <div style={s.tabsWrap}>
            {safe.map((a, i) => {
              const c = a.score >= 7 ? "var(--color-success)" : a.score >= 5 ? "var(--color-warning)" : "var(--color-error)";
              const isActive = tab === i;
              return (
                <button 
                  key={i} 
                  onClick={() => setTab(i)}
                  style={{ 
                    ...s.tabBtn,
                    background: isActive ? "rgba(255, 255, 255, 0.03)" : "transparent",
                    borderColor: isActive ? c : "rgba(255, 255, 255, 0.08)",
                    color: isActive ? c : "#9ca3af",
                    fontWeight: isActive ? 700 : 400
                  }}
                >
                  Q{i + 1} ({a.score}/10)
                </button>
              );
            })}
          </div>

          {safe[tab] && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }} className="fade-in-up">
              {/* Question Text */}
              <div style={s.auditQuestionBlock}>
                <div style={s.auditLabel}>
                  QUESTION {tab + 1} · {safe[tab].type.toUpperCase()} FOCUS · {safe[tab].skill.toUpperCase()}
                </div>
                <div style={s.auditQuestionText}>"{safe[tab].question}"</div>
              </div>

              {/* Answers Grid */}
              <div style={s.evaluationDetailsGrid}>
                {/* Candidate Answer */}
                <div style={s.blockBox}>
                  <div style={s.auditLabel}>YOUR TRANSCRIBED ANSWER</div>
                  <div style={s.blockText}>{safe[tab].answer}</div>
                </div>

                {/* AI Ideal Answer */}
                {safe[tab].idealAnswer && (
                  <div style={{ ...s.blockBox, background: "rgba(16, 185, 129, 0.02)", borderColor: "rgba(16, 185, 129, 0.1)" }}>
                    <div style={{ ...s.auditLabel, color: "var(--color-success)" }}>EXPECTED CRITERIA / IDEAL OUTLINE</div>
                    <div style={s.blockText}>{safe[tab].idealAnswer}</div>
                  </div>
                )}
              </div>

              {/* AI Evaluation Summary */}
              {safe[tab].summary && (
                <div style={s.blockBox}>
                  <div style={s.auditLabel}>EVALUATION CRITIQUE</div>
                  <div style={s.blockText}>{safe[tab].summary}</div>
                </div>
              )}

              {/* Strengths & Improvements */}
              <div style={s.strengthsGrid}>
                <div style={{ ...s.bulletCard, background: "rgba(16, 185, 129, 0.03)", borderColor: "rgba(16, 185, 129, 0.15)" }}>
                  <div style={{ ...s.auditLabel, color: "var(--color-success)", marginBottom: 10 }}>STRENGTHS IDENTIFIED</div>
                  {toArr(safe[tab].strengths).length > 0 ? (
                    toArr(safe[tab].strengths).map((st, j) => (
                      <div key={j} style={s.strengthItem}>+ {st}</div>
                    ))
                  ) : (
                    <div style={s.strengthItem}>+ Covered the basic outline of the topic.</div>
                  )}
                </div>

                <div style={{ ...s.bulletCard, background: "rgba(244, 63, 94, 0.03)", borderColor: "rgba(244, 63, 94, 0.15)" }}>
                  <div style={{ ...s.auditLabel, color: "var(--color-error)", marginBottom: 10 }}>RECOMMENDED IMPROVEMENTS</div>
                  {toArr(safe[tab].improvements).length > 0 ? (
                    toArr(safe[tab].improvements).map((im, j) => (
                      <div key={j} style={s.improvementItem}>* {im}</div>
                    ))
                  ) : (
                    <div style={s.improvementItem}>* Clear explanation, minor additions could build depth.</div>
                  )}
                </div>
              </div>

              {/* Per-question Factuality Check */}
              {safe[tab].hallucinationCheck && (
                <div 
                  style={{ 
                    ...s.blockBox, 
                    borderColor: "rgba(234, 179, 8, 0.3)", 
                    background: "rgba(234, 179, 8, 0.02)" 
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ ...s.auditLabel, color: "var(--color-warning)" }}>ZTA-L13 DETAILED FACT AUDIT</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: safe[tab].hallucinationCheck.hallucinationRiskScore < 25 ? "var(--color-success)" : "var(--color-warning)", fontFamily: "monospace" }}>
                      Risk Score: {safe[tab].hallucinationCheck.hallucinationRiskScore}% ({safe[tab].hallucinationCheck.truthfulnessGrade})
                    </span>
                  </div>
                  <div style={{ ...s.blockText, marginBottom: 10 }}>
                    {safe[tab].hallucinationCheck.details}
                  </div>
                  {safe[tab].hallucinationCheck.flaggedHallucinations?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-error)", marginBottom: 6, letterSpacing: "0.02em", fontFamily: "var(--font-headings)" }}>UNVERIFIED CLAIMS DETECTED:</div>
                      {safe[tab].hallucinationCheck.flaggedHallucinations.map((fl, fIdx) => (
                        <div key={fIdx} style={{ fontSize: 12.5, color: "#fca5a5", marginLeft: 8, marginBottom: 4, lineHeight: 1.5 }}>
                          • <strong>[{fl.type}]</strong> {fl.term ? `"${fl.term}": ` : ""}{fl.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Skills Summary Grid */}
        {report && (
          <div className="glass-card" style={s.card}>
            <div style={s.cardTitle}>Skills Matrix Summary</div>
            <div style={s.strengthsGrid}>
              <div style={{ ...s.bulletCard, background: "rgba(16, 185, 129, 0.03)", borderColor: "rgba(16, 185, 129, 0.15)" }}>
                <div style={{ ...s.auditLabel, color: "var(--color-success)", marginBottom: 10 }}>STRONG SKILLS AREAS</div>
                {toArr(report.strongSkills).map((sk, i) => (
                  <div key={i} style={s.strengthItem}>+ {sk}</div>
                ))}
              </div>
              <div style={{ ...s.bulletCard, background: "rgba(234, 179, 8, 0.03)", borderColor: "rgba(234, 179, 8, 0.15)" }}>
                <div style={{ ...s.auditLabel, color: "var(--color-warning)", marginBottom: 10 }}>AREAS REQUIRING MENTORSHIP</div>
                {toArr(report.weakSkills).map((sk, i) => (
                  <div key={i} style={s.improvementItem}>* {sk}</div>
                ))}
              </div>
            </div>
            {report.nextSteps && (
              <div style={{ ...s.blockBox, marginTop: 16, background: "rgba(139, 92, 246, 0.02)", borderColor: "rgba(139, 92, 246, 0.12)" }}>
                <div style={{ ...s.auditLabel, color: "#c084fc" }}>DEVELOPMENT ACTION PLAN</div>
                <div style={s.blockText}>{report.nextSteps}</div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div style={s.actionsRow}>
          <button
            onClick={() => { sessionStorage.clear(); navigate("/"); }}
            className="glow-btn"
            style={{ padding: "14px 32px" }}
          >
            Start New Assessment
          </button>
          <button
            onClick={() => window.print()}
            style={s.printBtn}
          >
            🖨️ Print Detailed Report
          </button>
        </div>

        <p style={s.disclaimer}>
          Security Notice: This evaluation log is stored locally within this browser tab memory space and is cleared immediately when closed.
        </p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    color: "var(--text-main)",
    fontFamily: "var(--font-body)",
    paddingBottom: 64,
    position: "relative",
    zIndex: 1,
  },
  noResultsWrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: 16,
    color: "#fff",
    fontFamily: "var(--font-body)"
  },
  navbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 24px",
    maxWidth: 900,
    width: "100%",
    margin: "0 auto 24px",
    borderRadius: 14,
    background: "rgba(17, 24, 39, 0.45)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  mainContainer: {
    maxWidth: 900,
    width: "100%",
    margin: "0 auto",
    padding: "0 20px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  topSummaryCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "32px 36px",
    background: "rgba(17, 24, 39, 0.55)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    gap: 24,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: 800,
    color: "var(--color-primary)",
    letterSpacing: "0.1em",
    fontFamily: "var(--font-headings)",
  },
  roleTitle: {
    fontSize: 28,
    fontWeight: 800,
    color: "#ffffff",
    marginTop: 8,
    fontFamily: "var(--font-headings)",
    letterSpacing: "-0.015em",
  },
  scoreBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  scoreCircle: {
    width: 96,
    height: 96,
    borderRadius: "50%",
    border: "4px solid",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(3, 7, 18, 0.4)",
  },
  card: {
    background: "rgba(17, 24, 39, 0.45)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 24,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: 700,
    color: "#ffffff",
    fontFamily: "var(--font-headings)",
    letterSpacing: "0.01em",
  },
  overallSummaryText: {
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 1.75,
    marginBottom: 14,
  },
  metaNote: {
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 12.5,
    color: "var(--text-muted)",
    lineHeight: 1.5,
  },
  auditGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginBottom: 20,
  },
  auditBox: {
    background: "rgba(3, 7, 18, 0.35)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
  },
  auditBoxTitle: {
    fontSize: 11.5,
    color: "var(--text-muted)",
    marginBottom: 6,
    fontWeight: 600,
  },
  barTrack: {
    height: 6,
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: 99,
    marginTop: 10,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 99,
  },
  auditItem: {
    background: "rgba(3, 7, 18, 0.35)",
    border: "1px solid rgba(255, 255, 255, 0.04)",
    borderRadius: 10,
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreRow: {
    paddingBottom: 10,
    borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
  },
  tabsWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  tabBtn: {
    border: "1px solid",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 12,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    fontFamily: "var(--font-headings)",
  },
  auditQuestionBlock: {
    background: "rgba(3, 7, 18, 0.35)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: "16px 20px",
  },
  auditLabel: {
    fontSize: 10,
    color: "var(--color-primary)",
    fontWeight: 800,
    letterSpacing: "0.08em",
    fontFamily: "var(--font-headings)",
    marginBottom: 8,
  },
  auditQuestionText: {
    fontSize: 15,
    fontWeight: 600,
    color: "#fff",
    lineHeight: 1.6,
  },
  evaluationDetailsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  blockBox: {
    background: "rgba(255, 255, 255, 0.01)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    padding: "16px 18px",
  },
  blockText: {
    fontSize: 13,
    color: "#d1d5db",
    lineHeight: 1.7,
  },
  strengthsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  bulletCard: {
    border: "1px solid",
    borderRadius: 12,
    padding: "16px 18px",
  },
  strengthItem: {
    fontSize: 13,
    color: "#34d399",
    lineHeight: 1.6,
    marginBottom: 6,
    fontWeight: 500,
  },
  improvementItem: {
    fontSize: 13,
    color: "#fb7185",
    lineHeight: 1.6,
    marginBottom: 6,
    fontWeight: 500,
  },
  actionsRow: {
    display: "flex",
    gap: 16,
  },
  printBtn: {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    color: "#e5e7eb",
    borderRadius: 10,
    padding: "12px 24px",
    fontFamily: "var(--font-headings)",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "all var(--transition-fast)",
  },
  disclaimer: {
    textAlign: "center",
    fontSize: 11,
    color: "var(--text-dark)",
    marginTop: 8,
  },
};