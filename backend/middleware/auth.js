const { getFirebaseAuth } = require("../config/firebase");
const db = require("../config/database");

const CANDIDATE_DOMAIN = (process.env.CANDIDATE_EMAIL_DOMAIN || "rvce.edu.in").toLowerCase();

function isExactDomain(email, domain = CANDIDATE_DOMAIN) {
  if (typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  const parts = normalized.split("@");
  return parts.length === 2 && parts[0].length > 0 && parts[1] === domain;
}

async function requireAuth(req, res, next) {
  try {
    const header = req.get("authorization") || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ error: { code: "AUTH_REQUIRED", message: "Authentication is required.", requestId: req.id } });
    }
    const claims = await getFirebaseAuth().verifyIdToken(header.slice(7), true);
    const role = claims.role === "recruiter" ? "recruiter" : "candidate";
    if (role === "candidate" && (!claims.email_verified || !isExactDomain(claims.email))) {
      return res.status(403).json({ error: { code: "RVCE_ACCOUNT_REQUIRED", message: "Use a verified @rvce.edu.in Google Workspace account.", requestId: req.id } });
    }

    req.auth = {
      uid: claims.uid,
      email: String(claims.email || "").toLowerCase(),
      name: claims.name || claims.email?.split("@")[0] || "User",
      role,
      companyId: claims.company_id || null,
      claims,
    };

    await db.query(
      `INSERT INTO users (firebase_uid, email, display_name, role, company_id, last_login_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (firebase_uid) DO UPDATE SET
         email = EXCLUDED.email,
         display_name = EXCLUDED.display_name,
         role = EXCLUDED.role,
         company_id = EXCLUDED.company_id,
         last_login_at = NOW()`,
      [req.auth.uid, req.auth.email, req.auth.name, role, req.auth.companyId]
    );
    next();
  } catch (error) {
    const code = error.code === "auth/id-token-revoked" ? "TOKEN_REVOKED" : "INVALID_TOKEN";
    return res.status(401).json({ error: { code, message: "Your session is invalid or expired.", requestId: req.id } });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.auth?.role !== role) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: `${role} access is required.`, requestId: req.id } });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, isExactDomain };
