// ============================================================
// middleware/zta-soar.js
// ZTA LAYER 7 — Automation & Orchestration (SOAR)
// Tracks anomalous behaviour per IP in real time.
// Auto-blocks IPs that trigger too many errors or
// too many 4xx responses (signs of probing / attack).
// Persists blocks to disk so they survive server restarts.
// ============================================================

const fs   = require("fs");
const path = require("path");

const BLOCK_THRESHOLD_ERRORS = 20;
const BLOCK_THRESHOLD_4XX    = 40;
const WINDOW_MS              = 10 * 60 * 1000; // 10-minute rolling window
const BLOCK_DURATION_MS      = 30 * 60 * 1000; // block for 30 minutes

// ip → { errors, bad4xx, windowStart, blockedUntil }
const ipThreatMap = new Map();

// ── Persistence with SQLite ──────────────────────────────────
const sqlite = require("../db/sqlite");

/** Load persisted blocks from disk on startup */
function loadPersistedBlocks() {
  try {
    const now = Date.now();
    const blocks = sqlite.getAllBlockedIPs();
    let loaded = 0;
    for (const { ip, reason, blocked_until } of (blocks || [])) {
      if (blocked_until > now) {
        explicitlyBlockedIPs.add(ip);
        ipBlockedReasons.set(ip, reason);
        ipThreatMap.set(ip, { errors: 0, bad4xx: 0, windowStart: now, blockedUntil: blocked_until });
        loaded++;
      }
    }
    if (loaded > 0) console.log(`[ZTA-L7] SOAR: Loaded ${loaded} persisted IP block(s) from SQLite database.`);
  } catch (e) {
    console.warn("[ZTA-L7] SOAR: Failed to load persisted blocks from SQLite:", e.message);
  }
}

const explicitlyBlockedIPs = new Set();
const ipBlockedReasons     = new Map();

// ── Load on boot ─────────────────────────────────────────────
loadPersistedBlocks();

function getThreatRecord(ip) {
  const now = Date.now();
  let record = ipThreatMap.get(ip);
  if (!record || now - record.windowStart > WINDOW_MS) {
    record = { errors: 0, bad4xx: 0, windowStart: now, blockedUntil: 0 };
    ipThreatMap.set(ip, record);
  }
  return record;
}

function soarMiddleware(req, res, next) {
  const ip = req.ip;
  if (ip === "::1" || ip === "127.0.0.1" || ip.endsWith("127.0.0.1")) {
    return next();
  }

  // Check explicit blocks (loaded from SQLite)
  if (explicitlyBlockedIPs.has(ip)) {
    console.warn(`[ZTA-L7] SOAR: Explicitly blocked IP ${ip} — ${ipBlockedReasons.get(ip)}`);
    return res.status(403).json({ error: "ZTA-L7: Access denied — IP is blocked." });
  }

  const record = getThreatRecord(ip);

  // 1 — Check if IP is currently auto-blocked
  if (record.blockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((record.blockedUntil - Date.now()) / 60000);
    console.warn(`[ZTA-L7] SOAR: Auto-blocked IP ${ip} — ${minutesLeft}m remaining`);
    return res.status(429).json({
      error: `ZTA-L7: IP temporarily blocked due to suspicious activity. Try again in ${minutesLeft} minutes.`,
    });
  }

  // 2 — Intercept response to count bad status codes
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const status = res.statusCode;
    if (status >= 500) {
      record.errors++;
      if (record.errors >= BLOCK_THRESHOLD_ERRORS) {
        record.blockedUntil = Date.now() + BLOCK_DURATION_MS;
        sqlite.saveBlockedIP(ip, "AUTO_BLOCKED_ERRORS", record.blockedUntil);
        console.error(`[ZTA-L7] SOAR: Auto-blocked ${ip} — exceeded server error threshold`);
      }
    } else if (status >= 400 && status < 500) {
      record.bad4xx++;
      if (record.bad4xx >= BLOCK_THRESHOLD_4XX) {
        record.blockedUntil = Date.now() + BLOCK_DURATION_MS;
        sqlite.saveBlockedIP(ip, "AUTO_BLOCKED_4XX", record.blockedUntil);
        console.warn(`[ZTA-L7] SOAR: Auto-blocked ${ip} — exceeded 4xx probing threshold`);
      }
    }
    return originalJson(body);
  };

  next();
}

function blockIP(ip, reason) {
  explicitlyBlockedIPs.add(ip);
  ipBlockedReasons.set(ip, reason);
  const record = getThreatRecord(ip);
  record.blockedUntil = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  sqlite.saveBlockedIP(ip, reason, record.blockedUntil);
}

function unblockIP(ip) {
  explicitlyBlockedIPs.delete(ip);
  ipBlockedReasons.delete(ip);
  const record = ipThreatMap.get(ip);
  if (record) {
    record.blockedUntil = 0;
    record.bad4xx = 0;
    record.errors = 0;
  }
  sqlite.removeBlockedIP(ip);
}

function getThreatLevel(ip) {
  if (explicitlyBlockedIPs.has(ip)) {
    return { level: "critical", details: [ipBlockedReasons.get(ip) || "FRAUD_DETECTED"] };
  }
  if (ip === "::1" || ip === "127.0.0.1" || ip.endsWith("127.0.0.1")) {
    return { level: "low", details: [] };
  }
  const record = ipThreatMap.get(ip);
  if (!record) return { level: "low", details: [] };
  const details = [];
  if (record.blockedUntil > Date.now()) details.push("AUTO_BLOCKED");
  if (record.bad4xx > 0) details.push(`SUSPICIOUS_REQUESTS (${record.bad4xx})`);
  if (record.errors > 0) details.push(`SERVER_ERRORS (${record.errors})`);

  let level = "low";
  if (record.blockedUntil > Date.now()) level = "critical";
  else if (record.bad4xx >= 3) level = "high";
  else if (record.bad4xx > 0) level = "medium";

  return { level, details, bad4xx: record.bad4xx, blockedUntil: record.blockedUntil };
}

// Cleanup old records every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, r] of ipThreatMap) {
    if (now - r.windowStart > WINDOW_MS && r.blockedUntil < now) {
      if (!explicitlyBlockedIPs.has(ip)) {
        ipThreatMap.delete(ip);
      }
    }
  }
}, 15 * 60 * 1000);

module.exports = { soarMiddleware, getThreatLevel, blockIP, unblockIP };
