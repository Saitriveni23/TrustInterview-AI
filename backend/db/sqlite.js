// ============================================================
// db/sqlite.js
// SQLite database wrapper for TrustInterview AI.
// Handles persistence of assessment history and blocked IPs.
// ============================================================

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_DIR = path.join(__dirname, "../data");
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(path.join(DB_DIR, "trustinterview.db"));

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS blocked_ips (
    ip TEXT PRIMARY KEY,
    reason TEXT,
    blocked_until INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS assessment_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    name TEXT,
    company TEXT,
    job_role TEXT,
    score REAL,
    grade TEXT,
    interview_type TEXT,
    date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = {
  // SOAR IP Blocking persistence
  saveBlockedIP(ip, reason, blockedUntil) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO blocked_ips (ip, reason, blocked_until)
      VALUES (?, ?, ?)
    `);
    return stmt.run(ip, reason, blockedUntil);
  },

  removeBlockedIP(ip) {
    const stmt = db.prepare(`DELETE FROM blocked_ips WHERE ip = ?`);
    return stmt.run(ip);
  },

  getAllBlockedIPs() {
    const stmt = db.prepare(`SELECT * FROM blocked_ips`);
    return stmt.all();
  },

  // Assessment score history
  saveAssessment(email, name, company, jobRole, score, grade, interviewType) {
    const stmt = db.prepare(`
      INSERT INTO assessment_history (email, name, company, job_role, score, grade, interview_type, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    return stmt.run(email, name, company, jobRole, score, grade, interviewType, dateStr);
  },

  getAssessmentHistory(email) {
    const stmt = db.prepare(`
      SELECT * FROM assessment_history
      WHERE email = ?
      ORDER BY id DESC
    `);
    return stmt.all(email);
  }
};
