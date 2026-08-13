import React from "react";

/**
 * ErrorBoundary — catches render errors in child components
 * and shows a clean fallback UI instead of a blank screen.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Caught:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh",
        background: "#06060f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: "40px",
        fontFamily: "var(--font-body, 'Inter', sans-serif)",
        textAlign: "center",
      }}>
        {/* Ambient glow */}
        <div style={{
          position: "absolute", width: "300px", height: "300px",
          background: "rgba(239,68,68,0.06)", borderRadius: "50%", filter: "blur(100px)",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "500px" }}>
          <div style={{ fontSize: "56px", marginBottom: "20px" }}>⚡</div>
          <h1 style={{
            fontSize: "26px", fontWeight: 900, color: "#f0f0ff",
            fontFamily: "var(--font-headings, 'Plus Jakarta Sans', sans-serif)",
            marginBottom: "12px", letterSpacing: "-0.02em",
          }}>
            Application Error
          </h1>
          <p style={{ color: "#6b6b90", fontSize: "14px", lineHeight: 1.7, marginBottom: "28px" }}>
            An unexpected error occurred in this section. Your session data is preserved.
          </p>

          <div style={{
            background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "12px", padding: "14px 18px", marginBottom: "28px",
            fontSize: "12px", fontFamily: "var(--font-mono, monospace)",
            color: "#f87171", textAlign: "left", wordBreak: "break-word",
          }}>
            {this.state.error?.message || "Unknown error"}
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                background: "rgba(124,58,237,0.15)", border: "1px solid rgba(139,92,246,0.4)",
                color: "#c4b5fd", padding: "12px 24px", borderRadius: "10px",
                cursor: "pointer", fontSize: "13.5px", fontWeight: 700,
                transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(124,58,237,0.25)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(124,58,237,0.15)"}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = "/"}
              style={{
                background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
                color: "#6b6b90", padding: "12px 24px", borderRadius: "10px",
                cursor: "pointer", fontSize: "13.5px", fontWeight: 700,
                transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
