// ============================================================
// middleware/zta-pdp.js
// ZTA LAYER 9 — Policy Decision & Enforcement (PDP/PEP)
// Central policy engine: maps every route to a policy rule.
// Evaluates context (path, method, session age) before
// permitting access. This is the brain of Zero Trust.
// ============================================================

// Policy table: route prefix → rules
const ROUTE_POLICIES = {
  "/api/auth":             { requireSession: false, allowedMethods: ["POST", "GET"] },
  "/api/health":           { requireSession: false, allowedMethods: ["GET"] },
  "/api/zta-status/block": { requireSession: false, allowedMethods: ["POST"] },
  "/api/zta-status/reset": { requireSession: false, allowedMethods: ["POST"] },
  "/api/zta-status":       { requireSession: false, allowedMethods: ["GET"] },
  "/api/resume":           { requireSession: true,  allowedMethods: ["POST"], maxSessionAgeMs: 60 * 60 * 1000 },
  "/api/interview/leaderboard": { requireSession: false, allowedMethods: ["GET"] },
  "/api/interview":        { requireSession: true,  allowedMethods: ["POST"], maxSessionAgeMs: 60 * 60 * 1000 },
  "/api/evaluate":         { requireSession: true,  allowedMethods: ["POST"], maxSessionAgeMs: 60 * 60 * 1000 },
};

function matchPolicy(path) {
  for (const [prefix, policy] of Object.entries(ROUTE_POLICIES)) {
    if (path.startsWith(prefix)) return policy;
  }
  return null;
}

function pdpMiddleware(req, res, next) {
  if (req.method === "OPTIONS") return next();
  const policy = matchPolicy(req.path);

  // 1 — No policy = no access (default-deny)
  if (!policy) {
    console.warn(`[ZTA-L9] PDP: No policy for ${req.path} — default deny`);
    return res.status(403).json({ error: "ZTA-L9: Access denied — no policy defined for this route." });
  }

  // 2 — Enforce allowed HTTP methods per route
  if (!policy.allowedMethods.includes(req.method)) {
    return res.status(405).json({
      error: `ZTA-L9: Method ${req.method} not permitted on this route.`,
    });
  }

  // 3 — Enforce session requirement
  if (policy.requireSession && !req.ztaSession) {
    return res.status(401).json({ error: "ZTA-L9: Valid session required for this resource." });
  }

  // 4 — Enforce max session age (session freshness check)
  if (policy.requireSession && req.ztaSession && policy.maxSessionAgeMs) {
    const sessionAge = Date.now() - req.ztaSession.createdAt;
    if (sessionAge > policy.maxSessionAgeMs) {
      return res.status(401).json({ error: "ZTA-L9: Session too old. Re-authenticate." });
    }
  }

  // Decision: PERMIT
  req.ztaPolicy = policy;
  next();
}

module.exports = { pdpMiddleware };
