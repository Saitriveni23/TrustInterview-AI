import React, { useState, useEffect } from "react";

const BACKEND = process.env.REACT_APP_API_URL || "http://localhost:5001";

const layerColors = {
  active:   "#10b981",
  BLOCKED:  "#f43f5e",
  DISABLED: "#6b7280",
};

export default function ZTABadge({ compact = false, page = "" }) {
  const [ztaData, setZtaData] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res  = await fetch(`${BACKEND}/api/zta-status`);
        const data = await res.json();
        setZtaData(data);
      } catch {
        setZtaData(null);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const isActive    = ztaData?.ztaEnabled;
  const threatLevel = ztaData?.threatLevel || "none";
  const layers      = ztaData?.layers || [];

  const badgeColor = isActive
    ? threatLevel === "high" || threatLevel === "critical" ? "#f59e0b" : "#10b981"
    : "#f43f5e";

  const badgeLabel = isActive
    ? threatLevel === "high" || threatLevel === "critical" ? "ZTA: THREAT DETECTED" : "ZTA: ACTIVE"
    : "ZTA: OFFLINE";

  if (compact) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          cursor: "pointer",
          padding: "5px 10px",
          borderRadius: "20px",
          background: isActive ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)",
          border: `1px solid ${badgeColor}30`,
          position: "relative",
        }}
        onClick={() => setExpanded(!expanded)}
        title="ZTA Security Status"
      >
        {/* Animated pulse dot */}
        <span style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: badgeColor,
          display: "inline-block",
          animation: isActive ? "ztaPulse 2s ease-in-out infinite" : "none",
          boxShadow: `0 0 6px ${badgeColor}`,
        }} />
        <span style={{
          fontSize: "10px",
          fontWeight: 700,
          color: badgeColor,
          letterSpacing: "0.04em",
          fontFamily: "'Outfit', sans-serif",
          userSelect: "none",
        }}>
          {badgeLabel}
        </span>

        {/* Expanded dropdown */}
        {expanded && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "#0d1117",
            border: "1px solid #30363d",
            borderRadius: "12px",
            padding: "14px",
            minWidth: "220px",
            zIndex: 9999,
            boxShadow: "0 16px 40px rgba(0,0,0,0.8)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
              <span style={{ color:"#f0f6fc", fontSize:"12px", fontWeight:700 }}>🛡️ ZTA Layer Status</span>
              {page && <span style={{ color:"#8b949e", fontSize:"10px" }}>Page: {page}</span>}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
              {layers.map(layer => (
                <div key={layer.id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "5px 8px",
                  borderRadius: "6px",
                  background: layer.status === "active" ? "rgba(16,185,129,0.06)" : "rgba(244,63,94,0.06)",
                }}>
                  <span style={{ color:"#c9d1d9", fontSize:"10.5px" }}>
                    <span style={{ color: layer.color, marginRight:"4px" }}>{layer.id}</span>
                    {layer.name}
                  </span>
                  <span style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    color: layerColors[layer.status] || "#6b7280",
                    textTransform: "uppercase",
                  }}>
                    {layer.status}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:"10px", paddingTop:"8px", borderTop:"1px solid #30363d", fontSize:"10px", color:"#8b949e", textAlign:"center" }}>
              Threat Level: <span style={{ color: badgeColor, fontWeight:700 }}>{threatLevel.toUpperCase()}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full badge (for pages that need a bigger ZTA indicator)
  return (
    <div style={{
      background: isActive ? "rgba(16,185,129,0.08)" : "rgba(244,63,94,0.08)",
      border: `1px solid ${badgeColor}40`,
      borderRadius: "12px",
      padding: "12px 18px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
    }}>
      <div style={{
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        background: isActive ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)",
        border: `2px solid ${badgeColor}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "16px",
        animation: isActive ? "ztaPulse 2s ease-in-out infinite" : "none",
      }}>
        🛡️
      </div>
      <div>
        <div style={{ color: badgeColor, fontSize:"12px", fontWeight:800, letterSpacing:"0.06em", textTransform:"uppercase" }}>
          {badgeLabel}
        </div>
        <div style={{ color:"#8b949e", fontSize:"11px", marginTop:"2px" }}>
          {layers.filter(l => l.status === "active").length} / {layers.length} layers active
          {page && ` · ${page}`}
        </div>
      </div>
    </div>
  );
}
