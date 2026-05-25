// ============================================================
// middleware/zta-device.js
// ZTA LAYER 2 — Device & Endpoint Security
// Builds a fingerprint of each requesting client.
// Flags suspicious user-agent patterns (bots, scanners).
// Logs device posture on every request.
// ============================================================

const BLOCKED_UA_PATTERNS = [
  /sqlmap/i, /nikto/i, /nmap/i, /masscan/i,
  /zgrab/i,  /dirbuster/i, /hydra/i, /metasploit/i,
  /curl\/7\.[0-4]/i,   // very old curl versions used by scanners
];

const REQUIRED_HEADERS = ["user-agent", "accept"];

function deviceMiddleware(req, res, next) {
  const ua = req.headers["user-agent"] || "";

  // 1 — Block known scanner / attack tool user-agents
  for (const pattern of BLOCKED_UA_PATTERNS) {
    if (pattern.test(ua)) {
      console.warn(`[ZTA-L2] BLOCKED scanner UA: ${ua} — IP: ${req.ip}`);
      return res.status(403).json({ error: "ZTA-L2: Request blocked — suspicious client." });
    }
  }

  // 2 — Require minimum expected headers (browsers always send these)
  for (const h of REQUIRED_HEADERS) {
    if (!req.headers[h]) {
      console.warn(`[ZTA-L2] Missing header "${h}" — IP: ${req.ip}`);
      return res.status(400).json({ error: `ZTA-L2: Missing required header: ${h}` });
    }
  }

  // 3 — Build device fingerprint and attach to request for audit log
  req.ztaDevice = {
    ua:           ua.substring(0, 200),
    ip:           req.ip,
    acceptLang:   req.headers["accept-language"] || "unknown",
    contentType:  req.headers["content-type"]    || "none",
    fingerprint:  Buffer.from(`${req.ip}|${ua}`).toString("base64").substring(0, 32),
  };

  next();
}

module.exports = { deviceMiddleware };
