require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");

const { identityMiddleware, generateSession } = require("./middleware/zta-identity");
const { deviceMiddleware }                    = require("./middleware/zta-device");
const { auditMiddleware }                     = require("./middleware/zta-audit");
const { soarMiddleware, getThreatLevel }      = require("./middleware/zta-soar");
const { governanceMiddleware }                = require("./middleware/zta-governance");
const { pdpMiddleware }                       = require("./middleware/zta-pdp");
const { threatIntelMiddleware }               = require("./middleware/zta-threat-intel");

const app    = express();
const ZTA_ON = process.env.ZTA_ENABLED !== "false";

console.log("══════════════════════════════════════════ - server.js:18");
if (ZTA_ON) {
  console.log("🛡️  ZTA ACTIVE  All 13 Layers Enforced - server.js:20");
} else {
  console.log("⚠️  ZTA DISABLED  DEMO VULNERABLE MODE - server.js:22");
  console.log("NO auth · NO rate limit · NO audit log - server.js:23");
  console.log("NO device check · NO threat detection · NO hallucination filter - server.js:24");
}
console.log("══════════════════════════════════════════ - server.js:26");

app.set("trust proxy", 1);

if (ZTA_ON) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"], scriptSrc: ["'self'"],
        styleSrc:   ["'self'", "'unsafe-inline'"],
        imgSrc:     ["'self'", "data:"],
        connectSrc: ["'self'"], frameSrc: ["'none'"], objectSrc: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  }));
}

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "http://localhost:3000";
if (ZTA_ON) {
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin && process.env.NODE_ENV !== "production") return callback(null, true);
      if (origin === ALLOWED_ORIGIN) return callback(null, true);
      console.warn(`[ZTAL3] CORS blocked origin: ${origin} - server.js:50`);
      callback(new Error("ZTA-L3: Origin not permitted by CORS policy."));
    },
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "x-zta-token", "x-zta-role", "x-zta-fingerprint", "x-zta-issued-at"],
  }));
} else {
  app.use(cors({ origin: "*" }));
  console.warn("[DEMO] CORS open to ALL origins  any website can call this API - server.js:59");
}

if (ZTA_ON) {
  app.use(soarMiddleware);
}

if (ZTA_ON) {
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000, max: 100,
    message: { error: "ZTA-L3: Too many requests." },
    standardHeaders: true, legacyHeaders: false,
  }));
} else {
  console.warn("[DEMO] Rate limiting OFF  API can be flooded - server.js:73");
}

const authLimiter = ZTA_ON
  ? rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: "ZTA-L3: Too many auth requests." }, standardHeaders: true, legacyHeaders: false })
  : (req, res, next) => next();

if (ZTA_ON) {
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
} else {
  app.use(express.json({ limit: "999mb" }));
  app.use(express.urlencoded({ extended: true }));
  console.warn("[DEMO] Payload size limit OFF  memory exhaustion possible - server.js:86");
}

if (ZTA_ON) {
  app.use(deviceMiddleware);
} else {
  console.warn("[DEMO] Device fingerprinting OFF  attack tools not blocked - server.js:92");
}

if (ZTA_ON) {
  app.use(threatIntelMiddleware);
} else {
  console.warn("[DEMO] Threat signatures OFF  SQL injection / path traversal allowed - server.js:98");
}

if (ZTA_ON) {
  app.use(governanceMiddleware);
} else {
  console.warn("[DEMO] XSS / injection scanning OFF  malicious payloads pass through - server.js:104");
}

if (ZTA_ON) {
  app.use(auditMiddleware);
} else {
  console.warn("[DEMO] Audit logging OFF  no record of requests - server.js:110");
}

if (ZTA_ON) {
  app.use(identityMiddleware);
} else {
  console.warn("[DEMO] Session token check OFF  any request passes without auth - server.js:116");
}

if (ZTA_ON) {
  app.use(pdpMiddleware);
} else {
  console.warn("[DEMO] PDP/PEP OFF  defaultdeny policy disabled - server.js:122");
}

app.post("/api/auth/session", authLimiter, (req, res) => {
  const session = generateSession();
  console.log(`[ZTAL1] Session issued  prefix: ${session.token.substring(0, 8)}... - server.js:127`);
  res.json({ success: true, token: session.token, expiresAt: session.expiresAt });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: ZTA_ON
      ? "AI Interview Bot — ZTA ACTIVE"
      : "⚠️  AI Interview Bot — ZTA DISABLED (Demo Mode)",
    ztaEnabled: ZTA_ON,
    ztaLayers: ZTA_ON ? {
      L1_identity: "active", L2_device: "active", L3_network: "active",
      L4_workload: "active", L5_data: "active", L6_visibility: "active",
      L7_automation: "active", L8_governance: "active", L9_policy: "active",
      L10_edge: "active", L11_threatIntel: "active", L12_humanFactor: "active",
      L13_hallucination: "active",
    } : {
      L1_identity: "DISABLED", L2_device: "DISABLED", L3_network: "DISABLED",
      L4_workload: "DISABLED", L5_data: "DISABLED", L6_visibility: "DISABLED",
      L7_automation: "DISABLED", L8_governance: "DISABLED", L9_policy: "DISABLED",
      L10_edge: "DISABLED", L11_threatIntel: "DISABLED", L12_humanFactor: "DISABLED",
      L13_hallucination: "DISABLED",
    },
  });
});

app.use("/api/resume",    require("./routes/resume"));
app.use("/api/interview", require("./routes/interview"));
app.use("/api/evaluate",  require("./routes/evaluate"));

// ZTA Status endpoint — called by frontend to show live status
app.get("/api/zta-status", (req, res) => {
  const threat = getThreatLevel(req.ip);
  const fraudDetected = threat.level === "high" || threat.level === "critical";
  const ztaActive = ZTA_ON && !fraudDetected;

  res.json({
    ztaEnabled: ztaActive,
    fraudAlert: fraudDetected,
    threatLevel: threat.level,
    threatDetails: threat.details,
    layers: [
      { id: "L1",  name: "Identity & Session",     status: fraudDetected ? "BLOCKED" : (ZTA_ON ? "active" : "DISABLED"), color: "#6C63FF" },
      { id: "L2",  name: "Device Fingerprinting",  status: fraudDetected ? "BLOCKED" : (ZTA_ON ? "active" : "DISABLED"), color: "#38BDF8" },
      { id: "L3",  name: "Network & CORS",         status: fraudDetected ? "BLOCKED" : (ZTA_ON ? "active" : "DISABLED"), color: "#22C55E" },
      { id: "L4",  name: "Workload & Payload",     status: fraudDetected ? "BLOCKED" : (ZTA_ON ? "active" : "DISABLED"), color: "#F97316" },
      { id: "L5",  name: "Data Protection",        status: fraudDetected ? "BLOCKED" : (ZTA_ON ? "active" : "DISABLED"), color: "#F87171" },
      { id: "L6",  name: "Audit Logging",          status: fraudDetected ? "BLOCKED" : (ZTA_ON ? "active" : "DISABLED"), color: "#A78BFA" },
      { id: "L7",  name: "SOAR Auto-Block",        status: fraudDetected ? "BLOCKED" : (ZTA_ON ? "active" : "DISABLED"), color: "#34D399" },
      { id: "L8",  name: "Governance & XSS",       status: fraudDetected ? "BLOCKED" : (ZTA_ON ? "active" : "DISABLED"), color: "#FB923C" },
      { id: "L9",  name: "Policy Decision",        status: fraudDetected ? "BLOCKED" : (ZTA_ON ? "active" : "DISABLED"), color: "#60A5FA" },
      { id: "L10", name: "Edge & HSTS",            status: fraudDetected ? "BLOCKED" : (ZTA_ON ? "active" : "DISABLED"), color: "#818CF8" },
      { id: "L11", name: "Threat Intelligence",    status: fraudDetected ? "BLOCKED" : (ZTA_ON ? "active" : "DISABLED"), color: "#4ADE80" },
      { id: "L12", name: "Bias Filter",            status: fraudDetected ? "BLOCKED" : (ZTA_ON ? "active" : "DISABLED"), color: "#F472B6" },
      { id: "L13", name: "Hallucination & Fact Checker", status: fraudDetected ? "BLOCKED" : (ZTA_ON ? "active" : "DISABLED"), color: "#EAB308" },
    ],
  });
});

app.use((req, res) => res.status(404).json({ error: "Route not found." }));
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message} - server.js:158`);
  if (err.message?.includes("ZTA-L3")) return res.status(403).json({ error: err.message });
  if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "File too large." });
  if (err.message === "Only PDF files allowed") return res.status(415).json({ error: "Only PDF files accepted." });
  res.status(500).json({ error: ZTA_ON ? "Something went wrong." : err.message });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`URL    : http://localhost:${PORT} - server.js:167`);
  console.log(`Health : http://localhost:${PORT}/api/health - server.js:168`);
  console.log("══════════════════════════════════════════ - server.js:169");
});
