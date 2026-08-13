// ============================================================
// middleware/zta-threat-intel.js
// ZTA LAYER 11 — Threat Intelligence & Live Forensics
// - Static blocklist of known-bad IP ranges + payload signatures
// - AbuseIPDB real-time IP reputation lookup (if API key set)
//   with 24-hour in-memory result cache
// ============================================================

const axios = require("axios");

// Known bad IP prefixes (expand with live feed in production)
const BLOCKED_IP_PREFIXES = [
  "0.",          // invalid
  "169.254.",    // link-local — should never reach your API
];

// Suspicious payload fragments (beyond what governance layer catches)
const THREAT_SIGNATURES = [
  /\.\.[\\/\\]/,             // path traversal
  /%2e%2e[%2f%5c]/i,       // URL-encoded traversal
  /\bwget\s+http/i,        // command injection probe
  /\bcurl\s+http/i,
  /\$\(.*\)/,              // shell injection $()
  /`[^`]*`/,              // backtick injection
  /\bUNION\s+SELECT\b/i,  // SQL injection
  /\bOR\s+1\s*=\s*1\b/i,
  /\bDROP\s+TABLE\b/i,    // SQL DDL injection
  /\bEXEC\s*\(/i,         // SQL exec
  /<script\b/i,            // XSS script tag
  /javascript:/i,           // JS protocol injection
];

// ── AbuseIPDB cache (ip → { score, safe, cachedAt }) ──
const ABUSEIPDB_CACHE     = new Map();
const ABUSEIPDB_TTL_MS    = 24 * 60 * 60 * 1000; // 24 hours
const ABUSEIPDB_THRESHOLD = 50; // block if confidence ≥ 50%

async function checkAbuseIPDB(ip) {
  if (!process.env.ABUSEIPDB_API_KEY) return null; // no key — skip silently

  const cached = ABUSEIPDB_CACHE.get(ip);
  if (cached && Date.now() - cached.cachedAt < ABUSEIPDB_TTL_MS) {
    return cached;
  }

  try {
    const res = await axios.get("https://api.abuseipdb.com/api/v2/check", {
      params: { ipAddress: ip, maxAgeInDays: 90 },
      headers: { Key: process.env.ABUSEIPDB_API_KEY, Accept: "application/json" },
      timeout: 2000,
    });

    const { abuseConfidenceScore, isPublic, usageType } = res.data.data;
    const result = {
      score:    abuseConfidenceScore,
      safe:     abuseConfidenceScore < ABUSEIPDB_THRESHOLD,
      usageType,
      isPublic,
      cachedAt: Date.now(),
    };
    ABUSEIPDB_CACHE.set(ip, result);
    return result;
  } catch (err) {
    // Never let external API failure block legitimate users
    console.warn(`[ZTA-L11] AbuseIPDB lookup failed for ${ip}: ${err.message}`);
    return null;
  }
}

// Cleanup stale cache entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ABUSEIPDB_CACHE) {
    if (now - entry.cachedAt > ABUSEIPDB_TTL_MS) ABUSEIPDB_CACHE.delete(ip);
  }
}, 60 * 60 * 1000);

async function threatIntelMiddleware(req, res, next) {
  if (req.method === "OPTIONS") return next();

  const ip = req.ip || "";

  // Clone the request body and exclude large resume text from threat matching
  const bodyCopy = { ...req.body };
  if (bodyCopy.resumeText) delete bodyCopy.resumeText;
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
      console.error(`[ZTA-L11] THREAT SIGNATURE matched: ${sig} — IP: ${ip} Path: ${req.path}`);
      return res.status(400).json({ error: "ZTA-L11: Request blocked — threat signature detected." });
    }
  }

  // 3 — AbuseIPDB real-time reputation check (async, non-blocking on failure)
  const abuseResult = await checkAbuseIPDB(ip);
  if (abuseResult && !abuseResult.safe) {
    console.error(`[ZTA-L11] AbuseIPDB: IP ${ip} has confidence score ${abuseResult.score}% — BLOCKED`);
    return res.status(403).json({ error: "ZTA-L11: Access denied — IP flagged by threat intelligence." });
  }
  if (abuseResult) {
    console.log(`[ZTA-L11] AbuseIPDB: IP ${ip} score=${abuseResult.score}% (safe)`);
  }

  next();
}

module.exports = { threatIntelMiddleware };
