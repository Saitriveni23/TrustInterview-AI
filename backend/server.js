require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const multer = require("multer");
const db = require("./config/database");
const { redis, connectRedis } = require("./config/redis");
const { requestContext } = require("./middleware/request-context");
const { distributedRateLimit } = require("./middleware/distributed-rate-limit");
const { requireAuth, requireRole } = require("./middleware/auth");

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000").split(",").map((value) => value.trim());

app.disable("x-powered-by");
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 1));
app.use(requestContext);
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: process.env.NODE_ENV === "production" ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const error = new Error("Origin is not permitted.");
    error.status = 403;
    error.code = "CORS_REJECTED";
    callback(error);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Request-ID", "Idempotency-Key"],
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

app.get("/api/health/live", (_req, res) => res.json({ status: "ok", instance: process.env.INSTANCE_ID || process.pid }));
app.get("/api/health/ready", async (_req, res) => {
  try {
    await Promise.all([db.query("SELECT 1"), redis.ping()]);
    res.json({ status: "ready", instance: process.env.INSTANCE_ID || process.pid });
  } catch (_) {
    res.status(503).json({ status: "not_ready" });
  }
});
app.get("/api/health", (_req, res) => res.json({ status: "OK", architecture: "firebase-postgres-redis" }));

app.use(distributedRateLimit({ windowSeconds: 60, max: Number(process.env.RATE_LIMIT_PER_MINUTE || 300) }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/targets", require("./routes/targets"));
app.use("/api/resumes", require("./routes/resumes"));
app.use("/api/mock-sessions", require("./routes/mock-sessions"));
app.use("/api/recruiter", require("./routes/recruiter"));

app.use("/api/interview", requireAuth, requireRole("candidate"), require("./routes/interview"));
app.use("/api/evaluate", requireAuth, requireRole("candidate"), require("./routes/evaluate"));

app.get("/api/zta-status", requireAuth, (req, res) => res.json({
  ztaEnabled: true,
  fraudAlert: false,
  threatLevel: "low",
  identity: { verified: true, role: req.auth.role },
  layers: [
    { id: "L1", name: "Firebase Identity", status: "active", color: "#6C63FF" },
    { id: "L3", name: "Nginx Edge & Shared Rate Limit", status: "active", color: "#22C55E" },
    { id: "L5", name: "Encrypted Ephemeral Resume Data", status: "active", color: "#F87171" },
    { id: "L6", name: "Request-correlated Audit Logs", status: "active", color: "#A78BFA" },
    { id: "L9", name: "Server-side Role Policy", status: "active", color: "#60A5FA" },
    { id: "L13", name: "Deterministic ATS & Grounded Questions", status: "active", color: "#EAB308" },
  ],
}));

app.use((req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found.", requestId: req.id } }));
app.use((error, req, res, _next) => {
  console.error(JSON.stringify({ level: "error", event: "request_error", requestId: req.id, code: error.code, message: error.message }));
  const isUploadLimit = error instanceof multer.MulterError;
  const status = isUploadLimit ? (error.code === "LIMIT_FILE_SIZE" ? 413 : 400) : (error.status || 500);
  const code = isUploadLimit ? error.code : (error.code || "INTERNAL_ERROR");
  const message = status >= 500 ? "The request could not be completed." : error.message;
  res.status(status).json({ error: { code, message, requestId: req.id } });
});

const port = Number(process.env.PORT || 5001);
let server;

async function start() {
  await connectRedis();
  await db.query("SELECT 1");
  server = app.listen(port, () => console.log(JSON.stringify({ level: "info", event: "server_started", port, instance: process.env.INSTANCE_ID || process.pid })));
}

async function shutdown(signal) {
  console.log(JSON.stringify({ level: "info", event: "shutdown", signal }));
  if (server) await new Promise((resolve) => server.close(resolve));
  await Promise.allSettled([redis.quit(), db.pool.end()]);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

if (require.main === module) start().catch((error) => { console.error(error); process.exit(1); });

module.exports = { app, start };
