// ============================================================
// middleware/zta-identity.js
// ZTA LAYER 1 — Identity & User Security
// Validates API session tokens + request integrity.
// Every request must carry a valid session token.
// In production, swap the in-memory store for Redis/JWT.
// ============================================================

const crypto = require("crypto");

// In-memory session store (replace with Redis in production)
const activeSessions = new Map();

// Paths that don't need a session token yet (bootstrap flow)
const PUBLIC_PATHS = [
  "/api/health", 
  "/api/auth/session", 
  "/api/zta-status",
  "/api/auth/google",
  "/api/auth/google/callback"
];

/**
 * generateSession()
 * Call POST /api/auth/session to receive a token.
 * The frontend must attach it as: Authorization: Bearer <token>
 */
function generateSession() {
  const token     = crypto.randomBytes(32).toString("hex");
  const createdAt = Date.now();
  const expiresAt = createdAt + 60 * 60 * 1000; // 1 hour
  activeSessions.set(token, { createdAt, expiresAt, requests: 0 });
  return { token, expiresAt };
}

/**
 * identityMiddleware
 * Enforces: every non-public route must present a valid Bearer token.
 */
function identityMiddleware(req, res, next) {
  console.log("[DEBUG ZTA-L1] checking path:", req.path, "PUBLIC_PATHS contains:", PUBLIC_PATHS.includes(req.path));
  if (PUBLIC_PATHS.includes(req.path)) return next();

  const authHeader = req.headers["authorization"] || "";
  console.log("[DEBUG ZTA-L1] AuthHeader:", authHeader, "ActiveSessions:", Array.from(activeSessions.keys()));
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "ZTA-L1: No session token. Call POST /api/auth/session first.",
    });
  }

  const token   = authHeader.slice(7);
  const session = activeSessions.get(token);

  if (!session) {
    return res.status(401).json({ error: "ZTA-L1: Invalid or expired session token." });
  }

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return res.status(401).json({ error: "ZTA-L1: Session expired. Please re-authenticate." });
  }

  // Attach session info for downstream middleware
  session.requests++;
  req.ztaSession = { token, ...session };
  next();
}

// Cleanup expired sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, s] of activeSessions) {
    if (now > s.expiresAt) activeSessions.delete(token);
  }
}, 10 * 60 * 1000);

module.exports = { identityMiddleware, generateSession };
