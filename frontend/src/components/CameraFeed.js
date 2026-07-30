import React, { useRef, useEffect, useState } from "react";

export default function CameraFeed({ candidateName, recording }) {
  const videoRef = useRef(null);
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState("");

  useEffect(() => {
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) { 
          videoRef.current.srcObject = stream; 
          setCamOn(true); 
        }
      } catch { 
        setCamErr("Camera access denied. Please allow camera in browser settings."); 
      }
    }
    start();
    return () => { 
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <div className="glass-card" style={s.card}>
      <div style={s.header}>
        <span style={s.title}>📷 LIVE CAMERA STREAM</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ 
            width: 8, 
            height: 8, 
            borderRadius: "50%", 
            background: camOn ? "var(--color-success)" : "var(--color-error)",
            boxShadow: camOn ? "var(--shadow-success-glow)" : "var(--shadow-error-glow)"
          }}/>
          <span style={s.statusText}>{camOn ? "ONLINE" : "OFFLINE"}</span>
        </div>
      </div>
      
      <div style={s.videoContainer}>
        {camErr ? (
          <div style={s.errorContainer}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📹</div>
            <div style={{ fontSize: 13, color: "var(--color-error)", fontWeight: 500, lineHeight: 1.6 }}>
              {camErr}
            </div>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              style={s.video}
            />
            {recording && (
              <div style={s.recBadge} className="pulse-indicator">
                ● REC
              </div>
            )}
            <div style={s.nameBadge}>
              👤 {candidateName}
            </div>
          </>
        )}
      </div>
      
      <div style={s.footer}>
        <span>💡 Look directly at the camera</span>
        <span>🎙️ Ensure a quiet environment</span>
      </div>
    </div>
  );
}

const s = {
  card: {
    overflow: "hidden",
    background: "rgba(17, 24, 39, 0.45)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "rgba(255, 255, 255, 0.02)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
  },
  title: {
    fontSize: 11,
    fontWeight: 700,
    color: "#9ca3af",
    letterSpacing: "0.05em",
    fontFamily: "var(--font-headings)",
  },
  statusText: {
    fontSize: 10,
    fontWeight: 700,
    color: "#e5e7eb",
    fontFamily: "var(--font-headings)",
  },
  videoContainer: {
    position: "relative",
    background: "rgba(3, 7, 18, 0.6)",
    aspectRatio: "16/9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)",
    display: "block",
  },
  errorContainer: {
    textAlign: "center",
    padding: 32,
    maxWidth: 320,
  },
  recBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    background: "rgba(244, 63, 94, 0.85)",
    border: "1px solid rgba(244, 63, 94, 0.4)",
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 6,
    letterSpacing: "0.02em",
  },
  nameBadge: {
    position: "absolute",
    bottom: 14,
    left: 14,
    background: "rgba(3, 7, 18, 0.75)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    backdropFilter: "blur(4px)",
    color: "#f3f4f6",
    fontSize: 12,
    fontWeight: 500,
    padding: "4px 12px",
    borderRadius: 8,
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 16px",
    background: "rgba(255, 255, 255, 0.01)",
    borderTop: "1px solid rgba(255, 255, 255, 0.04)",
    fontSize: 11,
    color: "#6b7280",
    fontWeight: 500,
  },
};
