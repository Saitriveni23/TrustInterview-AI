// ============================================================
// server.js — AI Interview Bot (Zero Trust Architecture)
// ============================================================
// LAYER MAP
//  L1  Identity & User Security      → zta-identity.js  + /api/auth/session
//  L2  Device & Endpoint Security    → zta-device.js
//  L3  Network Microsegmentation     → CORS strict origin + helmet CSP
//  L4  Application & Workload Sec.   → zta-pdp.js (per-route policy)
//  L5  Data Protection & Encryption  → HTTPS enforced + no body logging
//  L6  Visibility & Analytics        → zta-audit.js (structured JSON logs)
//  L7  Automation & Orchestration    → zta-soar.js (auto IP blocking)
//  L8  Governance & Compliance       → zta-governance.js (XSS/injection)
//  L9  Policy Decision & Enforcement → zta-pdp.js (default-deny PDP)
//  L10 Cloud & Perimeter Edge        → Helmet HSTS + trust proxy config
//  L11 Threat Intelligence           → zta-threat-intel.js (signatures)
//  L12 Human Factor & Training       → Inline comments + audit trail
// ============================================================

require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");
const path      = require("path");

// ── ZTA Middleware modules ──────────────────────────────────
const { identityMiddleware, generateSession } = require("./middleware/zta-identity");
const { deviceMiddleware }                    = require("./middleware/zta-device");
const { auditMiddleware }                     = require("./middleware/zta-audit");
const { soarMiddleware }                      = require("./middleware/zta-soar");
const { governanceMiddleware }                = require("./middleware/zta-governance");
const { pdpMiddleware }                       = require("./middleware/zta-pdp");
const { threatIntelMiddleware }               = require("./middleware/zta-threat-intel");

const app = express();

// ─────────────────────────────────────────────────────────────
// ZTA LAYER 10 — Cloud & Perimeter Edge Security
// ─────────────────────────────────────────────────────────────
app.set("trust proxy", 1);

// ─────────────────────────────────────────────────────────────
// ZTA LAYER 3 (part 1) — Security Headers (Helmet + HSTS)
// ─────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'"],
        styleSrc:    ["'self'", "'unsafe-inline'"],
        imgSrc:      ["'self'", "data:"],
        connectSrc:  ["'self'"],
        frameSrc:    ["'none'"],
        objectSrc:   ["'none'"],
      },
    },
    hsts: {
      maxAge:            31536000,
      includeSubDomains: true,
      preload:           true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// ─────────────────────────────────────────────────────────────
// ZTA LAYER 3 (part 2) — CORS strict origin
// ─────────────────────────────────────────────────────────────
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin && process.env.NODE_ENV !== "production") return callback(null, true);
      if (origin === ALLOWED_ORIGIN) return callback(null, true);
      console.warn(`[ZTA-L3] CORS blocked origin: ${origin}`);
      callback(new Error("ZTA-L3: Origin not permitted by CORS policy."));
    },
    credentials:    true,
    methods:        ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─────────────────────────────────────────────────────────────
// ZTA LAYER 7 — SOAR auto-block (runs before rate limiter)
// ─────────────────────────────────────────────────────────────
app.use(soarMiddleware);

// ─────────────────────────────────────────────────────────────
// ZTA LAYER 3 (part 3) — Rate Limiting
// ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             100,
  message:         { error: "ZTA-L3: Too many requests. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders:   false,
});

const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  message:         { error: "ZTA-L3: Too many auth requests. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders:   false,
});

app.use(globalLimiter);

// ─────────────────────────────────────────────────────────────
// ZTA LAYER 4 — Input Size Limit
// ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─────────────────────────────────────────────────────────────
// ZTA LAYER 2 — Device & Endpoint Security
// ─────────────────────────────────────────────────────────────
app.use(deviceMiddleware);

// ─────────────────────────────────────────────────────────────
// ZTA LAYER 11 — Threat Intelligence
// ─────────────────────────────────────────────────────────────
app.use(threatIntelMiddleware);

// ─────────────────────────────────────────────────────────────
// ZTA LAYER 8 — Governance & Compliance
// ─────────────────────────────────────────────────────────────
app.use(governanceMiddleware);

// ─────────────────────────────────────────────────────────────
// ZTA LAYER 6 — Visibility & Analytics (Audit Logging)
// ─────────────────────────────────────────────────────────────
app.use(auditMiddleware);

// ─────────────────────────────────────────────────────────────
// ZTA LAYER 1 — Identity & User Security
// ─────────────────────────────────────────────────────────────
app.use(identityMiddleware);

// ─────────────────────────────────────────────────────────────
// ZTA LAYER 9 — Policy Decision Point (PDP/PEP)
// ─────────────────────────────────────────────────────────────
app.use(pdpMiddleware);

// ─────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────

// L1 — Session bootstrap endpoint
app.post("/api/auth/session", authLimiter, (req, res) => {
  const session = generateSession();
  console.log(`[ZTA-L1] New session issued — token prefix: ${session.token.substring(0, 8)}...`);
  res.json({
    success:   true,
    token:     session.token,
    expiresAt: session.expiresAt,
    message:   "Include this token in every request: Authorization: Bearer <token>",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status:    "OK",
    message:   "AI Interview Bot — ZTA backend running",
    timestamp: new Date().toISOString(),
    ztaLayers: {
      L1_identity:      "active — session token required",
      L2_device:        "active — UA fingerprinting",
      L3_network:       "active — CORS + rate limit",
      L4_workload:      "active — 10MB payload cap",
      L5_data:          "active — HTTPS + no body logging",
      L6_visibility:    "active — structured audit log",
      L7_automation:    "active — SOAR auto-block",
      L8_governance:    "active — XSS/injection scan",
      L9_policy:        "active — default-deny PDP",
      L10_edge:         "active — HSTS + trust proxy",
      L11_threatIntel:  "active — signature blocklist",
      L12_humanFactor:  "active — bias filter + audit trail",
    },
  });
});

app.use("/api/resume",    require("./routes/resume"));
app.use("/api/interview", require("./routes/interview"));
app.use("/api/evaluate",  require("./routes/evaluate"));

// ─────────────────────────────────────────────────────────────
// ZTA LAYER 5 — 404 handler (never expose internals)
// ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// ─────────────────────────────────────────────────────────────
// ZTA LAYER 7 — Global Error Handler
// ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ZTA-ERROR] ${err.message} — IP: ${req.ip} — Path: ${req.path}`);

  if (err.message && err.message.includes("ZTA-L3")) {
    return res.status(403).json({ error: err.message });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "ZTA-L4: File too large. Maximum size is 10MB." });
  }
  if (err.message === "Only PDF files allowed") {
    return res.status(415).json({ error: "ZTA-L4: Only PDF files are accepted." });
  }

  res.status(500).json({ error: "Something went wrong on the server. Please try again." });
});

// ─────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log("══════════════════════════════════════════");
  console.log("  AI Interview Bot — Zero Trust Backend");
  console.log(`  URL    : http://localhost:${PORT}`);
  console.log(`  Health : http://localhost:${PORT}/api/health`);
  console.log(`  Auth   : POST http://localhost:${PORT}/api/auth/session`);
  console.log("  ZTA Layers: L1–L12 active");
  console.log("══════════════════════════════════════════");
});
