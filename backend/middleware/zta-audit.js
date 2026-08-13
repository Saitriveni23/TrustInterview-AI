// ============================================================
// middleware/zta-audit.js
// ZTA LAYER 6 — Visibility & Analytics
// Structured audit log for every request + response.
// Features:
//   - Daily rotating log files (audit-YYYY-MM-DD.log)
//   - Keeps last 7 days of logs automatically
//   - Per-user request counters tracked in memory
//   - JSON format for SIEM ingestion (Splunk, Datadog, CloudWatch)
// ============================================================

const fs   = require("fs");
const path = require("path");

const LOG_DIR     = path.join(__dirname, "../logs");
const MAX_LOG_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// ── Per-user request counters (email → { count, firstSeen }) ──
const userCounters = new Map();

function getTodayLogFile() {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(LOG_DIR, `audit-${date}.log`);
}

function pruneOldLogs() {
  try {
    const files = fs.readdirSync(LOG_DIR);
    const now   = Date.now();
    for (const file of files) {
      if (!file.startsWith("audit-") || !file.endsWith(".log")) continue;
      const fullPath = path.join(LOG_DIR, file);
      const stat     = fs.statSync(fullPath);
      if (now - stat.mtimeMs > MAX_LOG_AGE) {
        fs.unlinkSync(fullPath);
        console.log(`[AUDIT] Pruned old log: ${file}`);
      }
    }
  } catch (e) {
    console.warn("[AUDIT] Log pruning failed:", e.message);
  }
}

// Prune logs on startup and once per day
pruneOldLogs();
setInterval(pruneOldLogs, 24 * 60 * 60 * 1000);

function writeLog(entry) {
  const line     = JSON.stringify(entry) + "\n";
  const logFile  = getTodayLogFile();
  // Console for dev visibility
  console.log(`[AUDIT] ${entry.method} ${entry.path} → ${entry.statusCode} (${entry.durationMs}ms) [user: ${entry.userEmail || "anon"}]`);
  // Daily rotating file for SIEM ingestion
  fs.appendFile(logFile, line, () => {});
}

function auditMiddleware(req, res, next) {
  if (req.method === "OPTIONS") return next();
  const startTime  = Date.now();
  const userEmail  = req.body?.candidateEmail || req.query?.email || null;

  // Track per-user request counts
  if (userEmail) {
    const counter = userCounters.get(userEmail) || { count: 0, firstSeen: new Date().toISOString() };
    counter.count++;
    userCounters.set(userEmail, counter);
  }

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const durationMs = Date.now() - startTime;
    writeLog({
      timestamp:    new Date().toISOString(),
      method:       req.method,
      path:         req.path,
      statusCode:   res.statusCode,
      durationMs,
      ip:           req.ip,
      userAgent:    (req.headers["user-agent"] || "").substring(0, 100),
      sessionToken: req.ztaSession?.token?.substring(0, 8) + "...",
      deviceFP:     req.ztaDevice?.fingerprint || "unknown",
      userEmail:    userEmail || null,
      userRequests: userEmail ? (userCounters.get(userEmail)?.count || 1) : null,
      // Never log request bodies (may contain resume text / PII)
    });
    return originalJson(body);
  };

  next();
}

module.exports = { auditMiddleware };
