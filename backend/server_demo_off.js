require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const app       = express();

// ⚠️  ZTA DISABLED — DEMO MODE — ALL LAYERS OFF
console.log("⚠️  WARNING: ZTA DISABLED — Running in vulnerable demo mode");

app.use(cors({ origin: "*" })); // Allow ALL origins — no microsegmentation
app.use(express.json({ limit: "100mb" })); // No size limit
app.use(express.urlencoded({ extended: true }));

// No identity check, no device check, no rate limit,
// no audit log, no SOAR, no governance, no threat intel

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK — ZTA DISABLED",
    warning: "⚠️  All 12 ZTA layers are OFF — vulnerable mode",
    ztaLayers: "INACTIVE",
  });
});

app.use("/api/resume",    require("./routes/resume"));
app.use("/api/interview", require("./routes/interview"));
app.use("/api/evaluate",  require("./routes/evaluate"));

app.use((req, res) => res.status(404).json({ error: "Route not found." }));
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message }); // exposes error details — insecure
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log("══════════════════════════════════════════");
  console.log("  ⚠️  ZTA DISABLED — DEMO VULNERABLE MODE");
  console.log(`  URL: http://localhost:${PORT}`);
  console.log("  NO auth · NO rate limit · NO audit log");
  console.log("══════════════════════════════════════════");
});
