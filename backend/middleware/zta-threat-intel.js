// ============================================================
// middleware/zta-threat-intel.js
// ZTA LAYER 11 — Threat Intelligence & Live Forensics
// Maintains a local blocklist of known-bad IP ranges and
// payload signatures. In production, replace/extend with
// a live feed (e.g. AbuseIPDB, Cloudflare Radar API).
// ============================================================

// Known bad IP prefixes (expand with live feed in production)
const BLOCKED_IP_PREFIXES = [
  "0.",          // invalid
  "169.254.",    // link-local — should never reach your API
];

// Suspicious payload fragments (beyond what governance layer catches)
const THREAT_SIGNATURES = [
  /\.\.[\/\\]/,             // path traversal
  /%2e%2e[%2f%5c]/i,       // URL-encoded traversal
  /\bwget\s+http/i,        // command injection probe
  /\bcurl\s+http/i,
  /\$\(.*\)/,              // shell injection $()
  /`[^`]*`/,              // backtick injection
  /\bUNION\s+SELECT\b/i,  // SQL injection
  /\bOR\s+1\s*=\s*1\b/i,
];

function threatIntelMiddleware(req, res, next) {
  const ip      = req.ip || "";
  // Clone the request body and exclude the large resume text from threat matching
  const bodyCopy = { ...req.body };
  if (bodyCopy.resumeText) {
    delete bodyCopy.resumeText;
  }
  const rawBody = JSON.stringify(bodyCopy) + (req.query ? JSON.stringify(req.query) : "");

  // 1 — Block known-bad IP ranges
  for (const prefix of BLOCKED_IP_PREFIXES) {
    if (ip.startsWith(prefix)) {
      console.error(`[ZTA-L11] THREAT: Blocked IP range ${ip}`);
      return res.status(403).json({ error: "ZTA-L11: Access denied." });
    }
  }

  // 2 — Scan for threat signatures in full request
  for (const sig of THREAT_SIGNATURES) {
    if (sig.test(rawBody) || sig.test(req.path)) {
      console.error(`[ZTA-L11] THREAT SIGNATURE matched — IP: ${ip} Path: ${req.path}`);
      return res.status(400).json({ error: "ZTA-L11: Request blocked — threat signature detected." });
    }
  }

  next();
}

module.exports = { threatIntelMiddleware };
