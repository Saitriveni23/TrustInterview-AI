// ============================================================
// middleware/zta-identity.js
// ZTA LAYER 1 — Identity & User Security
// Validates API session tokens + request integrity.
// Every request must carry a valid session token.
// In production, swap the in-memory store for Redis/JWT.
// ============================================================

const crypto = require("crypto");

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-trust-interview-zta";

// Revocation Set for JTIs
const revokedJtis = new Set();
const activeSessions = new Map();

// JWT helper functions using native crypto
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return Buffer.from(base64, "base64").toString("utf8");
}

function signToken(payload) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadStr = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payloadStr}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${header}.${payloadStr}.${signature}`;
}

function verifyToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  if (signature !== expectedSig) return null;
  try {
    return JSON.parse(base64UrlDecode(payload));
  } catch {
    return null;
  }
}

// Paths that don't need a session token yet (bootstrap flow)
const PUBLIC_PATHS = [
  "/api/health", 
  "/api/auth/session", 
  "/api/zta-status",
  "/api/auth/google",
  "/api/auth/google/callback",
  "/api/interview/leaderboard",
  "/api/auth/register-sync",
  "/api/auth/registered-users",
  "/api/interview/company-settings",
  "/api/interview/tickets",
  "/api/interview/tickets/resolve"
];

/**
 * generateSession()
 * Generates a signed JWT session with a unique JTI claim.
 */
function generateSession() {
  const jti = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
  const createdAt = Date.now();
  const expiresAt = createdAt + 60 * 60 * 1000; // 1 hour
  
  const payload = {
    jti,
    iat: Math.floor(createdAt / 1000),
    exp: Math.floor(expiresAt / 1000)
  };

  const token = signToken(payload);
  activeSessions.set(jti, { createdAt, expiresAt, requests: 0 });
  return { token, expiresAt };
}

/**
 * identityMiddleware
 * Enforces JWT verification, expiration, and JTI revocation.
 */
function identityMiddleware(req, res, next) {
  if (req.method === "OPTIONS") return next();
  if (PUBLIC_PATHS.includes(req.path)) return next();

  const authHeader = req.headers["authorization"] || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "ZTA-L1: No session token. Call POST /api/auth/session first.",
    });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload || !payload.jti) {
    return res.status(401).json({ error: "ZTA-L1: Invalid token signature or format." });
  }

  if (revokedJtis.has(payload.jti)) {
    return res.status(401).json({ error: "ZTA-L1: Session has been revoked/replay detected." });
  }

  if (Date.now() > payload.exp * 1000) {
    revokedJtis.add(payload.jti);
    activeSessions.delete(payload.jti);
    return res.status(401).json({ error: "ZTA-L1: Session expired. Please re-authenticate." });
  }

  const session = activeSessions.get(payload.jti);
  if (!session) {
    return res.status(401).json({ error: "ZTA-L1: Session session data not found." });
  }

  // Attach session info for downstream middleware
  session.requests++;
  req.ztaSession = { token, jti: payload.jti, ...session };
  next();
}

// Cleanup expired sessions and revoke old JTIs every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [jti, s] of activeSessions) {
    if (now > s.expiresAt) {
      revokedJtis.delete(jti); // clean up memory from blacklist
      activeSessions.delete(jti);
    }
  }
}, 10 * 60 * 1000);

module.exports = { identityMiddleware, generateSession, revokedJtis };
