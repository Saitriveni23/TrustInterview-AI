import React, { useState, useEffect } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:5001";

// Mapping each layer ID to a classification, scope, tech stack, and static details
const LAYER_METADATA = {
  L1:  { category: "Infrastructure", classKey: "infra",      scope: "API Endpoints",   tech: "JWT Signatures",      desc: "Cryptographic session tokens verification" },
  L2:  { category: "Infrastructure", classKey: "infra",      scope: "Client Sandbox",  tech: "Telemetry Scanners",  desc: "Blocks headless browsers and bots" },
  L3:  { category: "Infrastructure", classKey: "infra",      scope: "Domain Gateway",  tech: "CORS Lock",           desc: "Microsegments origin domains" },
  L4:  { category: "Workload & Data",  classKey: "workload",   scope: "Memory Buffers",  tech: "10MB Payload Cap",    desc: "Blocks Denial-of-Service overflows" },
  L5:  { category: "Workload & Data",  classKey: "workload",   scope: "PDF Parser",      tech: "100ms Parse/Delete",  desc: "Zero retention document protection" },
  L6:  { category: "Workload & Data",  classKey: "workload",   scope: "System Logs",     tech: "JSON Audit Logger",   desc: "SIEM-compatible non-repudiation logs" },
  L7:  { category: "Threat & SOAR",    classKey: "threat",     scope: "Network Firewall",tech: "SOAR Middleware",     desc: "Autonomous IP rate-limiting & blocking" },
  L8:  { category: "Threat & SOAR",    classKey: "threat",     scope: "Input Scanners",  tech: "XSS & SQL Injection", desc: "Filters out payload malicious fragments" },
  L9:  { category: "Threat & SOAR",    classKey: "threat",     scope: "Access PDP",      tech: "Method Policies",     desc: "Centralized policy decision engine" },
  L10: { category: "Threat & SOAR",    classKey: "threat",     scope: "Transport Edge",  tech: "HSTS Enforcer",       desc: "Forces strictly encrypted traffic only" },
  L11: { category: "Threat & SOAR",    classKey: "threat",     scope: "Blocklist Table", tech: "Threat Intelligence",  desc: "Blocks known malicious IP blocks" },
  L12: { category: "Compliance & AI",  classKey: "compliance", scope: "AI Evaluation",   tech: "Demographic Shield",  desc: "Blocks age, gender, and name bias" },
  L13: { category: "Compliance & AI",  classKey: "compliance", scope: "AI Generation",   tech: "Fact Grounding",      desc: "Verifies queries and answers against CV" },
};

export default function ZTAStatusDashboard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [starredLayers, setStarredLayers] = useState({});

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

  const isFraud = status?.fraudAlert;

  const layers = status?.layers || [];

  // Toggle favorite star on a card
  const toggleStar = (id, e) => {
    e.stopPropagation();
    setStarredLayers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Categories helper to count layers per group
  const getCategoryCount = (catName) => {
    if (catName === "ALL") return layers.length;
    return layers.filter(l => {
      const meta = LAYER_METADATA[l.id];
      return meta && meta.category.toLowerCase().includes(catName.toLowerCase());
    }).length;
  };

  // Filter logic
  const filteredLayers = layers.filter(l => {
    if (activeFilter === "ALL") return true;
    const meta = LAYER_METADATA[l.id];
    return meta && meta.category.toLowerCase().includes(activeFilter.toLowerCase());
  });

  return (
    <div style={{ width: "100%" }}>
      {/* Horizontal Filter Pill Section */}
      <div className="filter-bar-header">
        <span className="filter-title">FILTER BY SECURITY CLASS</span>
        <button 
          style={{
            background: "none",
            border: "none",
            color: "#6366f1",
            fontSize: "11px",
            fontWeight: "700",
            cursor: "pointer",
            fontFamily: "var(--font-headings)"
          }}
          onClick={() => setActiveFilter("ALL")}
        >
          ✕ Reset
        </button>
      </div>

      <div className="pills-container">
        {[
          { key: "ALL", label: "ALL" },
          { key: "infra", label: "INFRASTRUCTURE" },
          { key: "workload", label: "WORKLOAD & DATA" },
          { key: "threat", label: "THREAT SHIELD" },
          { key: "compliance", label: "COMPLIANCE & AI" }
        ].map(pill => {
          const count = getCategoryCount(pill.key);
          const isActive = activeFilter === pill.key || (pill.key === "infra" && activeFilter === "infrastructure") || (pill.key === "workload" && activeFilter === "workload & data") || (pill.key === "threat" && activeFilter === "threat & soar") || (pill.key === "compliance" && activeFilter === "compliance & ai");
          
          return (
            <button
              key={pill.key}
              className={`filter-pill ${isActive ? "active" : ""}`}
              onClick={() => {
                if (pill.key === "ALL") setActiveFilter("ALL");
                else if (pill.key === "infra") setActiveFilter("infrastructure");
                else if (pill.key === "workload") setActiveFilter("workload & data");
                else if (pill.key === "threat") setActiveFilter("threat & soar");
                else if (pill.key === "compliance") setActiveFilter("compliance & ai");
              }}
            >
              {pill.label}
              <span className="filter-pill-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Grid of ZTA Premium Layer Cards */}
      <div className="layers-grid">
        {filteredLayers.map(l => {
          const companyName = sessionStorage.getItem("companyName");
          let meta = { ...(LAYER_METADATA[l.id] || { category: "General", classKey: "infra", scope: "Middleware", tech: "API Layer", desc: "" }) };
          let layerName = l.name;

          if (companyName) {
            if (l.id === "L9") {
              layerName = "Company Eligibility PDP Guard";
              meta.scope = `${companyName} Cutoffs`;
              meta.tech = "Eligibility Verification";
            } else if (l.id === "L13") {
              layerName = "Fact Grounding & PYQ Check";
              meta.scope = `${companyName} PYQ Database`;
              meta.tech = "PYQ Pattern Matching";
            }
          }

          const active = l.status === "active";
          const blocked = l.status === "BLOCKED";
          const integrityScore = blocked ? 0 : (active ? 100 : 0);
          const isStarred = !!starredLayers[l.id];

          return (
            <div 
              key={l.id} 
              className={`zta-premium-card ${blocked ? "blocked" : ""}`}
            >
              <div>
                {/* Header Tag and Star */}
                <div className="card-top">
                  <span className={`card-tag ${meta.classKey}`}>{meta.category}</span>
                  <span 
                    className={`card-icon ${isStarred ? "active" : ""}`}
                    onClick={(e) => toggleStar(l.id, e)}
                  >
                    ★
                  </span>
                </div>

                {/* Card Title */}
                <h3 className="card-title">{l.id}: {layerName}</h3>

                {/* Card Scope & Technology Details */}
                <div className="card-detail" style={{ marginTop: "12px" }}>
                  <span className="card-detail-icon">📍</span>
                  <span>Scope: {meta.scope}</span>
                </div>
                <div className="card-detail">
                  <span className="card-detail-icon">⚙️</span>
                  <span>Tech: {meta.tech}</span>
                </div>
              </div>

              {/* Progress Integrity Slider */}
              <div className="card-progress-section">
                <div className="card-progress-label">
                  <span>INTEGRITY RATE</span>
                  <span style={{ color: blocked ? "#f43f5e" : (active ? "#10b981" : "#eab308") }}>
                    {integrityScore}%
                  </span>
                </div>
                <div className="card-progress-bar">
                  <div 
                    className="card-progress-fill" 
                    style={{ 
                      width: `${integrityScore}%`,
                      background: blocked ? "#ef4444" : (active ? "#10b981" : "#eab308")
                    }}
                  />
                </div>
              </div>

              {/* Card Footer Status */}
              <div className="card-footer">
                <span className="card-footer-date">SECURE LAYER</span>
                <span className={`card-footer-status ${blocked ? "status-blocked" : (active ? "status-secured" : "status-disabled")}`}>
                  {l.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fraud Warning Box / Vulnerability Banner */}
      {isFraud && (
        <div 
          style={{ 
            background: "rgba(220, 38, 38, 0.05)", 
            border: "1px solid rgba(239, 68, 68, 0.25)", 
            borderRadius: "12px", 
            padding: "16px",
            marginTop: "20px" 
          }}
        >
          <div style={{ color: "#ef4444", fontWeight: "700", fontSize: "13px", marginBottom: "8px", fontFamily: "var(--font-headings)" }}>
            🛑 SECURITY DISRUPTION - SYSTEM LOCK ACTIVE
          </div>
          <p style={{ color: "#cbd5e1", fontSize: "12px", lineHeight: "1.5" }}>
            The SOAR Orchestrator triggered an automated IP block because the client signature failed security metrics. Device fingerprint alerts and SQL patterns were intercepted. All layer integrity scales dropped to 0%.
          </p>
        </div>
      )}
    </div>
  );
}
