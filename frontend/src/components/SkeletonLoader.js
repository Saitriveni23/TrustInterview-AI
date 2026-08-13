import React from "react";

/**
 * SkeletonLoader — animated shimmer placeholder cards
 * Props:
 *   - rows:   number of skeleton rows to show (default 3)
 *   - height: height of each skeleton bar in px (default 18)
 *   - style:  additional container style overrides
 */
export function SkeletonBar({ width = "100%", height = 18, style = {} }) {
  return (
    <div style={{
      width,
      height: `${height}px`,
      background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
      backgroundSize: "200% 100%",
      animation: "skeleton-shimmer 1.6s infinite linear",
      borderRadius: "6px",
      ...style,
    }} />
  );
}

export function SkeletonCard({ rows = 3, style = {} }) {
  return (
    <div style={{
      background: "rgba(10,10,22,0.6)",
      border: "1px solid rgba(139,92,246,0.1)",
      borderRadius: "16px",
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      ...style,
    }}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBar
          key={i}
          width={i === 0 ? "60%" : i === rows - 1 ? "40%" : "100%"}
          height={i === 0 ? 22 : 16}
        />
      ))}
    </div>
  );
}

/**
 * Full-page loading skeleton for the Interview page
 */
export function InterviewSkeleton() {
  return (
    <div style={{
      minHeight: "100vh", background: "#06060f", padding: "0",
      fontFamily: "var(--font-body, 'Inter', sans-serif)",
    }}>
      {/* Header skeleton */}
      <div style={{
        height: "64px", background: "rgba(6,6,15,0.85)",
        borderBottom: "1px solid rgba(139,92,246,0.12)",
        display: "flex", alignItems: "center", padding: "0 40px", gap: "16px",
      }}>
        <SkeletonBar width="120px" height={14} />
        <div style={{ flex: 1 }} />
        <SkeletonBar width="80px" height={14} />
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* ZTA ticker skeleton */}
        <SkeletonBar width="100%" height={40} style={{ borderRadius: "10px" }} />
        {/* Question card skeleton */}
        <SkeletonCard rows={4} style={{ padding: "32px" }} />
        {/* Answer area skeleton */}
        <SkeletonBar width="100%" height={120} style={{ borderRadius: "12px" }} />
        {/* Button skeleton */}
        <div style={{ display: "flex", gap: "12px" }}>
          <SkeletonBar width="160px" height={44} style={{ borderRadius: "10px" }} />
          <SkeletonBar width="120px" height={44} style={{ borderRadius: "10px" }} />
        </div>
      </div>
    </div>
  );
}

export default SkeletonCard;
