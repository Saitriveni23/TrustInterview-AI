const fs   = require("fs");
const path = require("path");
const crypto = require("crypto");

const LEDGER_PATH = path.join(__dirname, "../question-ledger.json");

function loadLedger() {
  if (!fs.existsSync(LEDGER_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(LEDGER_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveLedger(ledger) {
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), "utf-8");
}

function hashQuestion(questionText) {
  return crypto
    .createHash("sha256")
    .update(questionText.trim().toLowerCase())
    .digest("hex")
    .substring(0, 16);
}

/**
 * Returns the list of question texts a candidate has already seen.
 */
function getSeenQuestions(email) {
  const ledger = loadLedger();
  const key = email.toLowerCase().trim();
  return ledger[key]?.questions || [];
}

/**
 * Marks a batch of questions as seen by the candidate.
 */
function markQuestionsSeen(email, questions) {
  const ledger = loadLedger();
  const key    = email.toLowerCase().trim();

  if (!ledger[key]) {
    ledger[key] = { questions: [], hashes: [], totalSessions: 0 };
  }

  ledger[key].totalSessions = (ledger[key].totalSessions || 0) + 1;
  ledger[key].lastSession   = new Date().toISOString();

  questions.forEach(q => {
    const text = q.question;
    const hash = hashQuestion(text);
    if (!ledger[key].hashes.includes(hash)) {
      ledger[key].hashes.push(hash);
      ledger[key].questions.push(text);
    }
  });

  // Keep only last 100 to prevent unbounded growth
  if (ledger[key].hashes.length > 100) {
    const excess = ledger[key].hashes.length - 100;
    ledger[key].hashes    = ledger[key].hashes.slice(excess);
    ledger[key].questions = ledger[key].questions.slice(excess);
  }

  saveLedger(ledger);
}

/**
 * Returns leaderboard data sorted by best score.
 */
function getLeaderboard() {
  const ledger = loadLedger();
  return Object.entries(ledger)
    .filter(([, v]) => v.totalSessions > 0)
    .map(([email, v]) => ({
      email,
      name:          v.name || email.split("@")[0],
      totalSessions: v.totalSessions || 0,
      bestScore:     v.bestScore || 0,
      avgScore:      v.avgScore  || 0,
      lastSession:   v.lastSession || "",
    }))
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, 50);
}

/**
 * Records a session score for leaderboard tracking.
 */
function recordScore(email, name, score) {
  const ledger = loadLedger();
  const key    = email.toLowerCase().trim();
  if (!ledger[key]) {
    ledger[key] = { questions: [], hashes: [], totalSessions: 0 };
  }
  ledger[key].name = name || email.split("@")[0];
  const prev       = ledger[key].avgScore || 0;
  const sessions   = ledger[key].totalSessions || 1;
  ledger[key].avgScore  = parseFloat(((prev * (sessions - 1) + score) / sessions).toFixed(2));
  ledger[key].bestScore = Math.max(ledger[key].bestScore || 0, score);
  saveLedger(ledger);
}

module.exports = { getSeenQuestions, markQuestionsSeen, getLeaderboard, recordScore };
