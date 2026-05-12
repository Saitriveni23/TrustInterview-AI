// ============================================================
// backend/server.js
// ============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();

// ─────────────────────────────────────────────
// ZERO TRUST LAYER 1 — Security Headers (Helmet)
// Helmet automatically sets headers like:
// X-Frame-Options, X-XSS-Protection, etc.
// ─────────────────────────────────────────────
app.use(helmet());

// ─────────────────────────────────────────────
// ZERO TRUST LAYER 2 — CORS
// Only your frontend (localhost:3000) can talk
// to this backend. Block all other origins.
// ─────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─────────────────────────────────────────────
// ZERO TRUST LAYER 3 — Rate Limiting
// Max 100 requests per 15 minutes per IP.
// Blocks bots and brute-force attacks.
// ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: "Too many requests from this IP. Please wait 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ─────────────────────────────────────────────
// ZERO TRUST LAYER 4 — Input Size Limit
// Reject any request body larger than 10MB.
// Prevents memory overflow attacks.
// ─────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─────────────────────────────────────────────
// ZERO TRUST LAYER 5 — Request Logger
// Logs every incoming request with timestamp.
// In production you would send this to a
// logging service like Datadog or CloudWatch.
// ─────────────────────────────────────────────
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.path}  IP: ${req.ip} - server.js:67`);
  next();
});

// ─────────────────────────────────────────────
// ROUTES
// Each route file handles one part of the app.
// ─────────────────────────────────────────────

// Health check — open a browser and go to
// http://localhost:5000/api/health to test
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "AI Interview Bot backend is running",
    timestamp: new Date().toISOString(),
    layers: "12 Zero Trust layers active",
  });
});

// Resume upload + parse route
// Handles: POST /api/resume/upload
app.use("/api/resume", require("./routes/resume"));

// Interview questions route
// Handles: POST /api/interview/questions
app.use("/api/interview", require("./routes/interview"));

// AI evaluation route
// Handles: POST /api/evaluate/answer
app.use("/api/evaluate", require("./routes/evaluate"));

// ─────────────────────────────────────────────
// ZERO TRUST LAYER 6 — 404 Handler
// Any unknown route returns a clean 404.
// Never expose stack traces to the client.
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─────────────────────────────────────────────
// ZERO TRUST LAYER 7 — Global Error Handler
// Catches any error thrown inside a route.
// Hides internal details from the response.
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message} - server.js:114`);
  res.status(500).json({
    error: "Something went wrong on the server. Please try again.",
  });
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("───────────────────────────────────── - server.js:125");
  console.log(`AI Interview Bot  Backend Running - server.js:126`);
  console.log(`URL : http://localhost:${PORT} - server.js:127`);
  console.log(`Health: http://localhost:${PORT}/api/health - server.js:128`);
  console.log("───────────────────────────────────── - server.js:129");
});