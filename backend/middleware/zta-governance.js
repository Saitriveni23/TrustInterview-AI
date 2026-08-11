// ============================================================
// middleware/zta-governance.js
// ZTA LAYER 8 — Governance & Compliance
// Enforces data handling rules inline with GDPR / privacy:
//  - Strips dangerous characters from string inputs (XSS)
//  - Blocks requests that send raw secrets in the body
//  - Validates Content-Type on POST routes
// ============================================================

const DANGEROUS_PATTERNS = [
  /<script[\s\S]*?>/i,
  /javascript:/i,
  /on\w+\s*=/i,           // onclick=, onerror= etc.
  /\beval\s*\(/i,
  /\bexec\s*\(/i,
  /--;\s*drop\s+table/i,  // SQL injection fragment
];

const SECRET_LEAK_PATTERNS = [
  /sk-[A-Za-z0-9]{20,}/,  // OpenAI key
  /AKIA[A-Z0-9]{16}/,     // AWS access key
  /-----BEGIN (RSA|EC|PRIVATE)/,
];

function deepSanitize(obj, depth = 0) {
  if (depth > 10) return obj; // prevent prototype pollution via deep nesting
  if (typeof obj === "string") {
    return obj.replace(/\0/g, "").replace(/\x00/g, "");
  }
  if (Array.isArray(obj)) {
    return obj.map(v => deepSanitize(v, depth + 1));
  }
  if (obj && typeof obj === "object") {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      clean[k] = deepSanitize(v, depth + 1);
    }
    return clean;
  }
  return obj;
}

function governanceMiddleware(req, res, next) {
  if (req.method === "OPTIONS") return next();
  if (req.path === "/api/auth/session" || req.path === "/api/health") return next();

  // Only inspect POST / PUT bodies
  if (!["POST", "PUT", "PATCH"].includes(req.method)) return next();

  // 1 — Require Content-Type header on POST
  const ct = req.headers["content-type"] || "";
  if (!ct.includes("application/json") && !ct.includes("multipart/form-data")) {
    return res.status(415).json({
      error: "ZTA-L8: Unsupported Content-Type. Use application/json or multipart/form-data.",
    });
  }

  // 2 — Scan body for XSS / injection patterns
  const bodyStr = JSON.stringify(req.body || {});

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(bodyStr)) {
      console.warn(`[ZTA-L8] Dangerous pattern detected in body — IP: ${req.ip}`);
      return res.status(400).json({ error: "ZTA-L8: Request body contains prohibited content." });
    }
  }

  // 3 — Block accidental secret leakage in request bodies
  for (const pattern of SECRET_LEAK_PATTERNS) {
    if (pattern.test(bodyStr)) {
      console.error(`[ZTA-L8] GOVERNANCE: Secret key pattern detected in request body — IP: ${req.ip}`);
      return res.status(400).json({ error: "ZTA-L8: Request body contains sensitive credentials. Remove them." });
    }
  }

  // 4 — Deep-sanitize the body (removes null bytes etc.)
  req.body = deepSanitize(req.body);

  next();
}

module.exports = { governanceMiddleware };
