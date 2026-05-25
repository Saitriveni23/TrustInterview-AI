// ============================================================
// middleware/zta-audit.js
// ZTA LAYER 6 — Visibility & Analytics
// Structured audit log for every request + response.
// Each log line is JSON so it can be piped into SIEM
// tools like Splunk, Datadog, or CloudWatch.
// ============================================================

const fs   = require("fs");
const path = require("path");

// Write audit logs to /logs/audit.log (append)
const LOG_DIR  = path.join(__dirname, "../logs");
const LOG_FILE = path.join(LOG_DIR, "audit.log");

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function writeLog(entry) {
  const line = JSON.stringify(entry) + "\n";
  // Console for dev visibility
  console.log(`[AUDIT] ${entry.method} ${entry.path} → ${entry.statusCode} (${entry.durationMs}ms)`);
  // File for SIEM ingestion
  fs.appendFile(LOG_FILE, line, () => {});
}

function auditMiddleware(req, res, next) {
  const startTime = Date.now();

  // Intercept res.json to capture status code after response
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const durationMs = Date.now() - startTime;

    writeLog({
      timestamp:   new Date().toISOString(),
      method:      req.method,
      path:        req.path,
      statusCode:  res.statusCode,
      durationMs,
      ip:          req.ip,
      userAgent:   (req.headers["user-agent"] || "").substring(0, 100),
      sessionToken: req.ztaSession?.token?.substring(0, 8) + "...",
      deviceFP:    req.ztaDevice?.fingerprint || "unknown",
      // Never log request bodies (may contain resume text / PII)
    });

    return originalJson(body);
  };

  next();
}

module.exports = { auditMiddleware };
