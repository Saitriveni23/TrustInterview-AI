import React, { useState, useEffect, useRef } from "react";

export default function TimerBar({ seconds, onTimeout, active }) {
  const [left, setLeft] = useState(seconds);
  const intervalRef = useRef(null);

  useEffect(() => { 
    setLeft(seconds); 
  }, [seconds]);

  useEffect(() => {
    if (!active) return;
    const delay = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        setLeft(prev => {
          if (prev <= 1) { 
            clearInterval(intervalRef.current); 
            onTimeout(); 
            return 0; 
          }
          return prev - 1;
        });
      }, 1000);
    }, 800);
    return () => { 
      clearTimeout(delay); 
      clearInterval(intervalRef.current); 
    };
  }, [active, seconds, onTimeout]);

  const pct = (left / seconds) * 100;
  const mins = Math.floor(left / 60);
  const secs = left % 60;
  const urgent  = left <= 20;
  const warning = left <= 45 && left > 20;
  
  const color = urgent 
    ? "var(--color-error)" 
    : warning 
      ? "var(--color-warning)" 
      : "var(--color-primary)";

  const bg = urgent 
    ? "rgba(244, 63, 94, 0.05)" 
    : warning 
      ? "rgba(234, 179, 8, 0.05)" 
      : "rgba(139, 92, 246, 0.05)";

  const border = urgent
    ? "rgba(244, 63, 94, 0.2)"
    : warning
      ? "rgba(234, 179, 8, 0.2)"
      : "rgba(139, 92, 246, 0.2)";

  return (
    <div 
      className="glass-card" 
      style={{
        ...s.card,
        background: bg,
        borderColor: border,
      }}
    >
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "#9ca3af" }}>
          <span style={{ 
            width: 8, 
            height: 8, 
            borderRadius: "50%", 
            background: color, 
            display: "inline-block",
            boxShadow: urgent ? "var(--shadow-error-glow)" : "none",
            animation: urgent ? "pulse 1s infinite" : "none"
          }}/>
          <span style={{ fontFamily: "var(--font-headings)", letterSpacing: "0.02em" }}>
            {urgent ? "⚠️ TIME IS RUNNING OUT" : warning ? "⏳ WRAP UP YOUR ANSWER" : "⏱️ TIME REMAINING"}
          </span>
        </div>
        <div style={{ ...s.timeVal, color }}>
          {mins}:{secs.toString().padStart(2, "0")}
        </div>
      </div>
      
      <div style={s.barContainer}>
        <div 
          style={{
            ...s.bar,
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 10px ${color}88`,
          }}
        />
      </div>
      
      <div style={s.footer}>
        <span style={{ color: urgent ? "var(--color-error)" : warning ? "var(--color-warning)" : "#9ca3af", fontWeight: 600 }}>
          {urgent ? "Submit now!" : warning ? "Formulating final sentences..." : left + " seconds remaining"}
        </span>
        <span style={s.limitText}>Limit: {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, "0")}</span>
      </div>
    </div>
  );
}

const s = {
  card: {
    border: "1px solid",
    borderRadius: 14,
    padding: "16px 20px",
    transition: "all 0.5s ease",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  timeVal: {
    fontSize: 22,
    fontWeight: 800,
    fontVariantNumeric: "tabular-nums",
    fontFamily: "var(--font-headings)",
    letterSpacing: "-0.01em",
  },
  barContainer: {
    height: 8,
    background: "rgba(3, 7, 18, 0.4)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    borderRadius: 99,
    overflow: "hidden",
    marginBottom: 10,
  },
  bar: {
    height: "100%",
    borderRadius: 99,
    transition: "width 1s linear, background-color 0.5s ease",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    fontSize: 11,
    fontFamily: "var(--font-headings)",
  },
  limitText: {
    color: "#6b7280",
    marginLeft: "auto",
    fontWeight: 500,
  },
};
