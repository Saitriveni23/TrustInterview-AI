import React from "react";

export default function QuestionBox({ question, index }) {
  if (!question) return null;

  const types = {
    technical: {
      border: "rgba(139, 92, 246, 0.35)",
      glow: "rgba(139, 92, 246, 0.15)",
      text: "#c084fc",
      bg: "rgba(139, 92, 246, 0.08)",
      label: "Technical Focus",
      icon: "⚙️"
    },
    behavioural: {
      border: "rgba(16, 185, 129, 0.35)",
      glow: "rgba(16, 185, 129, 0.15)",
      text: "#34d399",
      bg: "rgba(16, 185, 129, 0.08)",
      label: "Behavioral Core",
      icon: "🧠"
    },
    situational: {
      border: "rgba(6, 182, 212, 0.35)",
      glow: "rgba(6, 182, 212, 0.15)",
      text: "#22d3ee",
      bg: "rgba(6, 182, 212, 0.08)",
      label: "Situational Logic",
      icon: "💡"
    },
  };

  const t = types[question.type] || types.technical;

  return (
    <div 
      className="glass-card fade-in-up"
      style={{
        ...s.card,
        borderColor: t.border,
        background: t.bg,
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${t.glow}`,
      }}
    >
      <div style={s.badgeRow}>
        <span 
          style={{
            ...s.badge,
            color: t.text,
            background: "rgba(3, 7, 18, 0.4)",
            borderColor: t.border,
          }}
        >
          {t.icon} {t.label}
        </span>
        <span style={s.skillBadge}>
          🎯 {question.skill}
        </span>
        <span style={s.timeBadge}>
          ⏱️ {question.timeLimit}s limit
        </span>
      </div>

      <div style={s.questionMeta}>
        QUESTION {index + 1}
      </div>
      <h2 style={s.questionText}>
        "{question.question}"
      </h2>

      <div style={s.footer}>
        <span style={s.footerItem}><span style={{ color: "var(--color-success)" }}>✓</span> BIAS SHIELD ACTIVE</span>
        <span style={s.footerDivider}>·</span>
        <span style={s.footerItem}><span style={{ color: "#a78bfa" }}>📄</span> RESUME MATCHED</span>
      </div>
    </div>
  );
}

const s = {
  card: {
    padding: "24px 28px",
    borderRadius: 18,
    border: "1px solid",
  },
  badgeRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontWeight: 700,
    padding: "5px 12px",
    borderRadius: 99,
    border: "1px solid",
    letterSpacing: "0.02em",
    textTransform: "uppercase",
    fontFamily: "var(--font-headings)",
  },
  skillBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: "#d1d5db",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "5px 12px",
    borderRadius: 99,
    fontFamily: "var(--font-headings)",
  },
  timeBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: "#cbd5e1",
    background: "rgba(30, 41, 59, 0.5)",
    border: "1px solid rgba(148, 163, 184, 0.15)",
    padding: "5px 12px",
    borderRadius: 99,
    marginLeft: "auto",
    fontFamily: "var(--font-headings)",
  },
  questionMeta: {
    fontSize: 11,
    fontWeight: 800,
    color: "rgba(255, 255, 255, 0.35)",
    letterSpacing: "0.15em",
    marginBottom: 10,
    fontFamily: "var(--font-headings)",
  },
  questionText: {
    fontSize: 19,
    fontWeight: 600,
    color: "#ffffff",
    lineHeight: 1.6,
    marginBottom: 20,
    fontFamily: "var(--font-headings)",
    letterSpacing: "-0.01em",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
    paddingTop: 14,
    fontSize: 11,
    fontWeight: 600,
    color: "#6b7280",
    letterSpacing: "0.03em",
    fontFamily: "var(--font-headings)",
  },
  footerItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  footerDivider: {
    color: "rgba(255, 255, 255, 0.1)",
  },
};
